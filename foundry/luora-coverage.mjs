#!/usr/bin/env node
// Luora coverage: runs `forge coverage --report lcov` (retrying with --ir-minimum on stack-too-deep),
// keeps the audited contract's file and folds it onto the atlas pieces, so /atlas can show which
// code the test suite never executes. Output = the optional `coverage` section of the atlas.
//
//   node luora-coverage.mjs        # merges atlas.coverage into an existing luora-data.json
//
// All line numbers in the output are 0-based (like Piece.line). No dependencies; needs `forge`.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** lcov text → { [sourceFile]: { da, brda, fn, totals } } (1-based lines, as lcov writes them). */
export function parseLcov(text) {
  const files = {};
  let f = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim(), i = line.indexOf(':');
    const [tag, val] = i < 0 ? [line, ''] : [line.slice(0, i), line.slice(i + 1)];
    if (tag === 'SF') files[val] = f = { da: new Map(), brda: new Map(), fn: new Map(), totals: {} };
    else if (!f) continue;
    else if (tag === 'DA') { const [l, n] = val.split(','); f.da.set(+l, +n); }
    else if (tag === 'BRDA') {
      // BRDA:<line>,<block>,<branch>,<taken | "-" = the branch point was never reached>
      const [l, , , taken] = val.split(',');
      const arr = f.brda.get(+l) ?? [];
      arr.push(taken === '-' ? null : +taken);
      f.brda.set(+l, arr);
    } else if (tag === 'FN') { const [l, name] = val.split(','); f.fn.set(name, { line: +l, calls: 0 }); }
    else if (tag === 'FNDA') { const [n, name] = val.split(','); const x = f.fn.get(name); if (x) x.calls = +n; }
    else if (/^(LF|LH|BRF|BRH|FNF|FNH)$/.test(tag)) f.totals[tag] = +val;
    else if (tag === 'end_of_record') f = null;
  }
  return files;
}

const count = (hit, found) => ({ hit, found });
const taken = n => n != null && n > 0;
/** pieces that are executable code; storage, deps and events are declarations */
const CODE = new Set(['entry', 'access', 'logic', 'calls']);

/**
 * One file's lcov record + atlas pieces → coverage section. A function piece is measured on its body
 * (anchor line excluded), so a function only ever called on its revert path reads 0%.
 */
export function coverageSection(rec, pieces, tool = 'forge coverage') {
  const hits = {}, branchHits = {};
  for (const [l, n] of rec.da) hits[l - 1] = n;
  for (const [l, arr] of rec.brda) branchHits[l - 1] = arr;
  const allBr = [...rec.brda.values()].flat(), fns = [...rec.fn.values()];
  const t = rec.totals;
  const out = {
    tool,
    lines: count(t.LH ?? [...rec.da.values()].filter(Boolean).length, t.LF ?? rec.da.size),
    branches: count(t.BRH ?? allBr.filter(taken).length, t.BRF ?? allBr.length),
    functions: count(t.FNH ?? fns.filter(f => f.calls).length, t.FNF ?? fns.length),
    hits, branchHits, pieces: {},
  };
  for (const p of pieces) {
    if (!CODE.has(p.sys) || p.ghost || p.line == null) continue; // ghosts = missing code, nothing to run
    const n = p.n ?? 1, from = n > 1 ? p.line + 1 : p.line, to = p.line + n;
    let lh = 0, lf = 0, bh = 0, bf = 0;
    for (let l = from; l < to; l++) {
      if (l in hits) { lf++; if (hits[l]) lh++; }
      for (const b of branchHits[l] ?? []) { bf++; if (taken(b)) bh++; }
    }
    if (!lf) continue;
    const fn = fns.find(f => f.line - 1 === p.line);
    out.pieces[p.id] = { lines: count(lh, lf), branches: count(bh, bf), ...(fn && { calls: fn.calls }) };
  }
  return out;
}

/** Runs forge coverage and returns { lcov, tool }; falls back to --ir-minimum on stack-too-deep. */
export function runCoverage({ root = process.cwd(), args = [] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'luora-cov-')), file = join(dir, 'lcov.info');
  const run = extra => execFileSync('forge', ['coverage', '--report', 'lcov', '--report-file', file, ...extra, ...args],
    { cwd: root, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    let tool = 'forge coverage';
    try { run([]); } catch (e) {
      if (!/stack too deep/i.test(`${e.stderr}${e.stdout}`)) throw e;
      run(['--ir-minimum']); // lines may shift slightly: via-IR with minimal optimisation
      tool += ' --ir-minimum';
    }
    return { lcov: readFileSync(file, 'utf8'), tool };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/** Coverage section for the atlas contract, or null when lcov has no record for its file. */
export function buildCoverage({ root = process.cwd(), atlas, args = [] }) {
  const { lcov, tool } = runCoverage({ root, args });
  const files = parseLcov(lcov);
  const rec = files[atlas.file] ?? Object.entries(files).find(([f]) => f.endsWith(atlas.file) || atlas.file.endsWith(f))?.[1];
  return rec ? coverageSection(rec, atlas.pieces, tool) : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.cwd(), file = join(root, 'luora-data.json');
  const data = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  if (!data.atlas) throw new Error('luora-coverage: no atlas in luora-data.json — run node luora-export.mjs first');
  data.atlas.coverage = buildCoverage({ root, atlas: data.atlas, args: process.argv.slice(2) });
  writeFileSync(file, JSON.stringify(data, null, 1));
  const c = data.atlas.coverage;
  console.log(c ? `luora: coverage ${c.lines.hit}/${c.lines.found} lines, ${c.branches.hit}/${c.branches.found} branches → luora-data.json` : 'luora: no coverage for the atlas contract');
}
