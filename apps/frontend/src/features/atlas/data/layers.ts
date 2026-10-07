import type { Layer, SystemKey } from "../types";

export const SYSTEMS: Record<SystemKey, { label: string; sub: string }> = {
  entry: { label: "Entry points", sub: "layer 1 · external functions" },
  access: { label: "Access control", sub: "gates on the entry layer" },
  logic: { label: "Internal logic", sub: "layer 2 · internal functions" },
  storage: { label: "Storage", sub: "layer 3 · state slots" },
  calls: { label: "External calls", sub: "pipes through the trust boundary" },
  deps: { label: "External contracts", sub: "outside the trust boundary" },
  events: { label: "Events", sub: "signals emitted" },
  vulns: { label: "Findings", sub: "risk markers" },
};

/** Layer palette (also mirrored as CSS vars in atlas.css). */
export const COLORS = {
  ext: "#b07bff",
  entry: "#3fa9ff",
  logic: "#2ee6d6",
  state: "#2bdc7f",
  access: "#f5b544",
  events: "#9fe7ff",
  vulns: "#ff4d5e",
} as const;
export const SYS_COLOR: Record<SystemKey, keyof typeof COLORS> = {
  entry: "entry",
  access: "access",
  logic: "logic",
  storage: "state",
  calls: "ext",
  deps: "ext",
  events: "events",
  vulns: "vulns",
};

// A pyramid of diamonds, the outside world on top.
export const LAYERS: Layer[] = [
  {
    key: "ext",
    name: "External",
    sub: "contracts it calls",
    y: 12.6,
    half: 4.0,
    color: COLORS.ext,
    sys: ["deps", "calls"],
  },
  {
    key: "entry",
    name: "Entry",
    sub: "external functions",
    y: 8.4,
    half: 6.0,
    color: COLORS.entry,
    sys: ["entry", "access", "events"],
  },
  {
    key: "logic",
    name: "Logic",
    sub: "internal functions",
    y: 4.2,
    half: 7.6,
    color: COLORS.logic,
    sys: ["logic"],
  },
  {
    key: "state",
    name: "State",
    sub: "storage slots",
    y: 0,
    half: 9.6,
    color: COLORS.state,
    sys: ["storage"],
  },
];
