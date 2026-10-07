import "server-only";
import { readFile } from "node:fs/promises";
import { connection } from "next/server";
import { LUORA_DATA_PATH } from "@/config/env.server";
import sample from "../fixtures/sample-trace.json";
import type { LuoraData, TraceSource } from "../types";

/**
 * Reads the latest `luora-data.json` on every request so a fresh
 * `node luora-export.mjs` shows up after a refresh. Falls back to the bundled
 * sample when no local export exists (e.g. on a deployed preview).
 */
export async function loadTrace(): Promise<TraceSource> {
  await connection();
  try {
    const raw = await readFile(LUORA_DATA_PATH, "utf8");
    return { data: JSON.parse(raw) as LuoraData, origin: "local" };
  } catch {
    return { data: sample as LuoraData, origin: "sample" };
  }
}
