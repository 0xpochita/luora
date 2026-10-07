export type SystemKey =
  | "entry"
  | "access"
  | "logic"
  | "storage"
  | "calls"
  | "deps"
  | "events"
  | "vulns";

export type Risk = "high" | "med" | "low";

/** One mapped part of the contract: a function, modifier, slot, call, dependency, event or finding. */
export type Piece = {
  id: string;
  sys: SystemKey;
  name: string;
  /** source anchor: first line containing this text */
  find: string;
  /** lines covered from the anchor */
  n?: number;
  /** offsets (from the anchor) to mark red */
  mark?: number[];
  desc: string;
  links?: string[];
  caller?: "anyone" | "owner" | "keeper";
  slot?: number;
  risk?: Risk;
};

export type LayerKey = "ext" | "entry" | "logic" | "state";
export type Layer = {
  key: LayerKey;
  name: string;
  sub: string;
  y: number;
  half: number;
  color: string;
  sys: SystemKey[];
};

/** r = read slot, w = write slot, c = external call, e = event */
export type Step = ["r" | "w" | "c" | "e", string];

export type AtlasView = "atlas" | "terminal";
export type CamView = "iso" | "front" | "top";
export type AiQuestion = "explain" | "risks" | "test";
