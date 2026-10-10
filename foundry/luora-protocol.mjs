#!/usr/bin/env node
// Luora protocol map: several contracts of one protocol, and how they call, delegate to, hold,
// deploy and inherit each other, as one graph for the app's Explore section. Each contract is
// mapped by luora-atlas.mjs (the same pieces the Atlas draws); this script only adds the edges
// between them and checks the hand-written flows against the AST.
//
//   node luora-protocol.mjs explore/aave-v3.json <dir holding the clones> [out.json]
//
// Each build root must already be built: forge build --ast --extra-output storageLayout
// No dependencies.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { artifacts, buildAtlas } from './luora-atlas.mjs';

/** Every node of `n` (depth-first). */
function* nodes(n) {
  if (Array.isArray(n)) for (const x of n) yield* nodes(x);
  else if (n && typeof n === 'object') {
    if (n.nodeType) yield n;
    for (const v of Object.values(n)) if (v && typeof v === 'object') yield* nodes(v);
  }
}

/** contract name from a type string: "contract IPool" / "contract IPool[]" → IPool */
const typeName = t => /^contract (\w+)/.exec(t ?? '')?.[1] ?? null;

/** SPDX id from a file's header, or null. */
export const spdxOf = text => /SPDX-License-Identifier:\s*([^\s*]+)/.exec(text.slice(0, 2000))?.[1] ?? null;
/** Licences whose code we may quote; BUSL, UNLICENSED (proprietary) and anything unknown are structure only. */
export const openLicense = id => !!id && /^(MIT|(L|A)?GPL-|Apache-|BSD-|MPL-|ISC$|Unlicense$|CC0-)/.test(id);

/** Structure only: no source text leaves the clone. `keep(piece)` = this piece's file may be quoted. */
export function stripSource(atlas, keepSource, keep = () => false) {
  return { ...atlas, source: keepSource ? atlas.source : '', pieces: atlas.pieces.map(p => (keep(p) ? p : { ...p, find: p.name.replace(/\(\)$/, '') })) };
}

/** Atlas minus the hygiene heuristics: these protocols are audited, a heuristic "finding" isn't a claim we stand behind. */
export function dropFindings(atlas) {
  const pieces = atlas.pieces.filter(p => p.sys !== 'vulns' && !p.ghost);
  const ids = new Set(pieces.map(p => p.id));
  return { ...atlas, lesion: {}, pieces: pieces.map(p => (p.links ? { ...p, links: p.links.filter(l => ids.has(l)) } : p)) };
}

/**
 * Resolve a type name to a mapped contract: itself, a listed external, or the one mapped contract
 * that inherits it (IAToken → AToken). Ambiguous interfaces (IERC20) stay unresolved unless listed.
 */
export function resolver(contracts, externals, basesOf) {
  const names = new Set(contracts.map(c => c.name));
  const ext = new Map(externals.flatMap(e => [e.name, ...(e.aliases ?? [])].map(a => [a, e.name])));
  const own = new Map(contracts.flatMap(c => (c.aliases ?? []).map(a => [a, c.name])));
  return t => {
    if (!t) return null;
    if (names.has(t)) return t;
    if (own.has(t)) return own.get(t);
    if (ext.has(t)) return ext.get(t);
    const impl = contracts.filter(c => basesOf(c.name).includes(t));
    return impl.length === 1 ? impl[0].name : null;
  };
}

/** Merge raw relations into edges: one per (from, to, kind), members sorted and unique, no self loops. */
export function mergeEdges(raw) {
  const by = new Map();
  for (const r of raw) {
    if (!r.to || r.to === r.from) continue;
    const k = `${r.from}|${r.to}|${r.kind}`;
    const e = by.get(k) ?? { from: r.from, to: r.to, kind: r.kind, members: [] };
    if (r.member && !e.members.includes(r.member)) e.members.push(r.member);
    by.set(k, e);
  }
  return [...by.values()].map(e => ({ ...e, members: e.members.sort() }));
}

