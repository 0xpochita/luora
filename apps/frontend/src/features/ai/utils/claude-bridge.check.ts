// node --experimental-strip-types src/features/ai/utils/claude-bridge.check.ts
import assert from "node:assert/strict";
import {
  claudeArgs,
  MAX_MESSAGES,
  parseBody,
  parseLine,
  promptOf,
  refuse,
  sse,
} from "./claude-bridge.ts";
import { textOf } from "./provider.ts";

// arguments: print mode, no tools / MCP / settings / session, our system prompt, never --bare
const args = claudeArgs("SYS", "sonnet");
assert.equal(args[0], "-p");
assert.equal(args[args.indexOf("--tools") + 1], "");
assert.equal(args[args.indexOf("--setting-sources") + 1], "");
assert.ok(args.includes("--strict-mcp-config"));
assert.ok(args.includes("--no-session-persistence"));
assert.equal(args[args.indexOf("--system-prompt") + 1], "SYS");
assert.equal(args[args.indexOf("--model") + 1], "sonnet");
assert.ok(!args.includes("--bare"), "--bare would skip the subscription login");
assert.ok(
  !claudeArgs("S", "x; rm -rf /").includes("--model"),
  "odd model names are dropped",
);

// prompt: one question as is; a follow-up carries the conversation so far
assert.equal(promptOf([{ role: "user", content: "q" }]), "q");
const p = promptOf([
  { role: "user", content: "a" },
  { role: "assistant", content: "b" },
  { role: "user", content: "c" },
]);
assert.match(
  p,
  /^<conversation_so_far>\n<user>\na\n<\/user>\n<assistant>\nb\n<\/assistant>\n<\/conversation_so_far>\n\nc$/,
);

// body
assert.equal(typeof parseBody({}), "string");
assert.equal(
  typeof parseBody({ messages: [{ role: "system", content: "x" }] }),
  "string",
);
assert.equal(
  typeof parseBody({ messages: [{ role: "assistant", content: "x" }] }),
  "string",
);
assert.equal(
  typeof parseBody({
    messages: Array(MAX_MESSAGES + 1).fill({ role: "user", content: "x" }),
  }),
  "string",
);
const ok = parseBody({
  messages: [{ role: "user", content: "x" }],
  stream: false,
});
assert.ok(typeof ok !== "string" && ok.stream === false);

// stream-json lines (shapes from `claude -p --output-format stream-json --include-partial-messages`)
assert.deepEqual(
  parseLine('{"type":"system","subtype":"init","apiKeySource":"none"}'),
  { auth: "subscription" },
);
assert.deepEqual(
  parseLine(
    '{"type":"system","subtype":"init","apiKeySource":"ANTHROPIC_API_KEY"}',
  ),
  { auth: "api key" },
);
assert.deepEqual(
  parseLine(
    '{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"4."}}}',
  ),
  { text: "4." },
);
assert.deepEqual(
  parseLine('{"type":"result","is_error":true,"result":"Not logged in"}'),
  { error: "Not logged in" },
);
assert.equal(
  parseLine('{"type":"result","is_error":false,"result":"ok"}'),
  null,
);
assert.equal(parseLine("not json"), null);

// what the browser reads back is the shape the other providers already use
assert.equal(textOf(sse({ text: "hi" }).slice(6).trim()), "hi");
assert.throws(() => textOf(sse({ error: "nope" }).slice(6).trim()), /nope/);

// guard: this app on this machine only
const req = {
  host: "localhost:3000",
  origin: "http://localhost:3000",
  fetchSite: "same-origin",
  hosted: false,
  method: "POST",
};
assert.equal(refuse(req), null);
assert.equal(
  refuse({ ...req, host: "127.0.0.1:3031", origin: "http://127.0.0.1:3031" }),
  null,
);
assert.equal(
  refuse({ ...req, host: "[::1]:3000", origin: "http://[::1]:3000" }),
  null,
);
assert.ok(
  refuse({ ...req, origin: "https://evil.example" }),
  "another website",
);
assert.ok(
  refuse({
    ...req,
    host: "evil.example:3000",
    origin: "http://evil.example:3000",
  }),
  "DNS rebinding",
);
assert.ok(refuse({ ...req, origin: null }), "a POST without Origin");
assert.ok(refuse({ ...req, fetchSite: "cross-site" }), "cross-site fetch");
assert.ok(refuse({ ...req, hosted: true }), "hosted deployment");
assert.equal(
  refuse({ ...req, method: "GET", origin: null, fetchSite: null }),
  null,
  "status from the same tab",
);

console.log("claude bridge ok");
