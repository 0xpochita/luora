#!/usr/bin/env node
// Luora exporter: runs `forge test`, decodes the call traces with the project's own ABIs,
// attributes every frame to the exact source lines it executed (via `forge test --debug --dump`
// step data + solc source maps), and writes luora-data.json for the Luora Workbench. The `atlas`
// section (contract map for /atlas) comes from luora-atlas.mjs; set LUORA_ATLAS=<Contract> to pick.
// Slither / Aderyn JSON reports are merged into its findings by luora-findings.mjs.
//
//   node luora-export.mjs                 # all tests
//   node luora-export.mjs --mt test_deposit
//   node luora-export.mjs --slither=out/slither.json --aderyn=report.json   # default: reports/*.json
//
// Coverage (atlas.coverage) comes from luora-coverage.mjs. No dependencies; needs `forge` on PATH.
import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildAtlas } from './luora-atlas.mjs';
import { loadReports, mergeFindings, reportFiles } from './luora-findings.mjs';
import { buildCoverage } from './luora-coverage.mjs';
import { decodeParams, fmtWord, innermost, keccak256, lineIndex, parseSourceMap, pcToIc, revertReason, sig } from './luora-lib.mjs';

const ROOT = process.cwd();
const extra = process.argv.slice(2).filter(a => !/^--(slither|aderyn)=/.test(a));
const sh = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

// ---------- artifacts: selectors, events, bytecode → contract, source maps ----------
sh('forge', ['build']);
const OUT = join(ROOT, 'out'), artifacts = [];
const builds = existsSync(join(OUT, 'build-info')) ? readdirSync(join(OUT, 'build-info')).map(f => JSON.parse(readFileSync(join(OUT, 'build-info', f), 'utf8')).source_id_to_path || {}) : [];
for (const dir of readdirSync(OUT)) {
  if (dir === 'build-info' || !dir.endsWith('.sol')) continue;
  for (const f of readdirSync(join(OUT, dir))) {
    const a = JSON.parse(readFileSync(join(OUT, dir, f), 'utf8'));
    const target = Object.entries(a.metadata?.settings?.compilationTarget || {})[0];
    if (!target) continue;
    // source ids are per compilation: pick the build that maps this artifact's own id to its file
    const ids = builds.find(b => b[a.id] === target[0]) || builds[0] || {};
    artifacts.push({ name: target[1], file: target[0], abi: a.abi, bytecode: (a.bytecode?.object || '').replace(/^0x/, ''), ids,
      maps: { init: [a.bytecode?.object, a.bytecode?.sourceMap], run: [a.deployedBytecode?.object, a.deployedBytecode?.sourceMap] } });
  }
}

const bySel = {}, events = {};
for (const a of artifacts) for (const it of a.abi) {
  if (it.type === 'function') (bySel[keccak256(sig(it)).slice(2, 10)] ||= []).push({ contract: a.name, it });
  if (it.type === 'event') events[keccak256(sig(it))] = it;
}

// ---------- sources in scope (src/ + test/) ----------
const sources = {}, lineOf = {};
for (const a of artifacts) if (!a.file.startsWith('lib/') && existsSync(join(ROOT, a.file)) && !sources[a.file]) {
  sources[a.file] = readFileSync(join(ROOT, a.file), 'utf8');
  lineOf[a.file] = lineIndex(sources[a.file]);
}

// ---------- run tests ----------
const raw = sh('forge', ['test', '--json', '-vvvv', ...extra]);
const results = JSON.parse(raw.slice(raw.indexOf('{')));
const CHEAT = '0x7109709ecfa91a80626ff3989d68f67f5b1dd12d';

// ---------- step data: one `forge test --debug --dump` per unit test, in parallel ----------
const TMP = mkdtempSync(join(tmpdir(), 'luora-'));
const passthrough = extra.filter((x, i) => !/^--(mt|mc|mp|match-test|match-contract|match-path)(=|$)/.test(x) && !/^--(mt|mc|mp|match-test|match-contract|match-path)$/.test(extra[i - 1] || ''));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const jobs = [], dumps = {};
for (const [suiteId, suite] of Object.entries(results)) for (const [testName, t] of Object.entries(suite.test_results)) {
  if (t.status === 'Skipped' || !(t.kind === 'Unit' || 'Unit' in Object(t.kind))) continue; // fuzz/invariant replays differ from the traced run
  const [file, contract] = suiteId.split(':'), dump = join(TMP, `${jobs.length}.json`);
  jobs.push({ key: suiteId + '#' + testName, dump, args: ['test', '--debug', '--mp', file, '--mc', `^${esc(contract)}$`, '--mt', `^${esc(testName)}$`, '--dump', dump, ...passthrough] });
}
await Promise.all(Array.from({ length: Math.min(availableParallelism(), jobs.length) }, async () => {
  // failing tests exit non-zero but still dump, so errors are ignored and the file decides
  for (let j; (j = jobs.shift());) await new Promise(res => execFile('forge', j.args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }, () => res()))
    .then(() => { if (existsSync(j.dump)) dumps[j.key] = j.dump; });
}));

