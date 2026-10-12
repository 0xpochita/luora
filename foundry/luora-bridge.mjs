#!/usr/bin/env node
// Luora bridge: lets the hosted Luora (https://www.luorasec.xyz) run this Foundry project's tests
// on this machine. Start it in the project root, next to luora-export.mjs, and open the link it
// prints; Trace's Start test, Test all and Reload trace then work from the browser.
//
//   node luora-bridge.mjs [--port 7457] [--app https://my-luora.example]
//
// What a web page can do through it, and nothing else:
//   GET  /health     the project's folder name, whether luora-export.mjs / luora-data.json exist
//   GET  /data       this folder's luora-data.json
//   GET  /scenarios  luora-scenarios.json (scenarios an AI client proposed over MCP)
//   POST /run        `node luora-export.mjs`, the local run or one listed testnet fork, all tests
//                    or chosen ones by name (the same rules as the app's own Start test), its
//                    output streamed back as NDJSON, then the fresh luora-data.json
// Every request needs the token from the printed link (it rides in the link's #fragment, which a
// browser never sends to any server). Only 127.0.0.1 listens, only a loopback Host is answered
// (DNS rebinding), and only the Luora app's origins get CORS. No command, flag or path ever comes
// from the page. Ctrl+C stops it.
import { spawn } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CHAINS } from './luora-chains.mjs';

/** where the hosted Luora lives; --app adds another origin (a self-hosted copy) */
export const APPS = ['https://www.luorasec.xyz', 'https://luorasec.xyz'];
export const PORT = 7457;
const TIMEOUT_MS = 15 * 60_000;
const MAX_LINE = 400;
const MAX_LINES = 1500;
const MAX_BODY = 64 * 1024;

// ---------- what the page may ask for (same rules as apps/frontend/src/features/run/utils/test-run.ts) ----------

const IDENT = /^[A-Za-z_$][\w$]{0,127}$/;
const fnName = name => name.split('(')[0];
const anyOf = (names, end) => `^(${[...new Set(names)].map(n => n.replace(/\$/g, '\\$')).join('|')})${end}`;

/** The exporter's arguments for a /run body, or why it is refused. Names only, never a flag or a path. */
export function exportArgs(body) {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) return 'Send a JSON object.';
  const { fork, tests } = body;
  const args = [];
  if (fork != null && fork !== '') {
    if (typeof fork !== 'string' || !Object.hasOwn(CHAINS, fork)) return 'Unknown fork.';
    args.push('--forks', fork);
  }
  if (tests != null) {
    if (!Array.isArray(tests) || !tests.length || tests.length > 500) return 'Choose between 1 and 500 tests.';
    const picked = [];
    for (const t of tests) {
      const { suite, name } = t ?? {};
      if (typeof suite !== 'string' || typeof name !== 'string' || !IDENT.test(suite) || !IDENT.test(fnName(name)))
        return 'Tests are named by their contract and function.';
      picked.push({ suite, name: fnName(name) });
    }
    args.push('--mc', anyOf(picked.map(t => t.suite), '$'), '--mt', anyOf(picked.map(t => t.name), '\\('));
  }
  return args;
}

const same = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Why a request may not use the bridge, or null. */
export function refuse({ host, origin, auth, port, token, apps }) {
  const h = String(host ?? '').toLowerCase();
  if (h !== `127.0.0.1:${port}` && h !== `localhost:${port}`) return 'Not a loopback host.';
  if (origin && !apps.includes(origin)) return 'This site may not use the Luora bridge.';
  if (!String(auth ?? '').startsWith('Bearer ') || !same(auth.slice(7), token)) return 'Wrong or missing bridge token: open the link the bridge printed.';
  return null;
}

/** The link to print: the app's Trace with the port and the token in its #fragment. */
export const linkOf = (app, port, token) => `${app}/trace#bridge=${port}.${token}`;

// ---------- the server ----------

