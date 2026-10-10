// node --test luora-mcp.test.mjs   (no forge needed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleLine, labModel, scenarioErrors, TOOLS } from './luora-mcp.mjs';

const source = `contract Vault {
    IERC20 public asset;
    address public owner;
    bool public paused;
    uint256 public totalShares;
    mapping(address => uint256) public shares;
    modifier onlyOwner() {
        require(msg.sender == owner, "!owner");
        _;
    }
    function deposit(uint256 amount) external {
        require(!paused, "paused");
        asset.transferFrom(msg.sender, address(this), amount);
        shares[msg.sender] += amount;
        totalShares += amount;
    }
    function pause() external onlyOwner {
        paused = true;
    }
}`;
const lines = source.split('\n');
const at = s => lines.findIndex(l => l.includes(s));
const P = (id, sys, name, find, x = {}) => ({ id, sys, name, find, desc: '', line: at(find), ...x });
const atlas = {
  contract: 'Vault', file: 'src/Vault.sol', compiler: '0.8.30', source,
  pieces: [
    P('deposit', 'entry', 'deposit()', 'function deposit(', { n: 6, caller: 'anyone' }),
    P('pause', 'entry', 'pause()', 'function pause(', { n: 3, caller: 'owner' }),
    P('onlyOwner', 'access', 'onlyOwner', 'modifier onlyOwner', { n: 4 }),
    P('asset', 'storage', 'slot 0 · asset', 'IERC20 public asset', { slot: 0 }),
    P('paused', 'storage', 'slot 1 · paused', 'bool public paused', { slot: 1 }),
    P('totalShares', 'storage', 'slot 2 · totalShares', 'uint256 public totalShares', { slot: 2 }),
    P('shares', 'storage', 'slot 3 · shares[]', 'mapping(address => uint256) public shares', { slot: 3, mapping: true }),
    P('f1', 'vulns', 'F-01 State written after external call', 'function deposit(', { risk: 'high', tool: 'slither', links: ['deposit'] }),
  ],
  lesion: { f1: 'deposit' },
  seq: { deposit: [['r', 'paused'], ['c', 'c_asset'], ['w', 'shares'], ['w', 'totalShares']], pause: [['w', 'paused']] },
  callTarget: {}, banks: [], entry: ['deposit', 'pause'], internal: [],
};
const run = { generatedAt: 'now', forgeVersion: 'forge 1', tests: [{ name: 'test_deposit()', suite: 'VaultTest', status: 'Success', reason: null, transfers: [], frames: [{ d: 0, kind: 'CALL', contract: 'VaultTest', fn: 'test_deposit', args: 'x'.repeat(1000), ret: '', ok: true, lines: { 'test/V.t.sol': [3, 4, 5, 9] }, storage: [{ op: 'SLOAD' }, { op: 'SSTORE' }] }] }], atlas };

const W = (a, ap, b, bp) => ({ from: { node: a, port: ap }, to: { node: b, port: bp } });
const pauseBlocks = () => ({
  name: 'Pause blocks deposit',
  nodes: [
    { id: 'o', kind: 'actor', label: 'admin', role: 'owner', balance: '0' },
    { id: 'alice', kind: 'actor', label: 'alice', role: 'user', balance: '1,000' },
    { id: 'amt', kind: 'const', value: '100' },
    { id: 'p', kind: 'call', fn: 'pause' },
    { id: 'd', kind: 'call', fn: 'deposit' },
    { id: 'e', kind: 'expect', reason: 'paused' },
    { id: 'chk', kind: 'assert', check: { type: 'paused', fn: 'deposit' } },
    { id: 'snap', kind: 'snapshot', of: 'totalShares' },
  ],
  wires: [
    W('o', 'addr', 'p', 'caller'), W('p', 'then', 'd', 'then'), W('alice', 'addr', 'd', 'caller'),
    W('amt', 'value', 'd', 'a0'), W('d', 'r:paused', 'e', 'call'), W('d', 'then', 'chk', 'then'),
    W('chk', 'then', 'snap', 'then'), W('d', 'w:totalShares', 'snap', 'slot'),
  ],
});
const m = labModel(atlas);

