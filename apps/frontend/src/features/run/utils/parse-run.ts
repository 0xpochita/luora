import type { AtlasData } from "../../atlas/types";
import type { LuoraData } from "../../trace/types";

/** A whole luora-data.json: the trace sections plus the optional `atlas` section. */
export type RunFile = LuoraData & { atlas?: AtlasData | null };

export type ParseResult =
  | { ok: true; data: RunFile }
  | { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** First field of `o` that is not a string, as a path for the error. */
function notString(o: Record<string, unknown>, keys: string[], at: string) {
  const k = keys.find((k) => typeof o[k] !== "string");
  return k && `${at}${k} should be a string`;
}

function checkTests(tests: unknown): string | undefined {
  if (!Array.isArray(tests))
    return "Missing a `tests` array. Is this the luora-data.json written by luora-export.mjs?";
  for (const [i, t] of tests.entries()) {
    const at = `tests[${i}]`;
    if (!isObj(t)) return `${at} should be an object`;
    const bad = notString(t, ["name", "suite", "file", "status"], `${at}.`);
    if (bad) return bad;
    if (!Array.isArray(t.frames)) return `${at}.frames should be an array`;
    if (!Array.isArray(t.transfers))
      return `${at}.transfers should be an array`;
    for (const [j, f] of t.frames.entries()) {
      if (!isObj(f)) return `${at}.frames[${j}] should be an object`;
      if (typeof f.d !== "number")
        return `${at}.frames[${j}].d should be a number`;
      const badF = notString(f, ["kind", "to", "fn"], `${at}.frames[${j}].`);
      if (badF) return badF;
    }
  }
}

function checkAtlas(atlas: unknown): string | undefined {
  if (atlas == null) return;
  if (!isObj(atlas)) return "`atlas` should be an object";
  if (!Array.isArray(atlas.pieces)) return "`atlas.pieces` should be an array";
  const bad = notString(
    atlas,
    ["contract", "file", "compiler", "source"],
    "atlas.",
  );
  if (bad) return bad;
  for (const [i, p] of atlas.pieces.entries()) {
    if (!isObj(p)) return `atlas.pieces[${i}] should be an object`;
    const badP = notString(p, ["id", "sys", "name"], `atlas.pieces[${i}].`);
    if (badP) return badP;
  }
  for (const k of ["entry", "internal", "banks"])
    if (!Array.isArray(atlas[k])) return `atlas.${k} should be an array`;
  for (const k of ["lesion", "seq", "callTarget"])
    if (!isObj(atlas[k])) return `atlas.${k} should be an object`;
}

/**
 * Parses and validates a luora-data.json the auditor dropped into the browser. Runs in the
 * browser only; the text is never sent anywhere. Errors name the first bad field.
 */
export function parseRun(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Not valid JSON: ${(e as Error).message}` };
  }
  if (!isObj(json))
    return { ok: false, error: "Expected a JSON object at the top level" };
  const error =
    checkTests(json.tests) ??
    notString(json, ["generatedAt", "forgeVersion", "command"], "") ??
    (isObj(json.sources) &&
    Object.values(json.sources).every((s) => typeof s === "string")
      ? undefined
      : "`sources` should map each file path to its source text") ??
    checkAtlas(json.atlas);
  return error
    ? { ok: false, error }
    : { ok: true, data: json as unknown as RunFile };
}
