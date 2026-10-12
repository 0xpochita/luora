// node --test luora-bridge.test.mjs — the bridge's guard and argument rules, then one real round
// trip: a fake exporter in a temp folder, /run streamed over HTTP the way the app reads it.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { APPS, exportArgs, linkOf, refuse, serve } from './luora-bridge.mjs';

test('exportArgs: names only, never a flag or a path', () => {
  assert.deepEqual(exportArgs({}), []);
  assert.deepEqual(exportArgs({ fork: 'base-sepolia' }), ['--forks', 'base-sepolia']);
  assert.equal(exportArgs({ fork: 'mainnet' }), 'Unknown fork.');
  assert.equal(exportArgs({ fork: '--rpc-url=http://evil' }), 'Unknown fork.');
  assert.deepEqual(exportArgs({ tests: [{ suite: 'VaultTest', name: 'test_deposit()' }] }), ['--mc', '^(VaultTest)$', '--mt', '^(test_deposit)\\(']);
  assert.equal(exportArgs({ tests: [{ suite: 'VaultTest', name: 'x; rm -rf /' }] }), 'Tests are named by their contract and function.');
  assert.equal(exportArgs({ tests: [{ suite: '../../etc', name: 'test_x' }] }), 'Tests are named by their contract and function.');
  assert.equal(exportArgs({ tests: [] }), 'Choose between 1 and 500 tests.');
  assert.equal(exportArgs(null), 'Send a JSON object.');
  assert.equal(exportArgs([]), 'Send a JSON object.');
});

test('refuse: loopback host, the app origin, the token', () => {
  const ok = { host: '127.0.0.1:7457', origin: APPS[0], auth: 'Bearer t0k', port: 7457, token: 't0k', apps: APPS };
  assert.equal(refuse(ok), null);
  assert.equal(refuse({ ...ok, host: 'localhost:7457' }), null);
  assert.equal(refuse({ ...ok, origin: undefined }), null); // a local tool without Origin still needs the token
  assert.match(refuse({ ...ok, host: 'evil.example:7457' }), /loopback/); // DNS rebinding
  assert.match(refuse({ ...ok, origin: 'https://evil.example' }), /may not use/);
  assert.match(refuse({ ...ok, auth: 'Bearer nope' }), /token/);
  assert.match(refuse({ ...ok, auth: undefined }), /token/);
});

test('linkOf: the token rides in the #fragment', () => {
  assert.equal(linkOf('https://www.luorasec.xyz', 7457, 'abc'), 'https://www.luorasec.xyz/trace#bridge=7457.abc');
});

test('serve: health, data, CORS and a streamed run', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'luora-bridge-'));
  // a stand-in exporter: one progress line, one log line, then the file
  writeFileSync(
    join(cwd, 'luora-export.mjs'),
    `import { writeFileSync } from 'node:fs';
console.log('luora: building');
console.log('luora:: ' + JSON.stringify({ run: 'local', plan: [{ suite: 'T', name: 'test_a()' }] }));
writeFileSync('luora-data.json', JSON.stringify({ args: process.argv.slice(2) }));`,
  );
  const token = 'secret-token';
  const port = 17457 + Math.floor(Math.random() * 1000);
  const server = serve({ cwd, port, token, apps: APPS });
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  const base = `http://127.0.0.1:${port}`;
  const auth = { authorization: `Bearer ${token}`, origin: APPS[0] };
  try {
    assert.equal((await fetch(`${base}/health`)).status, 403);
    const h = await fetch(`${base}/health`, { headers: auth });
    assert.equal(h.headers.get('access-control-allow-origin'), APPS[0]);
    assert.deepEqual(await h.json(), { ok: true, project: cwd.split('/').pop(), exporter: true, data: false, running: false });
    assert.equal((await fetch(`${base}/data`, { headers: auth })).status, 404);

    const pre = await fetch(`${base}/run`, { method: 'OPTIONS', headers: { origin: APPS[0], 'access-control-request-private-network': 'true' } });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-private-network'), 'true');
    assert.equal((await fetch(`${base}/run`, { method: 'OPTIONS', headers: { origin: 'https://evil.example' } })).status, 403);
    assert.equal((await fetch(`${base}/run`, { method: 'POST', headers: auth, body: '{"fork":"mainnet"}' })).status, 400);

    const run = await fetch(`${base}/run`, { method: 'POST', headers: auth, body: JSON.stringify({ tests: [{ suite: 'T', name: 'test_a()' }] }) });
    const events = (await run.text()).trim().split('\n').map(l => JSON.parse(l));
    assert.deepEqual(events.find(e => e.progress)?.progress, { run: 'local', plan: [{ suite: 'T', name: 'test_a()' }] });
    assert.equal(events.find(e => e.log)?.log, 'luora: building');
    const done = events.at(-1);
    assert.equal(done.done, true);
    assert.equal(done.code, 0);
    assert.deepEqual(JSON.parse(done.file).args, ['--mc', '^(T)$', '--mt', '^(test_a)\\(']);
    assert.equal((await fetch(`${base}/data`, { headers: auth })).status, 200);
  } finally {
    server.close();
  }
});
