import type { AtlasData } from "../atlas/types";

/**
 * One protocol as foundry/luora-protocol.mjs writes it (features/explore/data/<id>.json):
 * hand-written roles, flows and checks, plus everything read from the protocol's own AST.
 */

/** calls: external call · delegates: external library (DELEGATECALL) · uses: internal library (inlined) */
export type EdgeKind =
  | "calls"
  | "delegates"
  | "uses"
  | "holds"
  | "deploys"
  | "inherits";

export type Repo = {
  id: string;
  url: string;
  tag: string;
  commit: string;
  license: string;
  licenseNote?: string;
};

export type ProtocolContract = {
  name: string;
  group: string;
  role: string;
  summary: string;
  /** repo id; null = vendored code (a submodule of another project), no link */
  repo: string | null;
  /** SPDX id from the file header */
  license: string | null;
  /** open licence: the atlas keeps its source; otherwise structure only */
  excerpts: boolean;
  file: string;
  /** 0-based */
  line: number;
  kind: "contract" | "library" | "interface" | "abstract";
  bases: string[];
  counts: { entry: number; functions: number; storage: number; events: number };
  /** entry points with a caller check: who may call */
  gated: {
    fn: string;
    caller: string;
    /** the gating modifier, when there is one */
    by?: string;
  }[];
  /** what the Atlas draws for this contract; pieces from other files carry `file` and `repo` */
  atlas: AtlasData;
};

export type External = {
  name: string;
  label: string;
  group: string;
  summary: string;
};

export type Edge = {
  from: string;
  to: string;
  kind: EdgeKind;
  members: string[];
  /** read by hand from the code (the AST can't see it, e.g. an assembly delegatecall) */
  manual?: boolean;
  note?: string;
};

export type FlowStep = {
  at: string;
  /** who makes the call: the actor, a contract, or a role the step names (Anyone, Allocator) */
  from?: string;
  say: string;
  /** contract, external or the flow's actor */
  lane: string;
  fn: string | null;
  /** where the function is, when the step names a mapped contract's function */
  repo?: string | null;
  file?: string;
  line?: number;
};

export type Flow = {
  id: string;
  title: string;
  actor: string;
  summary: string;
  steps: FlowStep[];
  /** what an auditor checks on this flow (never attack steps) */
  checks: string[];
};

export type Protocol = {
  id: string;
  name: string;
  version: string;
  category: string;
  chain: string;
  logo?: string;
  purpose: string;
  about: string;
  repos: Repo[];
  groups: string[];
  contracts: ProtocolContract[];
  externals: External[];
  edges: Edge[];
  flows: Flow[];
  checks: string[];
  notes: string;
  generatedWith: string;
};

/** What the gallery card needs. */
export type ProtocolSummary = Pick<
  Protocol,
  "id" | "name" | "version" | "category" | "chain" | "logo" | "purpose"
> & {
  contracts: number;
  flows: number;
  /** distinct SPDX ids of the mapped contracts */
  licenses: string[];
  /** contracts whose source is kept */
  excerpts: number;
  flowTitles: string[];
  /** the entry contract and what it reaches, readable at thumbnail size (gallery card) */
  preview: {
    hub: string;
    role: string;
    out: { to: string; verb: string; outside: boolean }[];
    /** targets not shown */
    more: number;
  };
};

/** What the Ask panel and the About panel are about. */
export type ExploreTarget =
  | { kind: "protocol" }
  | { kind: "flow"; flow: string; step?: number }
  | { kind: "contract"; name: string };