test('model: roles, assert checks and ports come from the atlas', () => {
  assert.deepEqual(m.roles, ['user', 'owner']);
  assert.deepEqual(m.checks.map(c => c.check), [
    { type: 'sum' }, { type: 'solvent' }, { type: 'only', fn: 'pause' }, { type: 'paused', fn: 'deposit' },
    { type: 'cmp', op: '==' }, { type: 'cmp', op: '>=' }, { type: 'cmp', op: '<=' },
  ]);
  assert.deepEqual(m.reasons, ['paused', '!owner']);
  assert.deepEqual(m.callPorts('pause').outputs.map(p => p.id), ['w:paused', 'r:!owner']);
});

test('valid scenario passes', () => {
  assert.deepEqual(scenarioErrors(m, pauseBlocks()), []);
});

test('invalid scenarios are rejected with a precise reason', () => {
  const bad = (f, want) => {
    const sc = pauseBlocks();
    f(sc);
    const errs = scenarioErrors(m, sc);
    assert.ok(errs.some(e => e.includes(want)), `expected "${want}" in ${JSON.stringify(errs)}`);
  };
  bad(sc => sc.nodes.push({ id: 'x', kind: 'exploit' }), 'kind must be one of actor, const, call, expect, assert, snapshot');
  bad(sc => (sc.nodes[3].fn = 'selfdestruct'), 'fn must be an entry point: deposit, pause');
  bad(sc => (sc.nodes[0].role = 'admin'), 'role must be one of user, owner');
  bad(sc => (sc.nodes[2].value = '-5'), 'value must be a USDC amount');
  bad(sc => (sc.nodes[1].label = 'a"); vm.deal(x'), 'label must be an identifier');
  bad(sc => (sc.nodes[6].check = { type: 'only', fn: 'deposit' }), 'check must be one of');
  bad(sc => (sc.nodes[6].check = { type: 'paused', fn: 'deposit', extra: 1 }), 'check must be one of');
  bad(sc => (sc.nodes[7].of = 'secret'), 'of must be "balance" or a public slot');
  bad(sc => (sc.nodes[5].reason = 'nope'), 'reason must be "" (taken from the wire) or one of');
  bad(sc => (sc.nodes[3].calldata = '0x'), 'unknown field "calldata" for a call node');
  bad(sc => (sc.code = 'vm.prank'), 'unknown scenario field "code"');
  bad(sc => (sc.name = 'ok\n} function attack() {'), 'name must be one line');
  bad(sc => sc.nodes.push({ ...sc.nodes[2] }), 'duplicate id');
  bad(sc => sc.wires.push(W('amt', 'value', 'd', 'caller')), 'amount › actor');
  bad(sc => sc.wires.push(W('amt', 'value', 'd', 'a9')), 'd has no input "a9" (has then, caller, a0)');
  bad(sc => sc.wires.push(W('alice', 'addr', 'p', 'caller')), 'p.caller is already wired');
  bad(sc => sc.wires.push(W('snap', 'then', 'p', 'then')), 'loop');
  bad(sc => sc.wires.push(W('ghost', 'addr', 'p', 'caller')), 'no such node');
  assert.deepEqual(scenarioErrors(m, 'x'), ['scenario must be an object { name, nodes, wires }']);
});

const rpc = (line, data) => JSON.parse(handleLine(typeof line === 'string' ? line : JSON.stringify(line), data));
const call = (data, name, args = {}, id = 9) => rpc({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }, data);

