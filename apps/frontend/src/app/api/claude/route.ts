import { execFile, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  claudeArgs,
  MAX_RUNNING,
  parseBody,
  parseLine,
  promptOf,
  refuse,
  sse,
  TIMEOUT_MS,
} from "@/features/ai/utils/claude-bridge";
import { SYSTEM_PROMPT } from "@/features/ai/utils/provider";

/*
 * The local Claude bridge (docs/ai-provider.md, "Your Claude"): Ask AI answered by the auditor's
 * own Claude Code, signed in with their own Claude subscription, like Orca runs the agents you
 * already pay for. Luora never reads, stores or forwards a token: it runs the unmodified `claude`
 * binary, which uses its own login. Local only (see `refuse`); a hosted build answers 404.
 */

const hosted = () => !!(process.env.VERCEL || process.env.LUORA_HOSTED);
let running = 0;

function guard(req: Request): Response | null {
  const why = refuse({
    host: req.headers.get("host"),
    origin: req.headers.get("origin"),
    fetchSite: req.headers.get("sec-fetch-site"),
    hosted: hosted(),
    method: req.method,
  });
  if (!why) return null;
  return Response.json({ error: why }, { status: hosted() ? 404 : 403 });
}

const run = (cmd: string, args: string[]) =>
  new Promise<string>((resolve, reject) =>
    execFile(cmd, args, { timeout: 15_000 }, (e, out) =>
      e ? reject(e) : resolve(out),
    ),
  );

/** Is Claude Code here, and signed in how? (No email, org or token leaves this route.) */
export async function GET(req: Request) {
  const no = guard(req);
  if (no) return no;
  try {
    const version = (await run("claude", ["--version"])).trim();
    const s = JSON.parse(await run("claude", ["auth", "status"])) as {
      loggedIn?: boolean;
      authMethod?: string;
      subscriptionType?: string;
    };
    return Response.json({
      available: true,
      version,
      loggedIn: !!s.loggedIn,
      authMethod: s.authMethod ?? null,
      plan: s.subscriptionType ?? null,
    });
  } catch (e) {
    const missing = (e as NodeJS.ErrnoException).code === "ENOENT";
    return Response.json({
      available: !missing,
      loggedIn: false,
      error: missing
        ? "Claude Code is not installed here (no `claude` on PATH)."
        : "Could not read Claude Code's sign-in. Run `claude` once in a terminal to sign in.",
    });
  }
}

/** One Ask: the conversation in, Claude Code's answer out as server-sent events. */
export async function POST(req: Request) {
  const no = guard(req);
  if (no) return no;
  const body = parseBody(await req.json().catch(() => null));
  if (typeof body === "string")
    return Response.json({ error: body }, { status: 400 });
  if (running >= MAX_RUNNING)
    return Response.json(
      { error: "Your Claude is already answering. Wait for it, or stop it." },
      { status: 429 },
    );

  running++;
  // an empty folder: nothing of the user's project (CLAUDE.md, .mcp.json, settings) is in play
  const cwd = await mkdtemp(path.join(tmpdir(), "luora-claude-"));
  const child = spawn("claude", claudeArgs(SYSTEM_PROMPT, body.model), {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    running--;
    clearTimeout(timer);
    if (child.exitCode == null) child.kill();
    rm(cwd, { recursive: true, force: true }).catch(() => {});
  };
  const timer = setTimeout(finish, TIMEOUT_MS);
  req.signal.addEventListener("abort", finish);
  child.stdin.end(promptOf(body.messages));

  const events = new ReadableStream<{ text: string } | { error: string }>({
    start(ctl) {
      let buf = "";
      let err = "";
      let said = false;
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        buf += chunk;
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          const e = parseLine(l);
          if (e && "text" in e) {
            said = true;
            ctl.enqueue(e);
          } else if (e && "error" in e) ctl.enqueue(e);
        }
      });
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (c: string) => {
        err = (err + c).slice(-2000);
      });
      child.on("error", (e: NodeJS.ErrnoException) => {
        ctl.enqueue({
          error:
            e.code === "ENOENT"
              ? "Claude Code is not installed here (no `claude` on PATH). Install it and run `claude` once to sign in."
              : e.message,
        });
        ctl.close();
        finish();
      });
      child.on("close", (code) => {
        if (code && !said)
          ctl.enqueue({
            error:
              err.trim().split("\n").at(-1) ||
              `Claude Code stopped (exit ${code}).`,
          });
        try {
          ctl.close();
        } catch {}
        finish();
      });
    },
    cancel: finish,
  });

  if (!body.stream) {
    // Test connection: the whole reply at once, in the Anthropic reply shape textOf reads
    let text = "";
    const reader = events.getReader();
    for (;;) {
      const { done, value: e } = await reader.read();
      if (done) break;
      if ("error" in e)
        return Response.json({ error: e.error }, { status: 502 });
      text += e.text;
    }
    return Response.json({ content: [{ text }] });
  }
  const enc = new TextEncoder();
  return new Response(
    events.pipeThrough(
      new TransformStream({
        transform: (e, ctl) => ctl.enqueue(enc.encode(sse(e))),
      }),
    ),
    {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-store",
      },
    },
  );
}
