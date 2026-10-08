import type { TraceCall } from "./utils/playground";

export type SystemKey =
  | "entry"
  | "access"
  | "logic"
  | "storage"
  | "calls"
  | "deps"
  | "events"
  | "vulns";

export type Risk = "high" | "med" | "low" | "info";

/** Who reported a finding: a static analyzer, or Luora's own atlas checks. */
export type FindingTool = "slither" | "aderyn" | "manual";
export type Confidence = "high" | "med" | "low";
/** One tool's report of a finding (several when tools agree on the same issue). */
export type FindingReport = {
  tool: FindingTool;
  detector: string;
  risk: Risk;
  confidence?: Confidence;
  /** detector documentation */
  ref?: string;
};

/** Auditor triage of a finding (kept in the browser, per contract). */
export type TriageStatus =
  | "open"
  | "confirmed"
  | "false-positive"
  | "duplicate";
export type Triage = { status: TriageStatus; note: string };

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
  /** finding: primary report (worst severity) and every tool that reported it */
  tool?: FindingTool;
  detector?: string;
  confidence?: Confidence;
  reports?: FindingReport[];
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
  /** forge coverage of this contract (absent when the export ran without it) */
  coverage?: AtlasCoverage;
};

export type CoverageCount = { hit: number; found: number };
/** `forge coverage` lcov folded onto the atlas. Line keys are 0-based, like `Piece.line`. */
export type AtlasCoverage = {
  tool: string;
  lines: CoverageCount;
  branches: CoverageCount;
  functions: CoverageCount;
  /** instrumented source line → times executed */
  hits: Record<string, number>;
  /** source line → per-branch times taken (null = branch point never reached) */
  branchHits: Record<string, (number | null)[]>;
  /** piece id → its body's coverage (functions exclude their signature line); calls = times entered */
  pieces: Record<
    string,
    { lines: CoverageCount; branches: CoverageCount; calls?: number }
  >;
};

export type AtlasSource = {
  data: AtlasData;
  origin: "local" | "sample";
  /** calls the forge tests made into the contract (luora-data.json `tests`), for the playground */
  calls?: TraceCall[];
};

export type AtlasView = "city" | "explorer" | "map";
export type AiQuestion = "explain" | "risks" | "test";
