#!/usr/bin/env node
// Luora MCP server: lets the auditor's own AI client (Claude Code, Claude Desktop, Cursor) read a
// Luora run and propose Lab scenarios. Luora hosts no AI; this speaks MCP (JSON-RPC 2.0, one JSON
// message per line) over stdio and only reads local files. Every tool is read-only except
// propose_scenario, which validates a scenario against the Lab's model and appends it to
// luora-scenarios.json next to luora-data.json, where /atlas → Lab → New… lists it.
// Scenarios test INTENDED behaviour (actor / const / call / expect / assert / snapshot); a failing
// assertion is a finding to look at, never an attack.
//
//   node luora-mcp.mjs                          # reads ./luora-data.json
//   node luora-mcp.mjs --data=path/luora-data.json
//
// No dependencies. The scenario checks mirror apps/frontend/src/features/atlas/utils/lab-scenario.ts
// (scenarioErrors); lab.check.ts runs both on the same scenarios so they cannot drift.
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

export const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const VERSION = '0.1.0';

// ---------- the Lab's model (port of lab-graph.ts / lab-scenario.ts) ----------

const word = s => new RegExp(`(?<![\\w$])${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w$])`);
const uniq = xs => [...new Set(xs)];
export const fnName = p => p.name.replace(/\(.*$/, '');
export const slotName = p => (p.name.split('· ').pop() ?? p.name).replace('[]', '').trim();

/** "1,000.5" → 1000500000n (6 decimals); null when it is not a non-negative amount. */
export function parseUsdc(s) {
  const m = typeof s === 'string' && /^(\d+)(?:\.(\d*))?$/.exec(s.replace(/[,_\s]/g, ''));
  if (!m || (m[2]?.length ?? 0) > 6) return null;
  return BigInt(m[1]) * 10n ** 6n + BigInt((m[2] ?? '').padEnd(6, '0'));
}

function paramsOf(decl) {
  return (/\(([^)]*)\)/.exec(decl)?.[1] ?? '')
    .split(',').map(s => s.trim().split(/\s+/)).filter(t => t.length >= 2)
    .map(t => ({ type: t[0], name: t[t.length - 1] }));
}
const portType = sol => (/^u?int\d*$/.test(sol) ? 'amount' : sol === 'bool' ? 'bool' : 'actor');

