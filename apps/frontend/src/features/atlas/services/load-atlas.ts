import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { LUORA_DATA_EXPLICIT, LUORA_DATA_PATH } from "@/config/env.server";
import { SAMPLE_ATLAS } from "../fixtures/sample-atlas";
import SAMPLE_CONTRACTS from "../fixtures/sample-contracts.json";
import type { AtlasData, AtlasSource } from "../types";
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
 * `node luora-export.mjs` (or `node luora-atlas.mjs`) shows up after a refresh, but only when
 * LUORA_DATA_PATH points at one. Otherwise nothing is loaded (origin "none", the Start page) and
 * the bundled sample rides along for "Try the sample".
 */
export async function loadAtlas(): Promise<AtlasSource> {
  await connection();
  if (LUORA_DATA_EXPLICIT)
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
    // the sample project's mocks, mapped by luora-atlas.mjs, for the contract picker
    contracts: SAMPLE_CONTRACTS as unknown as AtlasData[],
    origin: "none",
    proposed: await loadProposed(SAMPLE_ATLAS.contract),
  };
}
