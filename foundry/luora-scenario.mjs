#!/usr/bin/env node
// Luora scenario runner: takes a Foundry test exported from the /atlas Lab (Export ↓), copies it to
// test/scenarios/ and runs just that file with `forge test --match-path`, printing pass / fail.
// Scenarios test INTENDED behaviour, so a failing assertion is a finding (the Lab shows the fix).
//
//   node luora-scenario.mjs ~/Downloads/ScenarioNonOwnerCannotSetOracle.t.sol
//   node luora-scenario.mjs ScenarioNonOwnerCannotSetOracle.t.sol   # also looks in ~/Downloads
//
// No dependencies; needs `forge` on PATH.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Where an exported test comes from and where it goes; null when it is not a .t.sol file. */
export function scenarioPaths(arg, root = process.cwd(), downloads = join(homedir(), 'Downloads')) {
  if (!arg?.endsWith('.t.sol')) return null;
  const from = [resolve(arg), join(downloads, basename(arg)), join(root, 'test/scenarios', basename(arg))].find(existsSync);
  return from ? { from, to: join(root, 'test/scenarios', basename(arg)), rel: `test/scenarios/${basename(arg)}` } : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('usage: node luora-scenario.mjs <Scenario….t.sol> [...]');
    process.exit(2);
  }
  let failed = 0;
  for (const f of files) {
    const p = scenarioPaths(f);
    if (!p) {
      console.error(`luora-scenario: ${f} not found (expects a .t.sol exported from the Lab)`);
      failed++;
      continue;
    }
    mkdirSync(join(process.cwd(), 'test/scenarios'), { recursive: true });
    if (resolve(p.from) !== resolve(p.to)) copyFileSync(p.from, p.to);
    const r = spawnSync('forge', ['test', '--match-path', p.rel, '-vv'], { stdio: 'inherit' });
    const ok = r.status === 0;
    if (!ok) failed++;
    console.log(ok
      ? `luora-scenario: PASS  ${p.rel} — the intended behaviour holds`
      : `luora-scenario: FAIL  ${p.rel} — a failing assertion is a finding; see the Lab run for the fix`);
  }
  process.exit(failed ? 1 : 0);
}