/** Lookups over the atlas section of luora-data.json, plus what the Lab offers for it. */
export function labModel(atlas) {
  const byId = Object.fromEntries(atlas.pieces.map(p => [p.id, p]));
  const lines = atlas.source.split('\n');
  const lineOf = p => p.line ?? Math.max(0, lines.findIndex(l => l.includes(p.find)));
  const body = p => Array.from({ length: p.n ?? 1 }, (_, i) => lineOf(p) + i);
  const declOf = id => (byId[id] ? lines[lineOf(byId[id])] ?? '' : '');
  const declType = id => /^\s*(\w+)/.exec(declOf(id))?.[1] ?? '';
  const slotOf = name => atlas.pieces.find(p => p.sys === 'storage' && slotName(p) === name);
  const isBoolSlot = id => declType(id) === 'bool';

  function revertsOf(fn) {
    if (!byId[fn]) return [];
    const decl = declOf(fn);
    const scan = (q, via) => body(q).flatMap(i => {
      const l = lines[i] ?? '';
      const req = /require\s*\((.*),\s*"([^"]*)"\s*\)\s*;/.exec(l);
      if (req) return [{ reason: req[2], cond: req[1].trim(), line: i, via }];
      const err = /if\s*\((.*)\)\s*revert\s+(\w+)\s*\(/.exec(l);
      return err ? [{ reason: `${err[2]}()`, cond: `!(${err[1]})`, line: i, via }] : [];
    });
    const mods = atlas.pieces.flatMap(q => {
      const mod = q.sys === 'access' && /^modifier\s+(\w+)/.exec(q.find);
      return mod && word(mod[1]).test(decl) ? scan(q, mod[1]) : [];
    });
    return [...mods, ...scan(byId[fn], null)];
  }
  const pauseRevert = fn => revertsOf(fn).find(r => {
    const s = /^!\s*(\w+)$/.exec(r.cond);
    const p = s && slotOf(s[1]);
    return !!p && isBoolSlot(p.id);
  });
  const assetSlot = () => {
    const tokens = atlas.pieces.filter(p => p.sys === 'storage' && /ERC20/.test(declType(p.id)));
    return (tokens.find(p => slotName(p) === 'asset') ?? tokens[0])?.id ?? null;
  };
  function sharePair() {
    for (const t of atlas.pieces) {
      const k = t.sys === 'storage' && /^total(\w+)$/.exec(slotName(t));
      if (!k) continue;
      const map = atlas.pieces.find(p => p.sys === 'storage' && p.mapping && slotName(p).toLowerCase() === k[1].toLowerCase());
      if (map) return { total: slotName(t), map: slotName(map) };
    }
    return null;
  }

  const roles = ['user', ...uniq(atlas.entry.map(id => byId[id]?.caller).filter(c => c && c !== 'anyone'))];
  const checks = [];
  const pair = sharePair();
  if (pair) checks.push({ check: { type: 'sum' }, label: `${pair.total} == Σ ${pair.map}[actor]` });
  if (pair && assetSlot()) checks.push({ check: { type: 'solvent' }, label: `${slotName(byId[assetSlot()])} balance ≥ ${pair.total}` });
  for (const fn of atlas.entry) {
    const role = byId[fn]?.caller ?? 'anyone';
    if (role !== 'anyone') checks.push({ check: { type: 'only', fn }, label: `only ${role} can call ${fnName(byId[fn])}` });
  }
  for (const fn of atlas.entry)
    if (pauseRevert(fn)) checks.push({ check: { type: 'paused', fn }, label: `paused blocks ${fnName(byId[fn])}` });
  for (const op of ['==', '>=', '<=']) checks.push({ check: { type: 'cmp', op }, label: `a ${op} b` });

  const publicSlots = atlas.pieces.filter(p => p.sys === 'storage' && /\bpublic\b/.test(lines[lineOf(p)] ?? ''));
  const reasons = uniq(atlas.entry.flatMap(fn => revertsOf(fn).map(r => r.reason)));

  /** Ports of an entry's call card (c: outputs are hidden on scenario cards). */
  function callPorts(fn) {
    const touched = k => uniq((atlas.seq[fn] ?? []).filter(([s]) => s === k).map(([, t]) => t));
    return {
      inputs: [
        { id: 'caller', type: 'actor' },
        ...paramsOf(declOf(fn)).map((a, i) => ({ id: `a${i}`, type: portType(a.type) })),
      ],
      outputs: [
        ...paramsOf(/returns\s*(\([^)]*\))/.exec(declOf(fn))?.[1] ?? '').map((a, i) => ({ id: `ret${i}`, type: portType(a.type) })),
        ...touched('w').map(t => ({ id: `w:${t}`, type: 'slot' })),
        ...touched('e').map(t => ({ id: `e:${t}`, type: 'event' })),
        ...uniq(revertsOf(fn).map(r => r.reason)).map(r => ({ id: `r:${r}`, type: 'revert' })),
      ],
    };
  }

  return { atlas, byId, lines, lineOf, revertsOf, roles, checks, publicSlots, reasons, callPorts, isBoolSlot };
}

export const checkKey = c => (c.type === 'cmp' ? `cmp:${c.op}` : c.type === 'only' || c.type === 'paused' ? `${c.type}:${c.fn}` : c.type);

/** Input / output ports of a scenario card (scenarioCard in lab-scenario.ts); null for an invalid node. */
function cardPorts(m, n) {
  switch (n.kind) {
    case 'actor': return { flow: false, inputs: [], outputs: [{ id: 'addr', type: 'actor' }] };
    case 'const': return { flow: false, inputs: [], outputs: [{ id: 'value', type: 'amount' }] };
    case 'call': return { flow: true, ...m.callPorts(n.fn) };
    case 'expect': return { flow: false, inputs: [{ id: 'call', type: 'revert' }], outputs: [{ id: 'held', type: 'bool' }] };
    case 'assert': return {
      flow: true,
      inputs: n.check.type === 'cmp' ? [{ id: 'a', type: 'amount' }, { id: 'b', type: 'amount' }] : [],
      outputs: [{ id: 'ok', type: 'bool' }],
    };
    case 'snapshot': return {
      flow: true,
      inputs: [{ id: 'slot', type: 'slot' }, { id: 'who', type: 'actor' }],
      outputs: [{ id: 'value', type: n.of !== 'balance' && m.isBoolSlot(n.of) ? 'bool' : 'amount' }],
    };
  }
}

