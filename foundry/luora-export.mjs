#!/usr/bin/env node
// Luora exporter: runs `forge test`, decodes the call traces with the project's own ABIs,
// and writes luora-data.json for the Luora Workbench to visualise.
//
//   node luora-export.mjs                 # all tests
//   node luora-export.mjs --mt test_deposit
//
// No dependencies; needs `forge` and `cast` on PATH.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const extra = process.argv.slice(2);
const sh = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

// ---------- artifacts: selectors, events, bytecode → contract ----------
sh('forge', ['build']);
const OUT = join(ROOT, 'out'), artifacts = [];
for (const dir of readdirSync(OUT)) {
  if (dir === 'build-info' || !dir.endsWith('.sol')) continue;
  for (const f of readdirSync(join(OUT, dir))) {
    const a = JSON.parse(readFileSync(join(OUT, dir, f), 'utf8'));
    const target = Object.entries(a.metadata?.settings?.compilationTarget || {})[0];
    if (!target) continue;
    artifacts.push({ name: target[1], file: target[0], abi: a.abi, bytecode: (a.bytecode?.object || '').replace(/^0x/, '') });
  }
}
const sig = it => `${it.name}(${it.inputs.map(typeOf).join(',')})`;
function typeOf(p){ return p.type.startsWith('tuple') ? `(${p.components.map(typeOf).join(',')})${p.type.slice(5)}` : p.type; }
const selectors = {}, events = {}, eventSigs = new Set();
for (const a of artifacts) for (const it of a.abi) {
  if (it.type === 'function') selectors[a.name + ':' + sig(it)] = { contract: a.name, it };
  if (it.type === 'event') eventSigs.add(JSON.stringify({ s: sig(it), it }));
}
// keccak via `cast` (Node's crypto has no keccak256)
const bySel = {};
const allSigs = [...new Set(Object.values(selectors).map(x => sig(x.it)))];
for (const s of allSigs) {
  const h = sh('cast', ['sig', s]).trim().slice(2);
  bySel[h] = bySel[h] || [];
  for (const [k, v] of Object.entries(selectors)) if (sig(v.it) === s) bySel[h].push(v);
}
for (const e of eventSigs) { const { s, it } = JSON.parse(e); events[sh('cast', ['keccak', s]).trim()] = it; }

// ---------- minimal ABI decoding (static words; dynamic types summarised) ----------
const word = (hex, i) => hex.slice(i * 64, i * 64 + 64);
function fmtWord(type, w){
  if (!w) return '?';
  if (type === 'address') return '0x' + w.slice(24);
  if (type === 'bool') return BigInt('0x' + w) ? 'true' : 'false';
  if (/^uint/.test(type)) return BigInt('0x' + w).toString();
  if (/^int/.test(type)) { let v = BigInt('0x' + w); if (v >> 255n) v -= 1n << 256n; return v.toString(); }
  if (/^bytes\d+$/.test(type)) return '0x' + w;
  return '…';
}
function decodeWords(types, hex){ return types.map((t, i) => fmtWord(t, word(hex, i))); }

// ---------- run tests ----------
const raw = sh('forge', ['test', '--json', '-vvvv', ...extra]);
const results = JSON.parse(raw.slice(raw.indexOf('{')));
const CHEAT = '0x7109709ecfa91a80626ff3989d68f67f5b1dd12d';
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
    const prettyArg = (type, v) => type === 'address' ? label(v) : v;
    const exec = (t.traces || []).find(([k]) => k === 'Execution');
    const frames = [], transfers = [];
    if (exec) {
      const nodes = exec[1].arena;
      const walk = (idx, depth) => {
        const n = nodes[idx], tr = n.trace, addr = tr.address.toLowerCase();
        const data = tr.data.replace(/^0x/, ''), sel = data.slice(0, 8), art = contractAt[addr];
        const cands = bySel[sel] || [];
        const hit = cands.find(c => art && c.contract === art.name) || cands[0];
        const fr = { d: depth, kind: tr.kind, to: label(addr), contract: art?.name || (addr === CHEAT ? 'vm' : null), file: art?.file?.startsWith('lib/') ? null : art?.file || null,
          fn: hit ? hit.it.name : (data ? '0x' + sel : 'fallback'), args: '', ret: '', ok: tr.success, status: tr.status, gas: tr.gas_used, events: [] };
        if (hit) {
          const ins = hit.it.inputs, outs = hit.it.outputs || [];
          fr.args = ins.map((p, i) => `${p.name || 'arg' + i}=${prettyArg(p.type, decodeWords([p.type], data.slice(8 + i * 64))[0])}`).join(', ');
          const out = tr.output.replace(/^0x/, '');
          if (tr.success && outs.length && out) fr.ret = outs.map((p, i) => prettyArg(p.type, fmtWord(p.type, word(out, i)))).join(', ');
        }
        if (!tr.success) { const out = tr.output.replace(/^0x/, ''); // Error(string)
          fr.ret = out.startsWith('08c379a0') ? Buffer.from(out.slice(8 + 128, 8 + 128 + 2 * parseInt(out.slice(8 + 64, 8 + 128), 16)), 'hex').toString() : 'revert'; }
        frames.push(fr);
        // children and logs, in execution order
        for (const o of n.ordering) {
          if ('Call' in o) walk(n.children[o.Call], depth + 1);
          else { const lg = n.logs[o.Log].raw_log, ev = events[lg.topics[0]];
            const e = { name: ev ? ev.name : 'Log', args: {} };
            if (ev) { let ti = 1, di = 0; const dhex = lg.data.replace(/^0x/, '');
              for (const p of ev.inputs) e.args[p.name] = prettyArg(p.type, p.indexed ? fmtWord(p.type, lg.topics[ti++].slice(2)) : fmtWord(p.type, word(dhex, di++))); }
            frames.push({ d: depth + 1, kind: 'EVENT', to: label(addr), contract: art?.name, file: null, fn: e.name, args: Object.entries(e.args).map(([k, v]) => `${k}=${v}`).join(', '), ret: '', ok: true, gas: null });
            if (e.name === 'Transfer') transfers.push({ token: label(addr), from: e.args.from, to: e.args.to, value: e.args.value }); }
        }
      };
      walk(0, 0);
    }
    tests.push({ suite: suiteId.split(':').pop(), file: suiteId.split(':')[0], name: testName, status: t.status, kind: t.kind, reason: t.reason, frames, transfers });
  }
}

// ---------- sources in scope (src/ + test/) ----------
const sources = {};
for (const a of artifacts) if (!a.file.startsWith('lib/') && existsSync(join(ROOT, a.file))) sources[a.file] = readFileSync(join(ROOT, a.file), 'utf8');

const forgeVersion = sh('forge', ['--version']).split('\n')[0];
writeFileSync(join(ROOT, 'luora-data.json'), JSON.stringify({ generatedAt: new Date().toISOString(), forgeVersion, command: ['forge', 'test', '--json', '-vvvv', ...extra].join(' '), tests, sources }, null, 1));
console.log(`luora: ${tests.length} tests, ${tests.reduce((n, t) => n + t.frames.length, 0)} frames → luora-data.json`);
