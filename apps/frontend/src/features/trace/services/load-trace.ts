import "server-only";
import { readFile } from "node:fs/promises";
import { connection } from "next/server";
import { LUORA_DATA_EXPLICIT, LUORA_DATA_PATH } from "@/config/env.server";
import sample from "../fixtures/sample-trace.json";
import type { LuoraData, TraceSource } from "../types";

/**
 * Reads the latest `luora-data.json` on every request so a fresh `node luora-export.mjs` shows up
 * after a refresh, but only when LUORA_DATA_PATH points at one. Otherwise (or when that file is
 * missing) nothing is loaded: origin "none", the app opens on its Start page, and the bundled
 * sample rides along for its "Try the sample" button.
 */
export async function loadTrace(): Promise<TraceSource> {
  await connection();
  if (LUORA_DATA_EXPLICIT)
    try {
      const raw = await readFile(LUORA_DATA_PATH, "utf8");
      return { data: JSON.parse(raw) as LuoraData, origin: "local" };
    } catch {}
  return { data: sample as LuoraData, origin: "none" };
}
