import "server-only";
import { readFile } from "node:fs/promises";
import { connection } from "next/server";
import { LUORA_DATA_PATH } from "@/config/env.server";
import { SAMPLE_ATLAS } from "../fixtures/sample-atlas";
import type { AtlasSource } from "../types";
import { atlasSource } from "../utils/atlas-source";

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
    if (local) return local;
  } catch {}
  return { data: SAMPLE_ATLAS, origin: "sample" };
}
