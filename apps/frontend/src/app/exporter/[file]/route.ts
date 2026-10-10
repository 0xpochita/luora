import { readFile } from "node:fs/promises";
import path from "node:path";

/** The exporter scripts this app reads the output of, and the MCP server (foundry/), nothing else. */
const FILES = new Set([
  "luora-export.mjs",
  "luora-lib.mjs",
  "luora-atlas.mjs",
  "luora-findings.mjs",
  "luora-coverage.mjs",
  "luora-mcp.mjs",
]);

/**
 * Serves the exporter straight from the running app, so an auditor needs no clone:
 * `curl -fsSLO "<app>/exporter/luora-{export,lib,atlas,findings,coverage}.mjs"` in their Foundry
 * project gets exactly the version this app reads. Allow-listed names only.
 * ponytail: reads the repo's foundry/ next to the app, so it serves a local / repo checkout only;
 * a hosted build without foundry/ answers 404. Copy the five scripts into public/ at build time if
 * the app is ever hosted for others.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  if (!FILES.has(file)) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(
      path.resolve(process.cwd(), "../../foundry", file),
      "utf8",
    );
    return new Response(body, {
      headers: {
        "content-type": "text/javascript; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response("Exporter not found next to this app", {
      status: 404,
    });
  }
}
