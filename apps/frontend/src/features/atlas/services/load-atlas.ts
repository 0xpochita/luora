import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { LUORA_DATA_PATH } from "@/config/env.server";
import { SAMPLE_ATLAS } from "../fixtures/sample-atlas";
import type { AtlasSource } from "../types";
import { atlasSource } from "../utils/atlas-source";

/**
 * Scenarios an AI client proposed for `contract` via luora-mcp.mjs, from luora-scenarios.json
 * next to luora-data.json. The Lab validates each one before offering it.
 */
async function loadProposed(contract: string): Promise<unknown[]> {
  try {
    const list: unknown = JSON.parse(
      await readFile(
        path.join(path.dirname(LUORA_DATA_PATH), "luora-scenarios.json"),
        "utf8",
      ),
    );
    return Array.isArray(list)
      ? list.filter(
          (s) => (s as { contract?: unknown } | null)?.contract === contract,
        )
      : [];
  } catch {
    return [];
  }
}

/**
 * Reads the `atlas` section of the latest `luora-data.json` on every request, so a fresh
 * `node luora-export.mjs` (or `node luora-atlas.mjs`) shows up after a refresh. Falls back to
 * the bundled hand-written sample when no local export or atlas section exists.
 */
export async function loadAtlas(): Promise<AtlasSource> {
  await connection();
  try {
    const local = atlasSource(
      JSON.parse(await readFile(LUORA_DATA_PATH, "utf8")),
      "local",
    );
    if (local)
      return { ...local, proposed: await loadProposed(local.data.contract) };
  } catch {}
  return {
    data: SAMPLE_ATLAS,
    origin: "sample",
    proposed: await loadProposed(SAMPLE_ATLAS.contract),
  };
}
