import type { ChatMessage } from "./provider.ts";

/**
 * "Your Claude": Ask AI answered by the auditor's own Claude Code, signed in with their own
 * Claude subscription, on their own machine (docs/ai-provider.md). Luora never sees or stores a
 * token: the route runs the unmodified `claude` binary in print mode and streams its text back.
 * Pure logic here (arguments, prompt, stream parsing, request guard); app/api/claude runs it.
 */

/** limits on one request: a long Ask context is ~60 KB, a conversation a few of those */
export const MAX_MESSAGES = 40;
export const MAX_CHARS = 400_000;
export const MAX_RUNNING = 2;
export const TIMEOUT_MS = 180_000;

/** model names Claude Code accepts (aliases like "sonnet" or full ids); anything else is dropped */
const MODEL = /^[A-Za-z0-9][\w.:[\]-]{0,63}$/;

/**
 * `claude -p` with nothing but the question: no tools, no MCP servers, no user / project
 * settings (so no hooks run), no slash commands, no saved session, Luora's defensive system
 * prompt instead of Claude Code's. The prompt itself goes in on stdin. Never `--bare`: that
 * mode ignores the subscription login.
 */
export function claudeArgs(system: string, model?: string): string[] {
  return [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--tools",
    "",
    "--strict-mcp-config",
    "--setting-sources",
    "",
    "--disable-slash-commands",
    "--no-session-persistence",
    "--permission-mode",
    "dontAsk",
    "--system-prompt",
    system,
    ...(model && MODEL.test(model) ? ["--model", model] : []),
  ];
}

/** One print-mode run takes one prompt: earlier turns become a transcript above the new question. */
export function promptOf(messages: ChatMessage[]): string {
  const last = messages.at(-1);
  if (!last) return "";
  const earlier = messages.slice(0, -1);
  if (!earlier.length) return last.content;
  const turns = earlier
    .map((m) => `<${m.role}>\n${m.content}\n</${m.role}>`)
    .join("\n");
  return `<conversation_so_far>\n${turns}\n</conversation_so_far>\n\n${last.content}`;
}

/** A request body we accept: a non-empty list of user/assistant messages within the limits. */
export function parseBody(
  body: unknown,
): { messages: ChatMessage[]; model?: string; stream: boolean } | string {
  const b = body as { messages?: unknown; model?: unknown; stream?: unknown };
  if (!b || !Array.isArray(b.messages) || !b.messages.length)
    return "messages missing";
  if (b.messages.length > MAX_MESSAGES) return "conversation too long";
  let chars = 0;
  for (const m of b.messages as ChatMessage[]) {
    if (
      !m ||
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string"
    )
      return "bad message";
    chars += m.content.length;
  }
  if (chars > MAX_CHARS) return "context too large";
  if ((b.messages as ChatMessage[]).at(-1)?.role !== "user")
    return "the last message must be the question";
  return {
    messages: b.messages as ChatMessage[],
    model: typeof b.model === "string" ? b.model.trim() : undefined,
    stream: b.stream !== false,
  };
}

export type BridgeEvent =
  | { text: string }
  | { error: string }
  | { auth: string }
  | null;

/** One line of `--output-format stream-json`: a text delta, the final error, how it signed in, or nothing. */
export function parseLine(line: string): BridgeEvent {
  if (!line.trim()) return null;
  let j: {
    type?: string;
    subtype?: string;
    apiKeySource?: string;
    is_error?: boolean;
    result?: string;
    event?: { type?: string; delta?: { type?: string; text?: string } };
  };
  try {
    j = JSON.parse(line);
  } catch {
    return null;
  }
  if (j.type === "system" && j.subtype === "init")
    // "none" = no API key in play: the claude.ai login (the subscription) answers
    return { auth: j.apiKeySource === "none" ? "subscription" : "api key" };
  if (
    j.type === "stream_event" &&
    j.event?.type === "content_block_delta" &&
    j.event.delta?.type === "text_delta"
  )
    return { text: j.event.delta.text ?? "" };
  if (j.type === "result" && j.is_error)
    return { error: j.result || "Claude Code reported an error." };
  return null;
}

const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Only this app's own pages on this machine may use the bridge: the Host is a loopback name
 * (stops DNS rebinding), the Origin, when sent, is this same host (stops other websites), and a
 * hosted deployment never runs it. Returns why not, or null.
 */
export function refuse(h: {
  host: string | null;
  origin: string | null;
  fetchSite: string | null;
  hosted: boolean;
  method: string;
}): string | null {
  if (h.hosted) return "The Claude bridge only runs in a local Luora.";
  const host = h.host ?? "";
  const name = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : host.split(":")[0];
  if (!LOCAL.has(name)) return "Open Luora at localhost to use your Claude.";
  if (h.origin && h.origin !== `http://${host}`)
    return "Requests from other sites are refused.";
  if (h.method !== "GET" && !h.origin)
    return "Requests from other sites are refused.";
  if (h.fetchSite && h.fetchSite !== "same-origin" && h.fetchSite !== "none")
    return "Requests from other sites are refused.";
  return null;
}

/** Server-sent events in the shape features/ai/utils/provider.ts `textOf` already reads. */
export const sse = (e: { text: string } | { error: string }) =>
  `data: ${JSON.stringify("text" in e ? { delta: { text: e.text } } : { error: e.error })}\n\n`;
