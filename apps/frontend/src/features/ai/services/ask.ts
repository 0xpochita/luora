import type { AiConfig } from "../types";
import { type ChatMessage, chatRequest, textOf } from "../utils/provider";

/** Readable error from a failed call; never echoes the request (it carries the key). */
async function failure(res: Response): Promise<Error> {
  let msg = res.statusText;
  try {
    textOf(await res.text());
  } catch (e) {
    if (!(e instanceof SyntaxError)) msg = (e as Error).message;
  }
  return new Error(`${res.status} ${msg}`.trim());
}

function reach(cfg: AiConfig, e: unknown): Error {
  if ((e as Error).name === "AbortError") return e as Error;
  if (cfg.kind === "claude")
    return new Error(
      "Can't reach Luora's Claude bridge. It runs only while this app runs locally (pnpm dev) and is opened at localhost.",
    );
  return new Error(
    cfg.kind === "local"
      ? `Can't reach ${cfg.baseUrl}. Is the model server running, and does it allow this page's origin (CORS)?`
      : "Can't reach the provider (network or CORS).",
  );
}

/** Streams the answer text, browser → provider directly (your Claude: through this app's own local bridge). */
export async function* askStream(
  cfg: AiConfig,
  user: string | ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const { url, init } = chatRequest(cfg, user);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal });
  } catch (e) {
    throw reach(cfg, e);
  }
  if (!res.ok || !res.body) throw await failure(res);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += value;
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const l of lines) {
      if (!l.startsWith("data:")) continue;
      const t = textOf(l.slice(5).trim());
      if (t) yield t;
    }
  }
}

/** One tiny non-streamed call: proves the endpoint, key and model all work. */
export async function testConnection(cfg: AiConfig): Promise<string> {
  const { url, init } = chatRequest(cfg, "Reply with the single word: ok", {
    stream: false,
    maxTokens: 16,
  });
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  } catch (e) {
    throw reach(cfg, e);
  }
  if (!res.ok) throw await failure(res);
  return textOf(await res.text()).trim();
}
