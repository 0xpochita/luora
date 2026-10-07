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
};

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
