import type { AtlasData, AtlasSource } from "../types";
import { type TraceTest, traceCalls } from "./playground";

/** The atlas view of a parsed luora-data.json, or null when it has no usable `atlas` section. */
export function atlasSource(
  json: { atlas?: AtlasData | null; tests?: TraceTest[] },
  origin: AtlasSource["origin"],
): AtlasSource | null {
  const { atlas, tests } = json;
  if (!Array.isArray(atlas?.pieces) || typeof atlas.source !== "string")
    return null;
  return {
    data: atlas,
    origin,
    calls: traceCalls(tests ?? [], atlas.contract),
  };
}
