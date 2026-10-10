import type { ChainInfo } from "../../trace/types";
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
    forks?: Record<string, { chain: ChainInfo; tests?: TraceTest[] }>;
  },
  origin: AtlasSource["origin"],
): AtlasSource | null {
  const { atlas, tests = [] } = json;
  if (!usable(atlas)) return null;
  const contracts = (Array.isArray(json.atlases) ? json.atlases : []).filter(
    usable,
  );
  const calls = (t: TraceTest[]) => ({
    calls: traceCalls(t, atlas.contract),
    callsBy: Object.fromEntries(
      contracts.map((c) => [c.contract, traceCalls(t, c.contract)]),
    ),
  });
  return {
    data: atlas,
    origin,
    contracts,
    ...calls(tests),
    // the same tests on testnet forks (luora-export.mjs --forks): their values, per chain
    forks: Object.fromEntries(
      Object.entries(json.forks ?? {}).map(([key, f]) => [
        key,
        { chain: f.chain, ...calls(f.tests ?? []) },
      ]),
    ),
  };
}