const CALL_OPS = new Set([0xf0, 0xf1, 0xf2, 0xf4, 0xf5, 0xfa]), STORAGE_OPS = { 0x54: 'SLOAD', 0x55: 'SSTORE' };
/** Re-join the flattened debug arena (a call's steps are split around each sub-call) into one entry per call. */
function debugCalls(arena) {
  const calls = [], stack = [];
  for (const chunk of arena) {
    const top = stack.at(-1);
    let c = top;
    if (!top || chunk.address.toLowerCase() !== top.address || chunk.steps[0]?.pc !== top.resume) {
      c = { address: chunk.address.toLowerCase(), calldata: chunk.calldata.replace(/^0x/, ''), steps: [] };
      calls.push(c);
      stack.push(c);
    }
    for (const s of chunk.steps) c.steps.push(s);
    const last = chunk.steps.at(-1);
    if (last && CALL_OPS.has(last.op)) c.resume = last.pc + 1;
    else stack.pop();
  }
  return calls;
}

const mapCache = new Map();
function sourceMapFor(art, creation) {
  const k = art.name + art.file + creation;
  if (!mapCache.has(k)) {
    const [code, sm] = art.maps[creation ? 'init' : 'run'];
    mapCache.set(k, code && sm ? { ic: pcToIc(code), sm: parseSourceMap(sm) } : null);
  }
  return mapCache.get(k);
}

/** Steps of one call → executed lines, storage ops, and the source line of each sub-call / log op. */
function attribute(steps, art, creation) {
  const m = art && sourceMapFor(art, creation), at = s => {
    const e = m && m.sm[m.ic[s.pc]], file = e && art.ids[e[2]];
    return file && sources[file] ? { file, s: e[0], l: e[1], line: lineOf[file](e[0]) } : null;
  };
  const ranges = new Map(), storage = new Map(), callSites = [], logSites = [];
  for (const s of steps) {
    const loc = at(s);
    if (loc) ranges.set(`${loc.file}:${loc.s}:${loc.l}`, [loc.file, loc.s, loc.l]);
    if (CALL_OPS.has(s.op)) callSites.push(loc && { file: loc.file, line: loc.line });
    else if (s.op >= 0xa0 && s.op <= 0xa4) logSites.push(loc && { file: loc.file, line: loc.line });
    else if (STORAGE_OPS[s.op] && loc) storage.set(`${s.op}:${loc.file}:${loc.line}`, { op: STORAGE_OPS[s.op], file: loc.file, line: loc.line });
  }
  const lines = {};
  for (const [file, s] of innermost([...ranges.values()])) (lines[file] ||= new Set()).add(lineOf[file](s));
  return { lines: Object.fromEntries(Object.entries(lines).map(([f, set]) => [f, [...set].sort((a, b) => a - b)])), storage: [...storage.values()], callSites, logSites };
}

