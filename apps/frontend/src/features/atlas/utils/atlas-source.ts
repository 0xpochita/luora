import type { AtlasData, AtlasSource } from "../types";
import { type TraceTest, traceCalls } from "./playground";

/** The atlas view of a parsed luora-data.json, or null when it has no usable `atlas` section. */
const usable = (a: AtlasData | null | undefined): a is AtlasData =>
  Array.isArray(a?.pieces) && typeof a.source === "string";

export function atlasSource(
  json: {
    atlas?: AtlasData | null;
    atlases?: (AtlasData | null)[];
    tests?: TraceTest[];
  },
  origin: AtlasSource["origin"],
): AtlasSource | null {
  const { atlas, tests = [] } = json;
  if (!usable(atlas)) return null;
  const contracts = (Array.isArray(json.atlases) ? json.atlases : []).filter(
    usable,
  );
  return {
    data: atlas,
    origin,
    calls: traceCalls(tests, atlas.contract),
    contracts,
    callsBy: Object.fromEntries(
      contracts.map((c) => [c.contract, traceCalls(tests, c.contract)]),
    ),
  };
}