const KINDS = {
  actor: ['label', 'role', 'balance'],
  const: ['value'],
  call: ['fn'],
  expect: ['reason'],
  assert: ['check'],
  snapshot: ['of'],
};
const SCENARIO_KEYS = ['id', 'name', 'nodes', 'wires'];
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = v => typeof v === 'string';
const extra = (o, keys) => Object.keys(o).filter(k => !keys.includes(k));

/**
 * Every reason `sc` falls outside the Lab's scenario model ([] = valid). Positions (x, y) are
 * optional here; proposeScenario lays out cards that have none.
 */
export function scenarioErrors(m, sc) {
  if (!isObj(sc)) return ['scenario must be an object { name, nodes, wires }'];
  const errs = [];
  for (const k of extra(sc, SCENARIO_KEYS)) errs.push(`unknown scenario field "${k}" (allowed: ${SCENARIO_KEYS.join(', ')})`);
  if (sc.id !== undefined && !(isStr(sc.id) && /^[\w-]{1,64}$/.test(sc.id))) errs.push('id must match [A-Za-z0-9_-]{1,64}');
  if (!isStr(sc.name) || !/^[^\r\n\u2028\u2029]{1,80}$/.test(sc.name.trim())) errs.push('name must be one line of 1–80 characters');
  if (!Array.isArray(sc.nodes) || !sc.nodes.length) return [...errs, 'nodes must be a non-empty array'];
  if (sc.nodes.length > 60) errs.push('at most 60 nodes');
  if (!Array.isArray(sc.wires)) return [...errs, 'wires must be an array'];

  const ids = new Set();
  const labels = new Set();
  const ok = new Map();
  sc.nodes.forEach((n, i) => {
    const at = `nodes[${i}]`;
    if (!isObj(n)) return errs.push(`${at} must be an object`);
    if (!isStr(n.id) || !/^[A-Za-z_][\w]{0,39}$/.test(n.id)) return errs.push(`${at}.id must be an identifier (letters, digits, _; max 40)`);
    const me = `node "${n.id}"`;
    if (ids.has(n.id)) return errs.push(`${me}: duplicate id`);
    ids.add(n.id);
    if (!Object.hasOwn(KINDS, n.kind)) return errs.push(`${me}: kind must be one of ${Object.keys(KINDS).join(', ')}`);
    const before = errs.length;
    for (const k of extra(n, ['id', 'kind', 'x', 'y', ...KINDS[n.kind]])) errs.push(`${me}: unknown field "${k}" for a ${n.kind} node`);
    for (const k of ['x', 'y'])
      if (n[k] !== undefined && !Number.isFinite(n[k])) errs.push(`${me}: ${k} must be a number`);
    if (n.kind === 'actor') {
      if (!isStr(n.label) || !/^[A-Za-z_]\w{0,31}$/.test(n.label)) errs.push(`${me}: label must be an identifier like alice (letters, digits, _)`);
      else if (labels.has(n.label)) errs.push(`${me}: label "${n.label}" is used by another actor`);
      else labels.add(n.label);
      if (!m.roles.includes(n.role)) errs.push(`${me}: role must be one of ${m.roles.join(', ')}`);
      if (parseUsdc(n.balance) === null) errs.push(`${me}: balance must be a USDC amount like "1,000" or "0.5"`);
    }
    if (n.kind === 'const' && parseUsdc(n.value) === null) errs.push(`${me}: value must be a USDC amount like "1,000" or "0.5"`);
    if (n.kind === 'call' && !(isStr(n.fn) && m.atlas.entry.includes(n.fn)))
      errs.push(`${me}: fn must be an entry point: ${m.atlas.entry.join(', ')}`);
    if (n.kind === 'expect' && !(n.reason === '' || m.reasons.includes(n.reason)))
      errs.push(`${me}: reason must be "" (taken from the wire) or one of ${m.reasons.map(r => JSON.stringify(r)).join(', ')}`);
    if (n.kind === 'assert') {
      const keys = m.checks.map(o => checkKey(o.check));
      const c = n.check;
      const fit = isObj(c) && isStr(c.type) && extra(c, c.type === 'cmp' ? ['type', 'op'] : c.type === 'only' || c.type === 'paused' ? ['type', 'fn'] : ['type']).length === 0;
      if (!fit || !keys.includes(checkKey(c)))
        errs.push(`${me}: check must be one of ${m.checks.map(o => JSON.stringify(o.check)).join(', ')}`);
    }
    if (n.kind === 'snapshot' && !(n.of === 'balance' || m.publicSlots.some(p => p.id === n.of)))
      errs.push(`${me}: of must be "balance" or a public slot: ${m.publicSlots.map(p => p.id).join(', ')}`);
    if (errs.length === before) ok.set(n.id, cardPorts(m, n));
  });

  const accepted = [];
  const taken = new Set();
  sc.wires.forEach((w, i) => {
    const end = e => isObj(e) && isStr(e.node) && isStr(e.port) && extra(e, ['node', 'port']).length === 0;
    if (!isObj(w) || !end(w.from) || !end(w.to) || extra(w, ['from', 'to']).length)
      return errs.push(`wires[${i}] must be { from: { node, port }, to: { node, port } }`);
    const me = `wire ${w.from.node}.${w.from.port} → ${w.to.node}.${w.to.port}`;
    if (!ids.has(w.from.node) || !ids.has(w.to.node)) return errs.push(`${me}: no such node`);
    const a = ok.get(w.from.node);
    const b = ok.get(w.to.node);
    if (!a || !b) return; // the node's own error says why
    const port = (c, id, side) => (id === 'then' ? (c.flow ? { type: 'flow' } : null) : c[side].find(p => p.id === id));
    const pa = port(a, w.from.port, 'outputs');
    const pb = port(b, w.to.port, 'inputs');
    if (!pa) return errs.push(`${me}: ${w.from.node} has no output "${w.from.port}" (has ${[...(a.flow ? ['then'] : []), ...a.outputs.map(p => p.id)].join(', ') || 'none'})`);
    if (!pb) return errs.push(`${me}: ${w.to.node} has no input "${w.to.port}" (has ${[...(b.flow ? ['then'] : []), ...b.inputs.map(p => p.id)].join(', ') || 'none'})`);
    if (w.from.node === w.to.node) return errs.push(`${me}: same card`);
    if (pa.type !== pb.type) return errs.push(`${me}: ${pa.type} → ${pb.type}`);
    const key = `${w.to.node}.${w.to.port}`;
    if (taken.has(key)) return errs.push(`${me}: ${key} is already wired`);
    // a wire a→b closes a loop when b already reaches a (data and then wires both order cards)
    const seen = new Set();
    const stack = [w.to.node];
    while (stack.length) {
      const id = stack.pop();
      if (id === w.from.node) return errs.push(`${me}: loop`);
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(...accepted.filter(x => x.from.node === id).map(x => x.to.node));
    }
    taken.add(key);
    accepted.push(w);
  });
  return errs;
}

