/** Shape written by `foundry/luora-export.mjs`. */
export type FrameKind =
  | "CALL"
  | "STATICCALL"
  | "DELEGATECALL"
  | "CALLCODE"
  | "CREATE"
  | "CREATE2"
  | "EVENT";

export type Frame = {
  d: number;
  kind: FrameKind;
  to: string;
  contract: string | null;
  file: string | null;
  fn: string;
  args: string;
  ret: string;
  ok: boolean;
  status?: string;
  gas: number | null;
  /** Executed source lines per file (1-based), from `forge test --debug` step data. */
  lines?: Record<string, number[]>;
  /** Line in the caller that made this call (or emitted this event). */
  callSite?: SourceLine;
  /** Storage reads/writes this frame's own code performed, by line. */
  storage?: (SourceLine & { op: "SLOAD" | "SSTORE" })[];
};

export type SourceLine = { file: string; line: number };

export type Transfer = {
  token: string;
  from: string;
  to: string;
  value: string;
};

export type TestResult = {
  suite: string;
  file: string;
  name: string;
  status: "Success" | "Failure" | "Skipped" | string;
  kind: string | Record<string, unknown>;
  reason: string | null;
  frames: Frame[];
  transfers: Transfer[];
};

export type LuoraData = {
  generatedAt: string;
  forgeVersion: string;
  command: string;
  tests: TestResult[];
  sources: Record<string, string>;
};

/** What a row/node is drawn as (cheatcodes and reverts get their own look). */
export type DisplayKind = FrameKind | "VM" | "REVERT";

export type TraceMode = "trace" | "graph";

export type TraceSource = { data: LuoraData; origin: "local" | "sample" };
