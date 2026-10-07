// node --test luora-atlas.test.mjs   (needs forge on PATH; maps src/LuoraVault.sol)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAtlas } from './luora-atlas.mjs';

test('atlas reflects LuoraVault.sol', () => {
  const a = buildAtlas({ contract: 'LuoraVault' });
  const by = Object.fromEntries(a.pieces.map(p => [p.id, p]));
  assert.deepEqual(a.entry, ['deposit', 'withdraw', 'harvest', 'setOracle', 'pause']);
  assert.equal(by.setOracle.caller, 'owner');
  assert.equal(by.pause.caller, 'keeper');
  assert.equal(by.deposit.caller, 'anyone');
  assert.equal(by.shares.slot, 6);
  assert.equal(by.shares.mapping, true);
  assert.equal(by.feeBps.slot, 8);
  assert.equal(a.source.split('\n')[by.withdraw.line].trim(), by.withdraw.find);
  assert.ok(by.withdraw.find.startsWith('function withdraw'));
  // withdraw: modifier read, external call, then the share writes, then the event
  assert.deepEqual(a.seq.withdraw.filter(([k]) => k !== 'r'), [['c', 'c_oracle_getPrice'], ['c', 'c_asset_transfer'], ['w', 'shares'], ['w', 'totalShares'], ['e', 'evWithdraw']]);
  assert.equal(a.callTarget.c_asset_transfer, 'dep_IERC20');
  const findings = a.pieces.filter(p => p.sys === 'vulns');
  assert.ok(findings.some(f => f.links.includes('withdraw') && f.name.includes('after external call')));
  assert.ok(!findings.some(f => f.links.includes('setOracle') && f.name.includes('after external call')));
  assert.ok(findings.some(f => f.name.includes('Unchecked ERC20') && f.links.includes('c_asset_transfer')));
  assert.ok(findings.every(f => a.lesion[f.id] && by[a.lesion[f.id]] && /Fix:/.test(f.desc)));
  for (const p of a.pieces) for (const l of p.links ?? []) assert.ok(by[l], `${p.id} → ${l}`);
});