/** Cards without x / y: sources in a column on the left, the rest left to right, expects under their call. */
export function layout(sc) {
  if (sc.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y))) return sc;
  let src = 0;
  let col = 0;
  const nodes = sc.nodes.map(n => {
    if (n.kind === 'actor' || n.kind === 'const') return { ...n, x: 0, y: 220 * src++ };
    if (n.kind === 'expect' && col) return { ...n, x: 520 * col, y: 340 };
    return { ...n, x: 520 * ++col, y: 0 };
  });
  return { ...sc, nodes };
}

// ---------- reading a run ----------

const MAX = 300;
const clip = s => (typeof s === 'string' && s.length > MAX ? `${s.slice(0, MAX)}… (+${s.length - MAX} chars)` : s);
/** [72,73,74,80] → "72-74, 80" */
const ranges = xs => [...new Set(xs)].sort((a, b) => a - b).reduce((out, n) => {
  const last = out[out.length - 1];
  if (last && n === last[1] + 1) last[1] = n;
  else out.push([n, n]);
  return out;
}, []).map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(', ');

export function loadRun(dataPath) {
  if (!existsSync(dataPath)) throw new Error(`${dataPath} not found: run node luora-export.mjs in the Foundry project first, or pass --data=path/luora-data.json`);
  return JSON.parse(readFileSync(dataPath, 'utf8'));
}
const needAtlas = d => {
  if (!Array.isArray(d.atlas?.pieces) || typeof d.atlas.source !== 'string') throw new Error('luora-data.json has no atlas section: re-run node luora-export.mjs');
  return d.atlas;
};
const findings = a => a.pieces.filter(p => p.sys === 'vulns');
const count = (xs, f) => xs.reduce((o, x) => ((o[f(x)] = (o[f(x)] ?? 0) + 1), o), {});
const toolsOf = f => uniq([f.tool ?? 'manual', ...(f.reports ?? []).map(r => r.tool)]);

