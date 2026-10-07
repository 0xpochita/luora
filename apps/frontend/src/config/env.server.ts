import "server-only";
import path from "node:path";

/**
 * Where `luora-export.mjs` writes its output. Defaults to the repo's `foundry/`
 * project; point LUORA_DATA_PATH at any Foundry project's luora-data.json.
 */
export const LUORA_DATA_PATH =
  process.env.LUORA_DATA_PATH ??
  path.resolve(process.cwd(), "../../foundry/luora-data.json");
