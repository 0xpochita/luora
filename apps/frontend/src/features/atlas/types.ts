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
  /** exact 0-based source line (generated data); wins over `find` */
  line?: number;
  /** lines covered from the anchor */
  n?: number;
  /** offsets (from the anchor) to mark red */
  mark?: number[];
  desc: string;
  links?: string[];
  /** who may call (entry only): "anyone" or the role checked against msg.sender */
  caller?: string;
  slot?: number;
  /** storage slot holding a mapping / dynamic array */
  mapping?: boolean;
  /** missing protection, drawn as a wireframe */
  ghost?: boolean;
  /** read-only external call (cannot change state, ignored by the CEI check) */
  view?: boolean;
  /** external call: target expression and member, e.g. asset + transfer */
  target?: string;
  member?: string;
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

export type Bank = { title: string; sub: string; ids: string[] };

/** Everything the atlas draws for one contract (the `atlas` section of luora-data.json). */
export type AtlasData = {
  contract: string;
  file: string;
  compiler: string;
  source: string;
  pieces: Piece[];
  /** finding id → piece it hovers over */
  lesion: Record<string, string>;
  /** entry point id → what it touches, in execution order */
  seq: Record<string, Step[]>;
  /** call piece id → external contract piece id */
  callTarget: Record<string, string>;
  banks: Bank[];
  entry: string[];
  internal: string[];
};

export type AtlasSource = { data: AtlasData; origin: "local" | "sample" };

export type AtlasView = "atlas" | "city" | "explorer" | "terminal";
export type CamView = "iso" | "front" | "top";
export type AiQuestion = "explain" | "risks" | "test";
