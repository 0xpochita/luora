import "server-only";
import path from "node:path";

/**
 * Where `luora-export.mjs` writes its output. Defaults to the repo's `foundry/`
 * project; point LUORA_DATA_PATH at any Foundry project's luora-data.json.
 */
/**
 * True when the user pointed the app at a run. The app (Trace, Atlas) only reads the export then;
 * without it the app starts empty, on its Start page. The landing still reads the default path.
 */
export const LUORA_DATA_EXPLICIT = Boolean(process.env.LUORA_DATA_PATH);

export const LUORA_DATA_PATH =
  process.env.LUORA_DATA_PATH ??
  path.resolve(process.cwd(), "../../foundry/luora-data.json");
