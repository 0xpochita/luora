#!/usr/bin/env node
// Luora atlas: maps one contract into the pieces the Contract Atlas draws (entry points, gates,
// internal logic, storage slots, external calls, events) from `forge build --ast` artifacts and
// `forge inspect <Contract> storageLayout`. Findings are simple, defensive hygiene checks only.
//
//   node luora-atlas.mjs [Contract]   # merges an `atlas` section into luora-data.json
//   LUORA_ATLAS=Contract              # picks the contract when called from luora-export.mjs
//
// No dependencies; needs `forge` on PATH.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOW_LEVEL = new Set(['call', 'delegatecall', 'staticcall', 'send', 'transfer']);
const ERC20_BOOL = new Set(['transfer', 'transferFrom', 'approve']);
const GUARD = /nonreentrant|reentran|lock/i;
const slug = s => s.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
const list = xs => xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs[0] ?? '';

// out dir → its artifacts, read once per process (luora-protocol.mjs maps many contracts from one build)
const ARTIFACTS = new Map();
export function artifacts(OUT) {
  if (!ARTIFACTS.has(OUT)) {
    const list = [];
    for (const dir of readdirSync(OUT)) {
      if (!dir.endsWith('.sol')) continue;
      for (const f of readdirSync(join(OUT, dir))) {
        const a = JSON.parse(readFileSync(join(OUT, dir, f), 'utf8'));
        if (a.ast) list.push({ ast: a.ast, name: f.replace(/(\.\d+\.\d+\.\d+)?\.json$/, ''), version: a.metadata?.compiler?.version?.split('+')[0] ?? '', layout: a.storageLayout });
      }
    }
    ARTIFACTS.set(OUT, list);
  }
  return ARTIFACTS.get(OUT);
}

/**
 * build: run `forge build --ast` first (false = reuse out/, built with `--ast --extra-output storageLayout`);
 * out: artifact dir; crossFile: also merge base contracts from other files (their pieces carry `file`).
 */