test('JSON-RPC framing: initialize, notifications, errors, tools/list', () => {
  const init = rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't' } } }, 'x');
  assert.equal(init.id, 1);
  assert.equal(init.result.protocolVersion, '2025-06-18');
  assert.deepEqual(init.result.capabilities, { tools: {} });
  assert.equal(rpc({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } }, 'x').result.protocolVersion, '2025-06-18');
  assert.equal(handleLine('{"jsonrpc":"2.0","method":"notifications/initialized"}', 'x'), null);
  assert.equal(handleLine('   ', 'x'), null);
  assert.equal(rpc('{oops', 'x').error.code, -32700);
  assert.equal(rpc({ id: 3, method: 'ping' }, 'x').error.code, -32600);
  assert.deepEqual(rpc({ jsonrpc: '2.0', id: 4, method: 'ping' }, 'x'), { jsonrpc: '2.0', id: 4, result: {} });
  assert.equal(rpc({ jsonrpc: '2.0', id: 5, method: 'resources/list' }, 'x').error.code, -32601);
  const list = rpc({ jsonrpc: '2.0', id: 6, method: 'tools/list' }, 'x').result.tools;
  assert.deepEqual(list.map(t => t.name), ['overview', 'get_trace', 'get_atlas', 'get_piece', 'list_findings', 'propose_scenario']);
  assert.ok(list.every(t => t.description && t.inputSchema.type === 'object'));
  assert.equal(TOOLS.length, 6);
  assert.equal(rpc({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'rm_rf' } }, 'x').error.code, -32602);
  const batch = JSON.parse(handleLine(JSON.stringify([{ jsonrpc: '2.0', id: 8, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/x' }]), 'x'));
  assert.deepEqual(batch, [{ jsonrpc: '2.0', id: 8, result: {} }]);
});

test('tools read the run; propose_scenario validates and appends', () => {
  const dir = mkdtempSync(join(tmpdir(), 'luora-mcp-'));
  const data = join(dir, 'luora-data.json');
  assert.match(call(data, 'overview').result.content[0].text, /not found/);
  writeFileSync(data, JSON.stringify(run));
  const text = r => JSON.parse(r.result.content[0].text);

  const o = text(call(data, 'overview'));
  assert.equal(o.contract, 'Vault');
  assert.deepEqual(o.tests, [{ name: 'test_deposit()', suite: 'VaultTest', status: 'Success', reason: null }]);
  assert.deepEqual(o.findings, { total: 1, bySeverity: { high: 1 }, byTool: { slither: 1 } });
  assert.deepEqual(o.scenarioModel.roles, ['user', 'owner']);

  const t = text(call(data, 'get_trace', { test: 'test_deposit' }));
  assert.equal(t.frames[0].lines['test/V.t.sol'], '3-5, 9');
  assert.deepEqual(t.frames[0].storage, { SLOAD: 1, SSTORE: 1 });
  assert.ok(t.frames[0].args.length < 400);
  assert.equal(call(data, 'get_trace', { test: 'nope' }).result.isError, true);

  assert.equal(text(call(data, 'get_atlas')).pieces.length, 8);
  const p = text(call(data, 'get_piece', { id: 'deposit' }));
  assert.match(p.source, /^11 {2}\s+function deposit/);
  assert.deepEqual(p.findings.map(f => f.id), ['f1']);
  assert.deepEqual(p.reverts.map(r => r.reason), ['paused']);
  assert.equal(text(call(data, 'list_findings', { severity: 'high', tool: 'slither' })).length, 1);
  assert.equal(text(call(data, 'list_findings', { severity: 'low' })).length, 0);

  const ok = text(call(data, 'propose_scenario', { scenario: { id: 'pb', ...pauseBlocks() } }));
  assert.equal(ok.replaced, false);
  const rej = call(data, 'propose_scenario', { scenario: { ...pauseBlocks(), nodes: [{ id: 'x', kind: 'exploit' }] } });
  assert.equal(rej.result.isError, true);
  assert.match(rej.result.content[0].text, /scenario rejected:\n- node "x": kind must be one of/);
  assert.equal(text(call(data, 'propose_scenario', { scenario: { id: 'pb', ...pauseBlocks(), name: 'Pause blocks deposit v2' } })).replaced, true);
  const saved = JSON.parse(readFileSync(join(dir, 'luora-scenarios.json'), 'utf8'));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].name, 'Pause blocks deposit v2');
  assert.equal(saved[0].contract, 'Vault');
  assert.ok(saved[0].nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
});