function overview(d) {
  const a = d.atlas;
  const m = a && labModel(a);
  const fs = a ? findings(a) : [];
  return {
    contract: a?.contract ?? null,
    file: a?.file ?? null,
    compiler: a?.compiler ?? null,
    generatedAt: d.generatedAt,
    forgeVersion: d.forgeVersion,
    tests: (d.tests ?? []).map(t => ({ name: t.name, suite: t.suite, status: t.status, reason: t.reason ?? null })),
    findings: { total: fs.length, bySeverity: count(fs, f => f.risk ?? 'low'), byTool: count(fs.flatMap(toolsOf), t => t) },
    coverage: a?.coverage ? { tool: a.coverage.tool, lines: a.coverage.lines, branches: a.coverage.branches, functions: a.coverage.functions } : null,
    scenarioModel: m && {
      note: 'What propose_scenario accepts. Scenarios test intended behaviour only.',
      entryPoints: a.entry.map(fn => ({ fn, caller: m.byId[fn]?.caller ?? 'anyone', signature: m.lines[m.lineOf(m.byId[fn])]?.trim(), ports: m.callPorts(fn) })),
      roles: m.roles,
      assertChecks: m.checks,
      snapshotOf: ['balance', ...m.publicSlots.map(p => p.id)],
      revertReasons: m.reasons,
    },
  };
}

function trace(d, test) {
  const t = (d.tests ?? []).find(x => x.name === test || x.name.replace(/\(\)$/, '') === test);
  if (!t) throw new Error(`no test "${test}"; tests: ${(d.tests ?? []).map(x => x.name).join(', ')}`);
  const cap = 400;
  return {
    name: t.name, suite: t.suite, file: t.file, status: t.status, reason: t.reason ?? null,
    transfers: t.transfers ?? [],
    frames: t.frames.slice(0, cap).map(f => ({
      d: f.d, kind: f.kind, contract: f.contract, fn: f.fn, args: clip(f.args), ret: clip(f.ret), ok: f.ok, status: f.status, gas: f.gas,
      ...(f.events?.length ? { events: f.events.slice(0, 20).map(clip) } : {}),
      ...(f.callSite ? { callSite: `${f.callSite.file}:${f.callSite.line}` } : {}),
      ...(f.lines ? { lines: Object.fromEntries(Object.entries(f.lines).map(([k, v]) => [k, ranges(v)])) } : {}),
      ...(f.storage?.length ? { storage: count(f.storage, s => s.op) } : {}),
    })),
    ...(t.frames.length > cap ? { trimmed: `${t.frames.length - cap} more frames not shown` } : {}),
  };
}

const brief = (m, p) => ({ id: p.id, sys: p.sys, name: p.name, line: m.lineOf(p) + 1, ...(p.caller ? { caller: p.caller } : {}), ...(p.risk ? { risk: p.risk } : {}) });

function atlasView(d) {
  const a = needAtlas(d);
  const m = labModel(a);
  return { contract: a.contract, file: a.file, compiler: a.compiler, entry: a.entry, internal: a.internal, pieces: a.pieces.map(p => brief(m, p)), seq: a.seq, banks: a.banks };
}