/** One `forge build --ast` output: its contracts, linearizations, library functions and file → repo map. */
function loadBuild(b, clones) {
  const root = resolve(clones, b.root);
  const OUT = join(root, b.out ?? 'out');
  const defs = new Map(); // contract name → { c, unit } (first wins, like luora-atlas)
  for (const a of artifacts(OUT)) for (const c of a.ast.nodes) if (c.nodeType === 'ContractDefinition' && !defs.has(c.name)) defs.set(c.name, { c, unit: a.ast });
  const byId = new Map([...defs.values()].map(d => [d.c.id, d]));
  // function id → the library declaring it (internal library code is inlined into the caller)
  const libFn = new Map();
  for (const d of defs.values()) if (d.c.contractKind === 'library') for (const f of d.c.nodes) if (f.nodeType === 'FunctionDefinition') libFn.set(f.id, { lib: d.c.name, fn: f });
  // path prefix → repo id; null = vendored (a submodule or node_modules of another project, no link)
  const spdx = new Map();
  const roots = Object.entries(b.map ?? { '': b.repo }).sort((x, y) => y[0].length - x[0].length);
  return {
    ...b, root, defs, byId, libFn,
    def(name) {
      const d = defs.get(name);
      if (!d) throw new Error(`luora-protocol: ${name} not found in ${OUT}`);
      return d;
    },
    linear(name) {
      return this.def(name).c.linearizedBaseContracts.map(id => byId.get(id)).filter(Boolean);
    },
    repoOf(file) {
      const r = roots.find(([prefix]) => file.startsWith(prefix));
      if (!r) throw new Error(`luora-protocol: no repo for ${file}`);
      return { repo: r[1], path: r[1] ? file.slice(r[0].length) : file };
    },
    spdx(file) {
      if (!spdx.has(file)) spdx.set(file, spdxOf(readFileSync(join(root, file), 'utf8')));
      return spdx.get(file);
    },
    lineOf(unit, node) {
      const src = readFileSync(join(root, unit.absolutePath));
      const off = +node.src.split(':')[0];
      let line = 0;
      for (let i = 0; i < off; i++) if (src[i] === 10) line++;
      return line;
    },
  };
}