export function serve({ cwd, port, token, apps }) {
  let running = null;
  const stop = child => {
    if (child.exitCode != null || child.signalCode != null) return;
    try {
      if (child.pid) process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill();
    }
  };

  return createServer(async (req, res) => {
    const origin = req.headers.origin;
    const cors = origin && apps.includes(origin)
      ? { 'access-control-allow-origin': origin, vary: 'Origin' }
      : {};
    const json = (status, body) => {
      res.writeHead(status, { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify(body));
    };
    // CORS preflight (and Chrome's private network preflight): only for the app's origins
    if (req.method === 'OPTIONS') {
      if (!cors['access-control-allow-origin']) return json(403, { error: 'This site may not use the Luora bridge.' });
      res.writeHead(204, {
        ...cors,
        'access-control-allow-methods': 'GET, POST',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-max-age': '600',
        ...(req.headers['access-control-request-private-network'] ? { 'access-control-allow-private-network': 'true' } : {}),
      });
      return res.end();
    }
    const why = refuse({ host: req.headers.host, origin, auth: req.headers.authorization, port, token, apps });
    if (why) return json(403, { error: why });

    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const dataFile = join(cwd, 'luora-data.json');
    if (req.method === 'GET' && url.pathname === '/health')
      return json(200, { ok: true, project: basename(cwd), exporter: existsSync(join(cwd, 'luora-export.mjs')), data: existsSync(dataFile), running: !!running });
    if (req.method === 'GET' && url.pathname === '/data') {
      const file = await readFile(dataFile, 'utf8').catch(() => null);
      if (file == null) return json(404, { error: 'No luora-data.json here yet: press Start test, or run node luora-export.mjs.' });
      res.writeHead(200, { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(file);
    }
    if (req.method === 'GET' && url.pathname === '/scenarios') {
      const list = await readFile(join(cwd, 'luora-scenarios.json'), 'utf8').then(JSON.parse).catch(() => []);
      return json(200, Array.isArray(list) ? list : []);
    }
    if (req.method !== 'POST' || url.pathname !== '/run') return json(404, { error: 'Not found.' });

    // ---------- POST /run: the exporter, streamed ----------
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > MAX_BODY) return json(413, { error: 'Request too large.' });
    }
    let body = null;
    try {
      body = JSON.parse(raw || 'null');
    } catch {}
    const args = exportArgs(body);
    if (typeof args === 'string') return json(400, { error: args });
    if (running) return json(429, { error: 'A test run is already going. Wait for it, or stop it.' });
    if (!existsSync(join(cwd, 'luora-export.mjs')))
      return json(404, { error: `No luora-export.mjs in ${cwd}. Start the bridge in your Foundry project, next to the exporter.` });

    const { NODE_OPTIONS: _, ...env } = process.env;
    const child = spawn(process.execPath, ['luora-export.mjs', ...args], {
      cwd,
      env: { ...env, LUORA_PROGRESS: '1', LUORA_MERGE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
    running = child;
    const started = Date.now();
    const what = body?.tests ? `${body.tests.length} test${body.tests.length === 1 ? '' : 's'}` : 'all tests';
    console.log(`luora-bridge: run ${what}${body?.fork ? ` on ${body.fork}` : ''}`);
    res.writeHead(200, { ...cors, 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' });
    const send = e => {
      if (!res.writableEnded) res.write(`${JSON.stringify(e)}\n`);
    };
    const timer = setTimeout(() => stop(child), TIMEOUT_MS);
    // a closed tab or Stop (the page aborts its fetch) ends the exporter and its forge processes
    res.on('close', () => {
      if (!res.writableFinished) stop(child);
    });

    let lines = 0;
    let firstError = '';
    const pipe = (stream, warn) => {
      let buf = '';
      stream.setEncoding('utf8');
      stream.on('data', chunk => {
        buf += chunk;
        const parts = buf.split('\n');
        buf = (parts.pop() ?? '').slice(-262_144);
        for (const line of parts) {
          const log = line.trimEnd();
          if (!log) continue;
          if (!warn && log.startsWith('luora:: ')) {
            try {
              send({ progress: JSON.parse(log.slice(8)) });
            } catch {}
            continue;
          }
          if (warn && !firstError && /failed|Error\b/.test(log)) firstError = log.slice(0, MAX_LINE);
          if (++lines > MAX_LINES) continue;
          send({ log: log.length > MAX_LINE ? `${log.slice(0, MAX_LINE)} …` : log, ...(warn ? { warn } : {}), at: Math.round((Date.now() - started) / 1000) });
        }
      });
    };
    pipe(child.stdout, false);
    pipe(child.stderr, true);
    let ended = false;
    const end = async (code, failed) => {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      running = null;
      const file = code === 0 && !failed ? await readFile(dataFile, 'utf8').catch(() => undefined) : undefined;
      const error = file
        ? undefined
        : failed ?? (code == null ? 'Stopped.' : code === 0 ? 'The run finished but luora-data.json could not be read.' : firstError || `The exporter stopped (exit ${code}).`);
      console.log(`luora-bridge: run ${file ? 'done' : `ended: ${error}`}`);
      send({ done: true, code, ...(file ? { file } : { error }) });
      res.end();
    };
    child.on('error', e => end(null, e.message));
    child.on('close', code => end(code));
  });
}

// ---------- CLI ----------

function main() {
  const argv = process.argv.slice(2);
  const opt = name => {
    const i = argv.findIndex(a => a === `--${name}` || a.startsWith(`--${name}=`));
    if (i < 0) return undefined;
    return argv[i].includes('=') ? argv[i].split('=').slice(1).join('=') : argv[i + 1];
  };
  const cwd = process.cwd();
  const apps = [...APPS];
  const extra = opt('app');
  if (extra) {
    let origin;
    try {
      origin = new URL(extra).origin;
    } catch {}
    if (!origin || origin === 'null') {
      console.error(`luora-bridge: --app must be a URL, like https://my-luora.example (got ${extra})`);
      process.exit(1);
    }
    apps.unshift(origin);
  }
  if (!existsSync(join(cwd, 'luora-export.mjs'))) {
    console.error('luora-bridge: no luora-export.mjs here. Start the bridge in your Foundry project root, where you downloaded the exporter.');
    process.exit(1);
  }
  const token = randomBytes(24).toString('base64url');
  let port = Number(opt('port') ?? PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    console.error('luora-bridge: --port must be a number between 1024 and 65535');
    process.exit(1);
  }
  const first = port;
  const listen = () => {
    const server = serve({ cwd, port, token, apps });
    server.once('error', e => {
      if (e.code === 'EADDRINUSE' && port < first + 10) {
        port += 1;
        return listen();
      }
      console.error(`luora-bridge: could not listen on 127.0.0.1:${port} (${e.message})`);
      process.exit(1);
    });
    server.listen(port, '127.0.0.1', () => {
      console.log(`\nLuora bridge · ${basename(cwd)}\n`);
      console.log('Open this link in Chrome, Brave, Edge or Firefox (keep this window open):\n');
      console.log(`  ${linkOf(apps[0], port, token)}\n`);
      console.log('If the browser asks to let the site reach this computer or local network, allow it.');
      console.log('Only that link can use the bridge. It runs node luora-export.mjs in this folder, nothing else.');
      console.log('Ctrl+C stops it.\n');
    });
  };
  listen();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