function piece(d, id) {
  const a = needAtlas(d);
  const m = labModel(a);
  const p = m.byId[id];
  if (!p) throw new Error(`no piece "${id}"; get_atlas lists them`);
  const at = m.lineOf(p);
  return {
    ...p,
    desc: clip(p.desc),
    source: Array.from({ length: Math.min(p.n ?? 1, 80) }, (_, i) => `${at + i + 1}  ${m.lines[at + i] ?? ''}`).join('\n'),
    links: (p.links ?? []).filter(t => m.byId[t]).map(t => brief(m, m.byId[t])),
    findings: findings(a).filter(f => f.id !== id && (a.lesion[f.id] === id || (f.links ?? []).includes(id))).map(f => brief(m, f)),
    ...(a.seq[id] ? { seq: a.seq[id], reverts: m.revertsOf(id).map(r => ({ reason: r.reason, cond: r.cond, line: r.line + 1, via: r.via })) } : {}),
    ...(a.coverage?.pieces?.[id] ? { coverage: a.coverage.pieces[id] } : {}),
  };
}

function listFindings(d, { severity, tool } = {}) {
  const a = needAtlas(d);
  const m = labModel(a);
  return findings(a)
    .filter(f => !severity || (f.risk ?? 'low') === severity)
    .filter(f => !tool || toolsOf(f).includes(tool))
    .map(f => ({ ...brief(m, f), tools: toolsOf(f), detector: f.detector, confidence: f.confidence, on: a.lesion[f.id] ?? null, desc: clip(f.desc) }));
}

/** Validates, lays out and stores a proposal; replaces an earlier proposal with the same id. */
export function proposeScenario(d, dataPath, input) {
  const a = needAtlas(d);
  const errs = scenarioErrors(labModel(a), input);
  if (errs.length) throw new Error(`scenario rejected:\n- ${errs.join('\n- ')}`);
  const sc = layout({ ...input, name: input.name.trim(), id: input.id ?? `ai${Date.now().toString(36)}` });
  const file = join(dirname(dataPath), 'luora-scenarios.json');
  let list = [];
  try {
    list = JSON.parse(readFileSync(file, 'utf8'));
  } catch {}
  if (!Array.isArray(list)) list = [];
  const entry = { ...sc, contract: a.contract, proposedAt: new Date().toISOString() };
  const replaced = list.some(s => s?.id === sc.id);
  list = [...list.filter(s => s?.id !== sc.id), entry];
  writeFileSync(`${file}.tmp`, `${JSON.stringify(list, null, 1)}\n`);
  renameSync(`${file}.tmp`, file);
  return { saved: file, id: sc.id, replaced, next: `Open /atlas → Lab → Scenario; pick "AI · ${sc.name}" under "Proposed by your AI client", then Run and Export .t.sol.` };
}

// ---------- MCP ----------

