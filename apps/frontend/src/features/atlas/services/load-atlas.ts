import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { LUORA_DATA_PATH } from "@/config/env.server";
import { SAMPLE_ATLAS } from "../fixtures/sample-atlas";
import type { AtlasData, AtlasSource } from "../types";
import { type TraceTest, traceCalls } from "../utils/playground";

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
    const { atlas, tests } = JSON.parse(
      await readFile(LUORA_DATA_PATH, "utf8"),
    ) as { atlas?: AtlasData; tests?: TraceTest[] };
    if (Array.isArray(atlas?.pieces) && typeof atlas.source === "string")
      return {
        data: atlas,
        origin: "local",
        calls: traceCalls(tests ?? [], atlas.contract),
        proposed: await loadProposed(atlas.contract),
      };
  } catch {}
  return {
    data: SAMPLE_ATLAS,
    origin: "sample",
    proposed: await loadProposed(SAMPLE_ATLAS.contract),
  };
}