// ---------- decode ----------
const tests = [];
for (const [suiteId, suite] of Object.entries(results)) {
  for (const [testName, t] of Object.entries(suite.test_results)) {
    const names = { [CHEAT]: 'vm', ...Object.fromEntries(Object.entries(t.labeled_addresses || {}).map(([k, v]) => [k.toLowerCase(), v])) };
    const contractAt = {};
    // contracts created during deployment / setUp → name by matching init code
    for (const [, arena] of t.traces || []) for (const n of arena.arena) {
      const tr = n.trace;
      if (!tr.kind.startsWith('CREATE')) continue;
      const code = tr.data.replace(/^0x/, ''), a = artifacts.filter(x => x.bytecode && code.startsWith(x.bytecode)).sort((x, y) => y.bytecode.length - x.bytecode.length)[0];
      if (a) { contractAt[tr.address.toLowerCase()] = a; names[tr.address.toLowerCase()] ||= a.name; }
    }
    const label = addr => names[addr.toLowerCase()] || addr.slice(0, 8) + '…';
    const pretty = (type, v) => (type === 'address' ? label(v) : v);
    const key = suiteId + '#' + testName;
    const dbg = dumps[key] ? debugCalls(JSON.parse(readFileSync(dumps[key], 'utf8')).debug_arena) : [];
    let cursor = 0;
    const exec = (t.traces || []).find(([k]) => k === 'Execution');
    const frames = [], transfers = [];
    if (exec) {
      const nodes = exec[1].arena;
      const walk = (idx, depth, callSite) => {
        const n = nodes[idx], tr = n.trace, addr = tr.address.toLowerCase();
        const data = tr.data.replace(/^0x/, ''), sel = data.slice(0, 8), art = contractAt[addr];
        const cands = bySel[sel] || [];
        const hit = cands.find(c => art && c.contract === art.name) || cands[0];
        const fr = { d: depth, kind: tr.kind, to: label(addr), contract: art?.name || (addr === CHEAT ? 'vm' : null), file: art?.file?.startsWith('lib/') ? null : art?.file || null,
          fn: hit ? hit.it.name : (data ? '0x' + sel : 'fallback'), args: '', ret: '', ok: tr.success, status: tr.status, gas: tr.gas_used, events: [] };
        if (hit) {
          const ins = hit.it.inputs, outs = hit.it.outputs || [];
          fr.args = decodeParams(ins, data.slice(8), pretty).map((v, i) => `${ins[i].name || 'arg' + i}=${v}`).join(', ');
          const out = tr.output.replace(/^0x/, '');
          if (tr.success && outs.length && out) fr.ret = decodeParams(outs, out, pretty).join(', ');
        }
        if (!tr.success) fr.ret = revertReason(tr.output);
        if (callSite) fr.callSite = callSite;
        // step data: debug calls only exist for frames that ran bytecode (not cheatcodes / precompiles)
        let sites = { callSites: [], logSites: [] };
        const c = dbg[cursor];
        if (c && c.calldata === data && c.address === addr) {
          cursor++;
          const a = attribute(c.steps, art, tr.kind.startsWith('CREATE'));
          if (Object.keys(a.lines).length) fr.lines = a.lines;
          if (a.storage.length) fr.storage = a.storage;
          sites = a;
        }
        const nCalls = n.ordering.filter(o => 'Call' in o).length;
        const callSites = sites.callSites.length === nCalls ? sites.callSites : [], logSites = sites.logSites.length === n.logs.length ? sites.logSites : [];
        frames.push(fr);
        // children and logs, in execution order
        let ci = 0;
        for (const o of n.ordering) {
          if ('Call' in o) walk(n.children[o.Call], depth + 1, callSites[ci++] || null);
          else { const lg = n.logs[o.Log].raw_log, ev = events[lg.topics[0]];
            const e = { name: ev ? ev.name : 'Log', args: {} };
            if (ev) {
              let ti = 1;
              const plain = ev.inputs.filter(p => !p.indexed), vals = decodeParams(plain, lg.data, pretty);
              for (const p of ev.inputs) e.args[p.name] = p.indexed
                ? (/^(string|bytes|tuple)$|\]$/.test(p.type) ? lg.topics[ti++] : pretty(p.type, fmtWord(p.type, lg.topics[ti++].slice(2)))) // dynamic indexed = hash only
                : vals[plain.indexOf(p)];
            }
            const ef = { d: depth + 1, kind: 'EVENT', to: label(addr), contract: art?.name, file: null, fn: e.name, args: Object.entries(e.args).map(([k, v]) => `${k}=${v}`).join(', '), ret: '', ok: true, gas: null };
            if (logSites[o.Log]) ef.callSite = logSites[o.Log];
            frames.push(ef);
            if (e.name === 'Transfer') transfers.push({ token: label(addr), from: e.args.from, to: e.args.to, value: e.args.value }); }
        }
      };
      walk(0, 0, null);
    }
    tests.push({ suite: suiteId.split(':').pop(), file: suiteId.split(':')[0], name: testName, status: t.status, kind: t.kind, reason: t.reason, frames, transfers });
  }
}
rmSync(TMP, { recursive: true, force: true });

let atlas = null;
try { atlas = buildAtlas({ root: ROOT }); } catch (e) { console.warn(`luora: atlas skipped — ${e.message}`); }
if (atlas) {
  const files = reportFiles(ROOT, process.argv.slice(2));
  mergeFindings(atlas, loadReports(files));
  console.log(`luora: findings ${atlas.pieces.filter(p => p.sys === 'vulns').length} (${Object.entries(files).filter(([, f]) => f).map(([t]) => t).join(' + ') || 'atlas checks only'})`);
}
// coverage runs the whole suite (match filters dropped) so untested code is not an artefact of --mt
if (atlas) try { atlas.coverage = buildCoverage({ root: ROOT, atlas, args: passthrough }); } catch (e) { console.warn(`luora: coverage skipped — ${e.message.split('\n')[0]}`); }

const forgeVersion = sh('forge', ['--version']).split('\n')[0];
writeFileSync(join(ROOT, 'luora-data.json'), JSON.stringify({ generatedAt: new Date().toISOString(), forgeVersion, command: ['forge', 'test', '--json', '-vvvv', ...extra].join(' '), tests, sources, atlas }, null, 1));
const traced = tests.reduce((n, t) => n + t.frames.filter(f => f.lines).length, 0);
console.log(`luora: ${tests.length} tests, ${tests.reduce((n, t) => n + t.frames.length, 0)} frames (${traced} with source lines) → luora-data.json`);
