import { execFile, spawn } from "node:child_process";
import { refuse } from "@/features/ai/utils/claude-bridge";

/*
 * Sign Claude Code itself in or out on this laptop, from the Connect AI dialog (docs/ai-provider.md,
 * "Your Claude"). Both run Claude Code's own commands; Luora still never sees the login:
 *  - logout: `claude auth logout`, the same as typing it in a terminal. It signs Claude Code out
 *    everywhere on this machine (terminals, Orca, Luora), not only in Luora.
 *  - login: `claude auth login --claudeai`, which opens claude.ai's own sign-in page in the browser
 *    and stores the login itself when you finish there. The dialog polls GET /api/claude meanwhile.
 * Same guard as the bridge: this app's own page on this machine only.
 */

const hosted = () => !!(process.env.VERCEL || process.env.LUORA_HOSTED);
let pending: ReturnType<typeof spawn> | null = null;

export async function POST(req: Request) {
  const why = refuse({
    host: req.headers.get("host"),
    origin: req.headers.get("origin"),
    fetchSite: req.headers.get("sec-fetch-site"),
    hosted: hosted(),
    method: req.method,
  });
  if (why)
    return Response.json({ error: why }, { status: hosted() ? 404 : 403 });
  const { op } = ((await req.json().catch(() => ({}))) ?? {}) as {
    op?: string;
  };

  if (op === "logout") {
    pending?.kill();
    pending = null;
    return new Promise<Response>((resolve) =>
      execFile("claude", ["auth", "logout"], { timeout: 15_000 }, (e) =>
        resolve(
          e
            ? Response.json(
                { error: `Claude Code could not sign out: ${e.message}` },
                { status: 500 },
              )
            : Response.json({ ok: true }),
        ),
      ),
    );
  }

  if (op === "login") {
    // one sign-in at a time; it waits for you on claude.ai, then exits (or gives up after 5 min)
    pending?.kill();
    const child = spawn("claude", ["auth", "login", "--claudeai"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    pending = child;
    const stop = setTimeout(() => child.kill(), 5 * 60_000);
    child.on("close", () => {
      clearTimeout(stop);
      if (pending === child) pending = null;
    });
    // if Claude Code prints the sign-in address (no browser could be opened), hand it to the page
    const url = await new Promise<string | null>((resolve) => {
      let out = "";
      const done = (u: string | null) => {
        clearTimeout(t);
        resolve(u);
      };
      const t = setTimeout(() => done(null), 4000);
      const read = (c: Buffer) => {
        out += c.toString();
        const m = /https:\/\/(?:claude\.ai|[\w.-]*anthropic\.com)\/\S+/.exec(
          out,
        );
        if (m) done(m[0]);
      };
      child.stdout?.on("data", read);
      child.stderr?.on("data", read);
      child.on("error", () => done(null));
    });
    return Response.json({ ok: true, url });
  }

  return Response.json({ error: "unknown op" }, { status: 400 });
}
