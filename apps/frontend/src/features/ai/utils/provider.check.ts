// node --experimental-strip-types src/features/ai/utils/provider.check.ts
import assert from "node:assert/strict";
import type { AskContext } from "../types.ts";
import {
  aiReady,
  askPrompt,
  chatRequest,
  configFor,
  isHostedUrl,
  NO_AI,
  SYSTEM_PROMPT,
  textOf,
} from "./provider.ts";

const ctx: AskContext = {
  contract: "Vault",
  file: "src/Vault.sol",
  piece: {
    name: "withdraw",
    system: "Entry points",
    desc: "Sends USDC.",
    caller: "anyone",
  },
  source: { from: 41, lines: ["function withdraw(uint256 a) external {", "}"] },
  connected: [{ name: "shares", system: "Storage" }],
  findings: [{ name: "F-1 CEI", risk: "High", desc: "Write after call." }],
  checklist: ["Who can call it?"],
};

// prompt carries the piece context and the question, nothing else
const prompt = askPrompt(ctx, "test");
assert.match(prompt, /Contract: Vault \(src\/Vault\.sol\)/);
assert.match(prompt, / {2}41 {2}function withdraw/);
assert.match(prompt, /- shares \(Storage\)/);
assert.match(prompt, /- F-1 CEI \(High\): Write after call\./);
assert.match(prompt, /pins the intended behaviour/);
assert.match(
  askPrompt({ ...ctx, connected: [], findings: [] }, "explain"),
  /Connected pieces:\nnone/,
);

// the system prompt stays defensive
assert.match(SYSTEM_PROMPT, /INTENDED behaviour/);
assert.match(SYSTEM_PROMPT, /Never write exploits/);

// readiness: none never calls out; API providers need a key, local needs an endpoint
assert.equal(aiReady(NO_AI), false);
assert.equal(aiReady(configFor("local")), true);
assert.equal(aiReady({ ...configFor("local"), baseUrl: " " }), false);
assert.equal(aiReady(configFor("anthropic")), false);
assert.equal(aiReady({ ...configFor("anthropic"), key: "k" }), true);
assert.equal(configFor("anthropic").model, "claude-sonnet-5");
assert.equal(configFor("openai").key, "");

// anthropic: direct-browser header, key only in its header, system prompt separate
const a = chatRequest({ ...configFor("anthropic"), key: "sk-ant-x" }, "hi");
const ah = a.init.headers as Record<string, string>;
assert.equal(a.url, "https://api.anthropic.com/v1/messages");
assert.equal(ah["anthropic-dangerous-direct-browser-access"], "true");
assert.equal(ah["x-api-key"], "sk-ant-x");
const ab = JSON.parse(a.init.body as string);
assert.equal(ab.system, SYSTEM_PROMPT);
assert.deepEqual(ab.messages, [{ role: "user", content: "hi" }]);
assert.equal(ab.stream, true);
assert.doesNotMatch(a.init.body as string, /sk-ant-x/);
// a conversation goes as-is, after the system prompt on OpenAI-style APIs
const turns = [
  { role: "user" as const, content: "q1" },
  { role: "assistant" as const, content: "a1" },
  { role: "user" as const, content: "q2" },
];
assert.deepEqual(
  JSON.parse(
    chatRequest({ ...configFor("anthropic"), key: "k" }, turns).init
      .body as string,
  ).messages,
  turns,
);
assert.deepEqual(
  JSON.parse(
    chatRequest(configFor("local"), turns).init.body as string,
  ).messages.slice(1),
  turns,
);
assert.match(SYSTEM_PROMPT, /Foundry test's trace/);

// local: user endpoint (trailing slash trimmed), no auth header without a key
const l = chatRequest(
  { ...configFor("local"), baseUrl: "http://localhost:1234/v1/" },
  "hi",
  { stream: false },
);
assert.equal(l.url, "http://localhost:1234/v1/chat/completions");
assert.equal(
  (l.init.headers as Record<string, string>).authorization,
  undefined,
);
assert.equal(
  JSON.parse(l.init.body as string).messages[0].content,
  SYSTEM_PROMPT,
);

// API providers ignore a stale baseUrl: the key only ever goes to the provider's own host
const o = chatRequest(
  { ...configFor("openrouter"), baseUrl: "http://evil.test", key: "k" },
  "hi",
);
assert.equal(o.url, "https://openrouter.ai/api/v1/chat/completions");
assert.equal(
  (o.init.headers as Record<string, string>).authorization,
  "Bearer k",
);

// response text, streamed or whole, either API shape
assert.equal(
  textOf(
    '{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}',
  ),
  "Hi",
);
assert.equal(
  textOf('{"type":"message_delta","delta":{"stop_reason":"end_turn"}}'),
  "",
);
assert.equal(textOf('{"choices":[{"delta":{"content":"Yo"}}]}'), "Yo");
assert.equal(textOf('{"choices":[{"delta":{"role":"assistant"}}]}'), "");
assert.equal(textOf('{"choices":[{"message":{"content":"ok"}}]}'), "ok");
assert.equal(textOf('{"content":[{"type":"text","text":"ok"}]}'), "ok");
assert.equal(textOf("[DONE]"), "");
assert.throws(
  () => textOf('{"type":"error","error":{"message":"overloaded"}}'),
  /overloaded/,
);
assert.throws(() => textOf('{"error":"model not found"}'), /model not found/);

// "Your Claude" only on a local Luora: NEXT_PUBLIC_URL empty or local = here, a domain = hosted
assert.equal(isHostedUrl(undefined), false);
assert.equal(isHostedUrl(""), false);
assert.equal(isHostedUrl("http://localhost:3000"), false);
assert.equal(isHostedUrl("http://127.0.0.1:3020"), false);
assert.equal(isHostedUrl("https://www.luorasec.xyz"), true);
assert.equal(isHostedUrl("https://luorasec.xyz/"), true);

console.log("provider ok");