const str = (description, extra = {}) => ({ type: 'string', description, ...extra });
const NODE_SCHEMA = {
  type: 'object',
  required: ['id', 'kind'],
  properties: {
    id: str('identifier, unique in the scenario'),
    kind: str('card kind', { enum: Object.keys(KINDS) }),
    x: { type: 'number' }, y: { type: 'number' },
    label: str('actor: identifier, e.g. alice'), role: str('actor: "user" or a role from overview.scenarioModel.roles'), balance: str('actor: starting USDC, e.g. "1,000"'),
    value: str('const: USDC amount, e.g. "100"'),
    fn: str('call: entry point id from overview.scenarioModel.entryPoints'),
    reason: str('expect: "" or a revert reason from overview.scenarioModel.revertReasons'),
    check: { type: 'object', description: 'assert: one of overview.scenarioModel.assertChecks[].check' },
    of: str('snapshot: "balance" or a public slot id'),
  },
};
export const TOOLS = [
  { name: 'overview', description: 'Contract, file, compiler, tests (name, status), finding counts, coverage totals, and scenarioModel: the entry points, roles, assert checks, snapshot slots and revert reasons propose_scenario accepts.', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_trace', description: "One test's decoded call frames (args / return values clipped, executed lines as ranges, storage ops counted).", inputSchema: { type: 'object', required: ['test'], properties: { test: str('test name, e.g. test_deposit or test_deposit()') } } },
  { name: 'get_atlas', description: 'Every mapped piece of the contract (functions, modifiers, slots, calls, events, findings) with its line, plus entry points and what each touches in order (seq: r read, w write, c call, e event).', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_piece', description: "One piece: its source lines, links, findings on it, reverts and coverage.", inputSchema: { type: 'object', required: ['id'], properties: { id: str('piece id from get_atlas') } } },
  { name: 'list_findings', description: 'Findings from Slither, Aderyn and Luora checks, optionally filtered.', inputSchema: { type: 'object', properties: { severity: str('risk', { enum: ['high', 'med', 'low', 'info'] }), tool: str('reporting tool', { enum: ['slither', 'aderyn', 'manual'] }) } } },
  {
    name: 'propose_scenario',
    description: 'Propose a Lab scenario that tests INTENDED behaviour (access control holds, accounting stays consistent, pause works, funds round-trip). Only actor / const / call / expect / assert / snapshot cards; anything else is rejected with the reason. Saved to luora-scenarios.json; the auditor opens it in the Lab, runs it and exports a Foundry test. Wire ports: actor.addr → call.caller / snapshot.who; const.value → call.a<i> (i = argument index); call."then" → next card."then" (execution order); call."r:<reason>" → expect.call; call."w:<slot>" → snapshot.slot; snapshot.value → assert.a / assert.b (cmp checks). Read overview first.',
    inputSchema: {
      type: 'object',
      required: ['scenario'],
      properties: {
        scenario: {
          type: 'object',
          required: ['name', 'nodes', 'wires'],
          properties: {
            id: str('optional; reusing an id replaces that proposal'),
            name: str('one line, e.g. "Non-owner cannot setOracle"'),
            nodes: { type: 'array', items: NODE_SCHEMA },
            wires: { type: 'array', items: { type: 'object', required: ['from', 'to'], properties: { from: { type: 'object', properties: { node: { type: 'string' }, port: { type: 'string' } } }, to: { type: 'object', properties: { node: { type: 'string' }, port: { type: 'string' } } } } } },
          },
        },
      },
    },
  },
];

function callTool(name, args, dataPath) {
  const d = loadRun(dataPath);
  switch (name) {
    case 'overview': return overview(d);
    case 'get_trace': return trace(d, args.test);
    case 'get_atlas': return atlasView(d);
    case 'get_piece': return piece(d, args.id);
    case 'list_findings': return listFindings(d, args);
    case 'propose_scenario': return proposeScenario(d, dataPath, args.scenario);
  }
}

const reply = (id, result) => ({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

/** One JSON-RPC message (already parsed) → the response, or null for notifications. */
export function handle(msg, dataPath) {
  if (!isObj(msg) || msg.jsonrpc !== '2.0' || !isStr(msg.method)) return fail(msg?.id ?? null, -32600, 'Invalid Request');
  const { id, method, params = {} } = msg;
  if (id === undefined) return null; // notifications (initialized, cancelled) need no answer
  switch (method) {
    case 'initialize':
      return reply(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOL_VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: { name: 'luora', version: VERSION },
        instructions: 'Luora is a defensive tool for smart-contract auditors. Read the run with overview / get_atlas / get_piece / list_findings / get_trace, then propose_scenario tests of INTENDED behaviour only. Never write attack sequences or exploits; a failing assertion is a finding for the auditor to review.',
      });
    case 'ping':
      return reply(id, {});
    case 'tools/list':
      return reply(id, { tools: TOOLS });
    case 'tools/call': {
      if (!TOOLS.some(t => t.name === params.name)) return fail(id, -32602, `Unknown tool: ${params.name}`);
      try {
        const out = callTool(params.name, isObj(params.arguments) ? params.arguments : {}, dataPath);
        return reply(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 1) }] });
      } catch (e) {
        return reply(id, { content: [{ type: 'text', text: e.message }], isError: true });
      }
    }
    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
}

/** One line from stdin → the line to write back, or null. */
export function handleLine(line, dataPath) {
  if (!line.trim()) return null;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return JSON.stringify(fail(null, -32700, 'Parse error'));
  }
  if (Array.isArray(msg)) {
    const out = msg.map(x => handle(x, dataPath)).filter(Boolean);
    return out.length ? JSON.stringify(out) : null;
  }
  const r = handle(msg, dataPath);
  return r && JSON.stringify(r);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv.slice(2).find(a => a.startsWith('--data='));
  const dataPath = resolve(arg ? arg.slice(7) : 'luora-data.json');
  const rl = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
  rl.on('line', line => {
    const out = handleLine(line, dataPath);
    if (out) process.stdout.write(`${out}\n`);
  });
  console.error(`luora-mcp: serving ${dataPath} over stdio`);
}