export function buildProtocol(spec, clones) {
  const builds = spec.builds.map(b => loadBuild(b, clones));
  const buildOf = name => {
    const cs = spec.contracts.find(c => c.name === name);
    return builds.find(b => b.id === cs?.build) ?? builds[0];
  };
  const basesOf = name => buildOf(name).linear(name).map(d => d.c.name).filter(n => n !== name);
  const resolve_ = resolver(spec.contracts, spec.externals ?? [], basesOf);

  const raw = [];
  const contracts = spec.contracts.map(cs => {
    const B = buildOf(cs.name);
    const { c, unit } = B.def(cs.name);
    const { repo, path } = B.repoOf(unit.absolutePath);
    let atlas = dropFindings(buildAtlas({ root: B.root, contract: cs.name, build: false, out: B.out ?? 'out', crossFile: true }));
    const license = B.spdx(unit.absolutePath);
    atlas = stripSource(atlas, openLicense(license), p => openLicense(B.spdx(p.file ?? unit.absolutePath)));
    // pieces inherited from another file: that file's path inside its own repo
    atlas = { ...atlas, pieces: atlas.pieces.map(p => { if (!p.file) return p; const r = B.repoOf(p.file); return { ...p, file: r.path, repo: r.repo, license: B.spdx(p.file) }; }) };
    // calls and library delegations, from the atlas' call pieces
    const deps = new Map(atlas.pieces.filter(p => p.sys === 'deps').map(p => [p.id, p]));
    for (const p of atlas.pieces.filter(p => p.sys === 'calls')) {
      const dep = deps.get(atlas.callTarget[p.id]);
      const lib = /^Library call/.test(p.desc);
      raw.push({ from: cs.name, to: resolve_(dep?.name.replace(/ \(address\)$/, '')), kind: lib ? 'delegates' : 'calls', member: p.member });
    }
    // holds (state variables / immutables of a contract type), uses (internal library functions, inlined) and deploys (new X), over the whole linearization
    for (const b of B.linear(cs.name))
      for (const n of nodes(b.c.nodes)) {
        if (n.nodeType === 'VariableDeclaration' && n.stateVariable) raw.push({ from: cs.name, to: resolve_(typeName(n.typeDescriptions?.typeString)), kind: 'holds', member: n.name });
        const lf = (n.nodeType === 'MemberAccess' || n.nodeType === 'Identifier') && B.libFn.get(n.referencedDeclaration);
        if (lf && ['internal', 'private'].includes(lf.fn.visibility)) raw.push({ from: cs.name, to: resolve_(lf.lib), kind: 'uses', member: lf.fn.name });
        if (n.nodeType === 'NewExpression') raw.push({ from: cs.name, to: resolve_(/returns \(contract (\w+)\)$/.exec(n.typeDescriptions?.typeString ?? '')?.[1]), kind: 'deploys' });
      }
    for (const b of c.baseContracts ?? []) raw.push({ from: cs.name, to: resolve_(b.baseName.name), kind: 'inherits' });
    const fns = atlas.pieces.filter(p => p.sys === 'entry' || p.sys === 'logic');
    return {
      ...cs,
      repo,
      license,
      excerpts: openLicense(license),
      file: path,
      line: B.lineOf(unit, c),
      kind: c.contractKind === 'contract' && c.abstract ? 'abstract' : c.contractKind,
      bases: basesOf(cs.name),
      counts: {
        entry: atlas.entry.length,
        functions: fns.length,
        storage: atlas.pieces.filter(p => p.sys === 'storage').length,
        events: atlas.pieces.filter(p => p.sys === 'events').length,
      },
      gated: atlas.pieces.filter(p => p.sys === 'entry' && p.caller && p.caller !== 'anyone').map(p => {
        // the modifier that gates it reads better than the heuristic's lowercased role
        const by = (p.links ?? []).find(l => atlas.pieces.some(x => x.id === l && x.sys === 'access'));
        return { fn: p.name, caller: p.caller, ...(by && { by }) };
      }),
      atlas: { ...atlas, file: path },
    };
  });

  // hand-written flows: every step must name a function that exists where it says
  const fnLine = (name, fn) => {
    const B = buildOf(name);
    for (const b of B.linear(name)) {
      const f = b.c.nodes.find(n => (n.nodeType === 'FunctionDefinition' && (n.name === fn || n.kind === fn)) || (n.nodeType === 'EventDefinition' && n.name === fn));
      if (f && (f.implemented !== false || f.nodeType === 'EventDefinition' || b.c.contractKind === 'interface')) {
        const { repo, path } = B.repoOf(b.unit.absolutePath);
        return { repo, file: path, line: B.lineOf(b.unit, f) };
      }
    }
    return null;
  };
  const lanes = new Set([...spec.contracts.map(c => c.name), ...(spec.externals ?? []).map(e => e.name)]);
  const flows = spec.flows.map(f => ({
    ...f,
    steps: f.steps.map(s => {
      const [lane, fn] = s.at.split('.');
      if (!lanes.has(lane) && lane !== f.actor) throw new Error(`luora-protocol: flow ${f.id}: unknown lane ${lane}`);
      if (!fn || !spec.contracts.some(c => c.name === lane)) return { ...s, lane, fn: fn ?? null };
      const at = fnLine(lane, fn);
      if (!at) throw new Error(`luora-protocol: flow ${f.id}: ${s.at} not found in the AST`);
      return { ...s, lane, fn, ...at };
    }),
  }));

  const sh = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim();
  const repos = spec.repos.map(r => {
    const commit = sh(resolve(clones, r.dir), 'rev-parse', 'HEAD');
    if (r.commit && r.commit !== commit) throw new Error(`luora-protocol: ${r.id} is at ${commit}, spec pins ${r.commit}`);
    return { id: r.id, url: r.url, tag: r.tag, commit, license: r.license, ...(r.licenseNote && { licenseNote: r.licenseNote }) };
  });

  const { builds: _, ...meta } = spec;
  // spec edges: relations the AST can't see (assembly delegatecall), marked as read by hand
  const extra = (spec.edges ?? []).map(e => ({ ...e, manual: true }));
  return { ...meta, repos, contracts, edges: [...mergeEdges(raw), ...extra], flows, generatedWith: execFileSync('forge', ['--version'], { encoding: 'utf8' }).split('\n')[0] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [specPath, clones, outPath] = process.argv.slice(2);
  if (!specPath || !clones) throw new Error('usage: node luora-protocol.mjs <spec.json> <clones dir> [out.json]');
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  const p = buildProtocol(spec, clones);
  const out = outPath ?? join(fileURLToPath(new URL('.', import.meta.url)), '../apps/frontend/src/features/explore/data', `${spec.id}.json`);
  writeFileSync(out, `${JSON.stringify(p)}\n`);
  console.log(`luora: ${p.name} — ${p.contracts.length} contracts, ${p.edges.length} edges, ${p.flows.length} flows → ${out}`);
}
