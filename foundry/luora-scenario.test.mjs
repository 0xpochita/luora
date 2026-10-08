// node --test luora-scenario.test.mjs   (no forge needed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scenarioPaths } from './luora-scenario.mjs';

test('finds an exported test by path or in Downloads, targets test/scenarios/', () => {
  const root = mkdtempSync(join(tmpdir(), 'luora-sc-'));
  const dl = join(root, 'dl');
  mkdirSync(dl);
  writeFileSync(join(dl, 'ScenarioX.t.sol'), '//');
  const byName = scenarioPaths('ScenarioX.t.sol', root, dl);
  assert.equal(byName.from, join(dl, 'ScenarioX.t.sol'));
  assert.equal(byName.to, join(root, 'test/scenarios/ScenarioX.t.sol'));
  assert.equal(byName.rel, 'test/scenarios/ScenarioX.t.sol');
  assert.equal(scenarioPaths(join(dl, 'ScenarioX.t.sol'), root, '/nope').from, join(dl, 'ScenarioX.t.sol'));
  assert.equal(scenarioPaths('Missing.t.sol', root, dl), null);
  assert.equal(scenarioPaths('notes.md', root, dl), null);
});
