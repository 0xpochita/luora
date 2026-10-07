// node --test luora-findings.test.mjs   (needs forge on PATH; imports the recorded reports/ for src/LuoraVault.sol)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAtlas } from './luora-atlas.mjs';
import { loadReports, mergeFindings, parseAderyn, parseSlither, reportFiles } from './luora-findings.mjs';

test('parsers read the documented report shapes', () => {
  const [s] = parseSlither({ success: true, results: { detectors: [{ check: 'unchecked-transfer', impact: 'High', confidence: 'Medium', description: 'X.f() (src/A.sol#3-5) ignores return value by t.transfer(a,b) (src/A.sol#4)\n',
    elements: [{ type: 'function', name: 'f', source_mapping: { filename_relative: 'src/A.sol', lines: [3, 4, 5] } }, { type: 'node', name: 't.transfer(a,b)', source_mapping: { filename_relative: 'src/A.sol', lines: [4] } }] }] } });
  assert.deepEqual([s.risk, s.confidence, s.lines, s.text], ['high', 'med', [4], 'X.f() ignores return value by t.transfer(a,b)']);
  const a = parseAderyn({ high_issues: { issues: [{ title: 'T', description: 'D', detector_name: 'reentrancy-state-change', instances: [{ contract_path: 'src/A.sol', line_no: 9, hint: 'State is changed at: `bal[x] -= y`' }] }] }, low_issues: { issues: [] } });
  assert.deepEqual([a[0].risk, a[0].lines, a[0].vars], ['high', [9], ['bal']]);
});

test('slither + aderyn + atlas checks merge into one finding list for LuoraVault', () => {
  const atlas = mergeFindings(buildAtlas({ contract: 'LuoraVault' }), loadReports(reportFiles(process.cwd())));
  const by = Object.fromEntries(atlas.pieces.map(p => [p.id, p]));
  const findings = atlas.pieces.filter(p => p.sys === 'vulns');
  const tools = f => [...new Set(f.reports.map(r => r.tool))].sort().join('+');
  const on = (host, re) => findings.filter(f => atlas.lesion[f.id] === host && re.test(f.name));

  // the same reentrancy in withdraw: one finding carrying all three sources, worst severity wins
  const [re] = on('withdraw', /after external call/);
  assert.equal(on('withdraw', /reentrancy|after external call/i).length, 1);
  assert.equal(tools(re), 'aderyn+manual+slither');
  assert.equal(re.risk, 'high');
  assert.ok(re.links.includes('shares') && re.links.includes('c_asset_transfer'));
  // unchecked transfer in deposit: slither unchecked-transfer + aderyn unchecked-return / unsafe-erc20-operation
  const [uc] = on('deposit', /Unchecked return/);
  assert.equal(tools(uc), 'aderyn+slither');
  assert.equal(uc.detector, 'unchecked-transfer');
  assert.equal(uc.confidence, 'med');
  assert.ok(uc.mark.includes(75 - 1 - uc.line));
  // gas / style issues are grouped per contract
  const imm = findings.filter(f => /immutable/.test(f.name));
  assert.equal(imm.length, 1);
  assert.deepEqual(['asset', 'keeper', 'owner', 'rewardToken', 'router', 'strategy'].filter(s => imm[0].links.includes(s)).length, 6);
  // only the selected contract's file; mocks are out of scope
  assert.ok(!findings.some(f => /Mock/.test(f.desc)));
  // every finding: severity, tool, defensive fix, valid links, stable unique id, numbered worst first
  const SEV = ['high', 'med', 'low', 'info'];
  assert.equal(new Set(findings.map(f => f.id)).size, findings.length);
  findings.forEach((f, i) => {
    assert.ok(SEV.includes(f.risk) && ['slither', 'aderyn', 'manual'].includes(f.tool) && f.detector, f.id);
    assert.match(f.desc, /Fix: /);
    assert.ok(f.name.startsWith(`F-${String(i + 1).padStart(2, '0')} `));
    if (i) assert.ok(SEV.indexOf(findings[i - 1].risk) <= SEV.indexOf(f.risk));
    for (const l of f.links) assert.ok(by[l], `${f.id} → ${l}`);
    for (const m of f.mark) assert.ok(m >= 0 && m < f.n, `${f.id} mark ${m}`);
  });
  assert.ok(findings.some(f => f.tool === 'manual' && /No reentrancy guard/.test(f.name)));
});
