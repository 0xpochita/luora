// node --test luora-coverage.test.mjs   (no forge needed: lcov excerpt from `forge coverage` on LuoraVault)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coverageSection, parseLcov } from './luora-coverage.mjs';

const LCOV = `TN:
SF:src/Other.sol
DA:1,5
end_of_record
TN:
SF:src/LuoraVault.sol
DA:51,1
FN:51,LuoraVault.onlyOwner
FNDA:1,LuoraVault.onlyOwner
DA:52,1
BRDA:52,1,0,1
BRDA:52,1,1,-
DA:73,3
FN:73,LuoraVault.deposit
FNDA:3,LuoraVault.deposit
DA:74,3
DA:75,2
DA:108,1
FN:108,LuoraVault.setOracle
FNDA:1,LuoraVault.setOracle
DA:109,0
FNF:3
FNH:3
LF:7
LH:6
BRF:2
BRH:1
end_of_record
`;

test('lcov is parsed per file with 1-based lines', () => {
  const files = parseLcov(LCOV);
  assert.deepEqual(Object.keys(files), ['src/Other.sol', 'src/LuoraVault.sol']);
  const v = files['src/LuoraVault.sol'];
  assert.equal(v.da.get(109), 0);
  assert.deepEqual(v.brda.get(52), [1, null]);
  assert.deepEqual(v.fn.get('LuoraVault.deposit'), { line: 73, calls: 3 });
  assert.equal(v.totals.LF, 7);
});

test('coverage folds onto pieces by 0-based anchor, measuring function bodies', () => {
  const rec = parseLcov(LCOV)['src/LuoraVault.sol'];
  const pieces = [
    { id: 'onlyOwner', sys: 'access', line: 50, n: 4 },
    { id: 'deposit', sys: 'entry', line: 72, n: 7 },
    { id: 'setOracle', sys: 'entry', line: 107, n: 3 },
    { id: 'shares', sys: 'storage', line: 36 },
    { id: 'f1', sys: 'vulns', line: 72, n: 7 },
    { id: 'noReentrancy', sys: 'access', ghost: true, line: 72 },
  ];
  const c = coverageSection(rec, pieces);
  assert.deepEqual(c.lines, { hit: 6, found: 7 });
  assert.deepEqual(c.branches, { hit: 1, found: 2 });
  assert.equal(c.hits[108], 0);
  assert.deepEqual(c.branchHits[51], [1, null]);
  assert.deepEqual(c.pieces.deposit, { lines: { hit: 2, found: 2 }, branches: { hit: 0, found: 0 }, calls: 3 });
  // called, but only on the revert path: the body never ran
  assert.deepEqual(c.pieces.setOracle, { lines: { hit: 0, found: 1 }, branches: { hit: 0, found: 0 }, calls: 1 });
  assert.deepEqual(c.pieces.onlyOwner.branches, { hit: 1, found: 2 });
  assert.deepEqual(Object.keys(c.pieces), ['onlyOwner', 'deposit', 'setOracle']);
});