export function buildAtlas({ root = process.cwd(), contract = process.env.LUORA_ATLAS, build = true, out = 'out', crossFile = false } = {}) {
  const sh = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

  // ---------- AST of every source unit ----------
  const OUT = join(root, out), units = new Map();
  if (build) { sh('forge', ['build', '--ast']); ARTIFACTS.delete(OUT); }
  for (const a of artifacts(OUT)) if (!units.has(a.ast.absolutePath)) units.set(a.ast.absolutePath, a);
  const inScope = p => !/^(lib|test|script)\//.test(p) && !/\/mocks?\//.test(p) && !p.endsWith('.t.sol');
  const all = [...units.values()].map(a => a.ast).flatMap(u => u.nodes.filter(n => n.nodeType === 'ContractDefinition').map(c => ({ u, c })));
  const size = x => x.c.nodes.filter(n => n.nodeType === 'FunctionDefinition').length;
  const pick = contract
    ? all.find(x => x.c.name === contract)
    : all.filter(x => inScope(x.u.absolutePath) && x.c.contractKind === 'contract' && !x.c.abstract).sort((a, b) => size(b) - size(a))[0];
  if (!pick) throw new Error(`luora-atlas: contract ${contract ?? '(auto)'} not found in out/`);
  const { u: unit, c: C } = pick;
  const art = units.get(unit.absolutePath);
  const compiler = art.version;
  // ponytail: one compiler version = one id / file-index space; a multi-version build could collide across jobs
  const group = [...units.values()].filter(a => a.version === compiler).map(a => a.ast);

  // storage layout: from the artifact when built with --extra-output storageLayout, else forge inspect
  // (which rebuilds without the AST, so it runs after we've read it)
  const own = artifacts(OUT).find(a => a.name === C.name && a.ast.absolutePath === unit.absolutePath && a.layout);
  const layout = own?.layout ?? JSON.parse(sh('forge', ['inspect', C.name, 'storageLayout', '--json']));

  // ---------- source positions (solc offsets are UTF-8 bytes; src = start:length:fileIndex) ----------
  const files = new Map();
  const fileAt = idx => {
    if (!files.has(idx)) {
      const u = group.find(g => +g.src.split(':')[2] === idx) ?? unit;
      const source = readFileSync(join(root, u.absolutePath), 'utf8'), buf = Buffer.from(source), starts = [0];
      for (let i = 0; i < buf.length; i++) if (buf[i] === 10) starts.push(i + 1);
      files.set(idx, { path: u.absolutePath, source, buf, starts, lines: source.split('\n') });
    }
    return files.get(idx);
  };
  const lineAt = (f, off) => { const st = f.starts; let lo = 0, hi = st.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (st[m] <= off) lo = m; else hi = m - 1; } return lo; };
  const span = n => n.src.split(':').map(Number);
  const lineOf = n => { const [s, , f] = span(n); return lineAt(fileAt(f), s); };
  const linesOf = n => { const [s, l, f] = span(n); return lineAt(fileAt(f), s + Math.max(0, l - 1)) - lineAt(fileAt(f), s) + 1; };
  const text = n => { const [s, l, f] = span(n); return fileAt(f).buf.subarray(s, s + l).toString(); };
  const main = fileAt(+unit.src.split(':')[2]);
  const source = main.source;
  const anchor = (line, n = 1) => ({ find: main.lines[line].trim(), line, n });
  /** anchor at a node, in whichever file it sits (`file` only when that isn't the mapped contract's) */
  const at = (node, many = false) => {
    const f = fileAt(span(node)[2]), line = lineOf(node);
    return { find: f.lines[line].trim(), line, n: many ? linesOf(node) : 1, ...(f.path !== unit.absolutePath && { file: f.path }) };
  };

  // ---------- declarations ----------
  const decl = new Map(), anyDecl = new Map();
  const index = (n, m) => { if (Array.isArray(n)) n.forEach(x => index(x, m)); else if (n && typeof n === 'object') { if (typeof n.id === 'number' && n.nodeType) m.set(n.id, n); Object.values(n).forEach(x => index(x, m)); } };
  index(group, anyDecl);
  if (crossFile) for (const [k, v] of anyDecl) decl.set(k, v); else index(unit, decl);
  const bases = C.linearizedBaseContracts.map(id => decl.get(id)).filter(b => b?.nodeType === 'ContractDefinition');
  const members = type => bases.flatMap(b => b.nodes.filter(n => n.nodeType === type));
  const overridden = new Set(members('FunctionDefinition').flatMap(f => f.baseFunctions ?? []));
  const fns = members('FunctionDefinition').filter(f => f.implemented && !overridden.has(f.id));
  const fnId = new Map(), seen = {};
  for (const f of fns) {
    const base = f.kind === 'constructor' ? 'ctor' : f.kind === 'function' ? f.name : f.kind;
    seen[base] = (seen[base] ?? 0) + 1;
    fnId.set(f.id, seen[base] > 1 ? `${base}_${seen[base]}` : base);
  }
  const fnName = f => f.kind === 'constructor' ? 'constructor' : `${f.kind === 'function' ? f.name : f.kind}()`;
  const mods = members('ModifierDefinition');
  const events = members('EventDefinition');
  const evId = e => `ev${e.name}`;
  const stateVars = members('VariableDeclaration').filter(v => v.stateVariable);
  const storage = [...layout.storage].sort((a, b) => a.slot - b.slot || a.offset - b.offset);
  const slotOf = new Map(stateVars.filter(v => storage.some(s => s.label === v.name)).map(v => [v.id, v.name]));

  // ---------- one walker: steps in evaluation order + what each function touches directly ----------
  const discarded = new Set();
  const markDiscarded = n => { if (Array.isArray(n)) n.forEach(markDiscarded); else if (n && typeof n === 'object') { if (n.nodeType === 'ExpressionStatement' && n.expression?.nodeType === 'FunctionCall') discarded.add(n.expression.id); Object.values(n).forEach(markDiscarded); } };
  markDiscarded(C);
  const calls = new Map(); // key → call info
  const facts = () => ({ reads: new Set(), writes: new Set(), calls: new Set(), events: new Set(), internal: new Set(), mods: new Set() });

  function external(e) {
    if (e.nodeType !== 'MemberAccess') return null;
    const bt = e.expression.typeDescriptions?.typeString ?? '', ft = e.typeDescriptions?.typeString ?? '';
    const target = text(e.expression);
    if (target === 'super') return null;
    // an external / public library function runs by DELEGATECALL in this contract's storage
    if (bt.startsWith('type(library ')) {
      const f = anyDecl.get(e.referencedDeclaration);
      if (f?.nodeType === 'FunctionDefinition' && f.name === e.memberName && ['external', 'public'].includes(f.visibility))
        return { target, member: e.memberName, dep: bt.slice(13, -1), lib: true, view: ['view', 'pure'].includes(f.stateMutability) };
      return null;
    }
    if (/ external\b/.test(ft) && bt.startsWith('contract ')) return { target, member: e.memberName, dep: bt.slice(9), view: /\b(view|pure)\b/.test(ft), bool: /returns \(bool\)$/.test(ft) };
    if (/^address/.test(bt) && LOW_LEVEL.has(e.memberName)) return { target, member: e.memberName, dep: target, address: true, view: e.memberName === 'staticcall' };
    return null;
  }

  function step(cx, k, id, node) {
    const last = cx.steps.at(-1);
    if (!(last && last.k === k && last.id === id)) cx.steps.push({ k, id, line: cx.atLine ?? lineOf(node) });
    if (cx.facts) cx.facts[{ r: 'reads', w: 'writes', c: 'calls', e: 'events' }[k]].add(id);
  }

  function walk(n, cx) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const x of n) walk(x, cx); return; }
    const rd = { ...cx, lhs: false };
    switch (n.nodeType) {
      case 'Identifier': { const s = slotOf.get(n.referencedDeclaration); if (s) step(cx, cx.lhs ? 'w' : 'r', s, n); return; }
      case 'IndexAccess': walk(n.indexExpression, rd); walk(n.baseExpression, cx); return;
      case 'MemberAccess': walk(n.expression, cx); return;
      case 'Assignment': walk(n.rightHandSide, rd); walk(n.leftHandSide, { ...cx, lhs: true }); return;
      case 'UnaryOperation': walk(n.subExpression, { ...cx, lhs: ['++', '--', 'delete'].includes(n.operator) }); return;
      case 'PlaceholderStatement': cx.placeholder?.(); return;
      case 'EmitStatement': {
        walk(n.eventCall.arguments, rd);
        const ev = decl.get(n.eventCall.expression.referencedDeclaration);
        if (ev) step(cx, 'e', evId(ev), n);
        return;
      }
      case 'FunctionCall': {
        if (n.kind !== 'functionCall') return walk(n.arguments, rd);
        let e = n.expression;
        if (e.nodeType === 'FunctionCallOptions') { walk(e.options, rd); e = e.expression; }
        const x = external(e);
        if (x) {
          walk(e.expression, rd); walk(n.arguments, rd);
          const key = `${x.target}.${x.member}`;
          const c = calls.get(key) ?? { id: `c_${slug(key)}`, key, ...x, line: lineOf(n), node: n, in: new Set(), unchecked: false };
          calls.set(key, c);
          if (cx.facts) c.in.add(cx.fn);
          if (x.bool && ERC20_BOOL.has(x.member) && discarded.has(n.id)) c.unchecked = true;
          step(cx, 'c', c.id, n);
          return;
        }
        const f = decl.get(e.referencedDeclaration);
        if (e.nodeType === 'Identifier' && fnId.has(f?.id)) {
          walk(n.arguments, rd);
          cx.facts?.internal.add(fnId.get(f.id));
          if (cx.inline && !cx.stack.includes(f.id))
            run(f, { ...rd, facts: null, atLine: cx.atLine ?? lineOf(n), stack: [...cx.stack, f.id], placeholder: undefined });
          return;
        }
        walk(e, rd); walk(n.arguments, rd);
        return;
      }
      default: {
        const kids = Object.entries(n).filter(([k, v]) => k !== 'typeDescriptions' && v && typeof v === 'object' && (Array.isArray(v) || v.nodeType));
        const at = v => (Array.isArray(v) ? v[0] : v)?.src ? span(Array.isArray(v) ? v[0] : v)[0] : 0;
        for (const [, v] of kids.sort((a, b) => at(a[1]) - at(b[1]))) walk(v, cx);
      }
    }
  }

  // modifiers wrap the body: their statements run around `_`
  function run(f, cx) {
    const chain = i => {
      if (i === f.modifiers.length) return walk(f.body, cx);
      const m = f.modifiers[i], md = decl.get(m.modifierName.referencedDeclaration);
      if (md?.nodeType !== 'ModifierDefinition') return chain(i + 1);
      cx.facts?.mods.add(md.name);
      walk(m.arguments, { ...cx, lhs: false });
      walk(md.body, { ...cx, facts: null, atLine: cx.atLine ?? lineOf(m), placeholder: () => chain(i + 1) });
    };
    chain(0);
  }

  const info = new Map();
  for (const f of fns) {
    const fx = facts();
    run(f, { steps: [], facts: fx, inline: false, stack: [f.id], fn: fnId.get(f.id) }); // direct touches
    const steps = [];
    run(f, { steps, facts: null, inline: true, stack: [f.id], fn: fnId.get(f.id) }); // full ordered sequence
    info.set(f.id, { f, id: fnId.get(f.id), fx, steps });
  }
  const modInfo = new Map(mods.map(m => { const fx = facts(); walk(m.body, { steps: [], facts: fx, inline: false, stack: [] }); return [m.name, fx]; }));

  // ---------- who may call ----------
  const senderCheck = n => {
    let who = null;
    const go = x => {
      if (who || !x || typeof x !== 'object') return;
      if (Array.isArray(x)) return x.forEach(go);
      if (x.nodeType === 'BinaryOperation' && ['==', '!='].includes(x.operator)) {
        const [l, r] = [text(x.leftExpression), text(x.rightExpression)];
        const other = /^(msg\.sender|_msgSender\(\))$/.test(l) ? r : /^(msg\.sender|_msgSender\(\))$/.test(r) ? l : null;
        if (other && /^[A-Za-z_]\w*$/.test(other)) who = other;
      }
      Object.values(x).forEach(go);
    };
    go(n);
    return who;
  };
  const callerOf = (fi, depth = 0) => {
    for (const m of fi.fx.mods) {
      const md = mods.find(x => x.name === m);
      const who = senderCheck(md.body) ?? m.match(/^only([A-Z]\w*)$/)?.[1].toLowerCase();
      if (who) return who;
    }
    const who = senderCheck(fi.f.body);
    if (who || depth > 1) return who;
    for (const id of fi.fx.internal) { const sub = [...info.values()].find(x => x.id === id); const w = sub && callerOf(sub, depth + 1); if (w) return w; }
    return null;
  };

  // ---------- pieces ----------
  const pieces = [], lesion = {}, seq = {}, callTarget = {};
  const infos = [...info.values()];
  const entries = infos.filter(x => ['external', 'public'].includes(x.f.visibility) && x.f.kind !== 'constructor');
  const internals = infos.filter(x => !entries.includes(x));
  const nonView = id => { const c = [...calls.values()].find(x => x.id === id); return c && !c.view; };
  const guarded = x => [...x.fx.mods].some(m => GUARD.test(m));
  const touchers = (slot, key) => [...infos.map(x => [x.id + '()', x.fx]), ...[...modInfo].map(([m, fx]) => [m, fx])].filter(([, fx]) => fx[key].has(slot)).map(([n]) => n.replace('ctor()', 'constructor'));
  const fnLinks = x => [...x.fx.mods, ...x.fx.internal, ...x.fx.calls, ...x.fx.writes, ...x.fx.reads, ...x.fx.events];
  const unguarded = entries.filter(x => !guarded(x) && x.steps.some(s => s.k === 'c' && nonView(s.id)));

  for (const x of entries) {
    const caller = callerOf(x) ?? 'anyone';
    x.caller = caller;
    const outs = [...x.fx.calls].map(id => [...calls.values()].find(c => c.id === id).key);
    const desc = [
      `${x.f.visibility[0].toUpperCase()}${x.f.visibility.slice(1)} entry point${caller === 'anyone' ? ' with no caller restriction' : `, only callable by ${caller}`}.`,
      x.fx.mods.size && `Gated by ${list([...x.fx.mods])}.`,
      x.fx.internal.size && `Uses ${list([...x.fx.internal].map(i => `${i}()`))}.`,
      outs.length && `Calls out to ${list(outs)}.`,
      x.fx.writes.size && `Writes ${list([...x.fx.writes])}.`,
      x.fx.events.size && `Emits ${list([...x.fx.events].map(e => e.slice(2)))}.`,
    ].filter(Boolean).join(' ');
    pieces.push({ id: x.id, sys: 'entry', caller, name: fnName(x.f), ...at(x.f, true), desc, links: [...fnLinks(x), ...(unguarded.includes(x) ? ['noReentrancy'] : [])] });
    seq[x.id] = x.steps.map(s => [s.k, s.id]);
  }
  for (const m of mods) {
    const fx = modInfo.get(m.name), users = entries.filter(x => x.fx.mods.has(m.name)).map(x => fnName(x.f));
    const who = senderCheck(m.body);
    pieces.push({ id: m.name, sys: 'access', name: m.name, ...at(m, true),
      desc: `${who ? `Gate: only ${who} (msg.sender == ${who}) may pass.` : `Modifier${fx.reads.size ? ` checking ${list([...fx.reads])}` : ''}.`} Applied to ${list(users) || 'no entry point'}.`,
      links: [...fx.reads, ...fx.writes, ...fx.calls] });
  }
  if (unguarded.length) {
    const host = unguarded[0];
    pieces.push({ id: 'noReentrancy', sys: 'access', ghost: true, name: 'nonReentrant (missing)', ...at(host.f),
      desc: `Missing protection, drawn as a wireframe "ghost": no reentrancy guard on ${list(unguarded.map(x => fnName(x.f)))}, which make state-changing external calls.` });
  }
  for (const x of internals) {
    const users = infos.filter(y => y.fx.internal.has(x.id)).map(y => fnName(y.f));
    const desc = [
      x.f.kind === 'constructor' ? 'Runs once at deployment.' : `${x.f.visibility[0].toUpperCase()}${x.f.visibility.slice(1)} helper${users.length ? ` used by ${list(users)}` : ''}.`,
      x.fx.reads.size && `Reads ${list([...x.fx.reads])}.`,
      x.fx.writes.size && `Writes ${list([...x.fx.writes])}.`,
      x.fx.calls.size && `Calls out to ${list([...x.fx.calls].map(id => [...calls.values()].find(c => c.id === id).key))}.`,
    ].filter(Boolean).join(' ');
    pieces.push({ id: x.id, sys: 'logic', name: fnName(x.f), ...at(x.f, true), desc, links: fnLinks(x) });
  }
  for (const s of storage) {
    const t = layout.types[s.type], v = stateVars.find(y => y.name === s.label);
    const mapping = t.encoding !== 'inplace';
    const w = touchers(s.label, 'writes'), r = touchers(s.label, 'reads');
    pieces.push({ id: s.label, sys: 'storage', slot: +s.slot, ...(mapping && { mapping: true }),
      name: `slot ${s.slot} · ${s.label}${mapping ? '[]' : ''}`, ...(v ? at(v) : anchor(0)),
      desc: `${t.label}${s.offset ? ` (packed at byte ${s.offset})` : ''}. ${w.length ? `Written by ${list(w)}.` : 'Never written after deployment.'}${r.length ? ` Read by ${list(r)}.` : ''}` });
  }
  const deps = new Map();
  for (const c of calls.values()) {
    const dep = deps.get(c.dep) ?? { id: `dep_${slug(c.dep)}`, name: c.address ? `${c.dep} (address)` : c.dep, address: c.address, lib: c.lib, node: c.node, calls: [] };
    deps.set(c.dep, dep);
    dep.calls.push(c.id);
    callTarget[c.id] = dep.id;
    const slot = slotOf.get(stateVars.find(v => v.name === c.target)?.id);
    const where = [...c.in].map(i => `${i}()`);
    pieces.push({ id: c.id, sys: 'calls', name: c.key, target: c.target, member: c.member, ...(c.view && { view: true }), ...at(c.node), ...(c.unchecked && { mark: [0] }),
      desc: c.lib
        ? `Library call ${c.key}() from ${list(where)}. ${c.dep}'s code runs here by DELEGATECALL, on this contract's storage.${c.view ? ' Read-only (view) function.' : ''}`
        : `External call ${c.key}() from ${list(where)}. Control passes to ${dep.name} here.${c.view ? ' Read-only (view) call.' : ''}${c.unchecked ? ' The bool return value is not checked.' : ''}`,
      links: [dep.id, ...(slot ? [slot] : [])] });
  }
  for (const [name, d] of deps) {
    const def = all.find(x => x.u === unit && x.c.name === name)?.c;
    const slots = storage.filter(s => layout.types[s.type].label === `contract ${name}`).map(s => s.label);
    pieces.push({ id: d.id, sys: 'deps', name: d.name, ...at(def ?? d.node),
      desc: d.address ? `Whatever account sits at ${name}. If it is a contract, its code runs during the call.` : d.lib ? `Library ${name}, deployed once and linked; its external functions run on this contract's storage.` : `External ${def?.contractKind ?? 'contract'} ${name}${slots.length ? `, reached through ${list(slots)}` : ''}. Its code runs outside this contract; whatever it returns is trusted.`,
      links: [...d.calls, ...slots] });
  }
  for (const e of events) {
    const by = infos.filter(x => x.fx.events.has(evId(e))).map(x => fnName(x.f));
    pieces.push({ id: evId(e), sys: 'events', name: e.name, ...at(e), desc: by.length ? `Emitted by ${list(by)}. Monitors and indexers listen here.` : 'Declared but never emitted.' });
  }

  // ---------- findings: simple, defensive static checks ----------
  const findings = [];
  const add = (host, { title, ...f }) => { const id = `f${findings.length + 1}`; findings.push(id); lesion[id] = host; pieces.push({ id, sys: 'vulns', name: `F-${String(findings.length).padStart(2, '0')} ${title}`, ...f }); };
  for (const x of entries) {
    const i = x.steps.findIndex(s => s.k === 'c' && nonView(s.id));
    const late = i < 0 ? [] : x.steps.slice(i + 1).filter(s => s.k === 'w');
    if (!late.length) continue;
    const top = lineOf(x.f), n = linesOf(x.f), call = [...calls.values()].find(c => c.id === x.steps[i].id);
    const slots = [...new Set(late.map(s => s.id))];
    add(x.id, { title: `State written after external call in ${fnName(x.f)}`, risk: guarded(x) ? 'med' : 'high', ...anchor(top, n),
      mark: [...new Set([x.steps[i].line, ...late.map(s => s.line)])].map(l => l - top).filter(o => o >= 0 && o < n),
      desc: `${fnName(x.f)} calls ${call.key}() and only then updates ${list(slots)}. While the callee has control it can observe the old values. Fix: finish every storage write before the external call (checks-effects-interactions) and keep a reentrancy guard as a second layer.`,
      links: [x.id, call.id, ...slots] });
  }
  if (unguarded.length)
    add('noReentrancy', { title: 'No reentrancy guard', risk: 'med', ...anchor(lineOf(unguarded[0].f)), mark: [0],
      desc: `${list(unguarded.map(x => fnName(x.f)))} make state-changing external calls without a reentrancy guard. Fix: add OpenZeppelin ReentrancyGuard (nonReentrant) to these entry points.`,
      links: [...unguarded.map(x => x.id), 'noReentrancy'] });
  const unchecked = [...calls.values()].filter(c => c.unchecked);
  if (unchecked.length)
    add(unchecked[0].id, { title: 'Unchecked ERC20 return', risk: 'med', ...at(unchecked[0].node), mark: [0],
      desc: `${list(unchecked.map(c => `${c.key}()`))} ignore the bool the token returns, so a token that signals failure with false is treated as success. Fix: use SafeERC20 (safeTransfer / safeTransferFrom) or require the return value.`,
      links: unchecked.map(c => c.id) });
  const privileged = entries.filter(x => x.caller !== 'anyone' && x.fx.writes.size);
  if (privileged.length) {
    const silent = privileged.filter(x => !x.fx.events.size).map(x => fnName(x.f));
    add(privileged[0].id, { title: 'Privileged functions', risk: 'low', ...anchor(lineOf(privileged[0].f)), mark: [0],
      desc: `${list(privileged.map(x => `${fnName(x.f)} (${x.caller})`))} change ${list([...new Set(privileged.flatMap(x => [...x.fx.writes]))])} immediately with a single key.${silent.length ? ` ${list(silent)} emit no event.` : ''} Fix: hold the roles in a multisig, put configuration changes behind a timelock and emit an event for each change.`,
      links: privileged.map(x => x.id) });
  }

  const ids = new Set(pieces.map(p => p.id));
  for (const p of pieces) if (p.links) p.links = [...new Set(p.links)].filter(l => ids.has(l) && l !== p.id);
  return {
    contract: C.name, file: unit.absolutePath, compiler, source,
    pieces, lesion, seq, callTarget,
    banks: [
      { title: 'DATA BANK // 01', sub: 'STORAGE', ids: pieces.filter(p => p.sys === 'storage' && !p.mapping).map(p => p.id) },
      { title: 'DATA BANK // 02', sub: 'MAPPINGS', ids: pieces.filter(p => p.sys === 'storage' && p.mapping).map(p => p.id) },
      { title: 'DATA BANK // 03', sub: 'EXTERNAL', ids: pieces.filter(p => p.sys === 'deps').map(p => p.id) },
      { title: 'DATA BANK // 04', sub: 'EVENTS', ids: pieces.filter(p => p.sys === 'events').map(p => p.id) },
    ],
    entry: entries.map(x => x.id),
    internal: internals.map(x => x.id),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.cwd(), file = join(root, 'luora-data.json');
  const atlas = buildAtlas({ root, contract: process.argv[2] ?? process.env.LUORA_ATLAS });
  const data = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  writeFileSync(file, JSON.stringify({ ...data, atlas }, null, 1));
  console.log(`luora: atlas ${atlas.contract} — ${atlas.pieces.length} pieces, ${atlas.pieces.filter(p => p.sys === 'vulns').length} findings → luora-data.json`);
}
