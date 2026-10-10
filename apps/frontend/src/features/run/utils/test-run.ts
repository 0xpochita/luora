import type { TestResult } from "../../trace/types";

/*
 * Start test (Trace sidebar): the app runs the exporter the auditor would run by hand,
 * `node luora-export.mjs`, and reads its result back. These are the pure parts: what may be run,
 * the stream between the route and the page, and the result in forge's own words.
 */

/**
 * The testnets Start test can add a fork run on: foundry/luora-chains.mjs's list (key, name, logo
 * family, chain id), which test-run.check.ts keeps equal to it.
 */
export const FORK_CHAINS = [
  {
    key: "sepolia",
    name: "Ethereum Sepolia",
    family: "ethereum",
    id: 11155111,
  },
  {
    key: "arbitrum-sepolia",
    name: "Arbitrum Sepolia",
    family: "arbitrum",
    id: 421614,
  },
  { key: "base-sepolia", name: "Base Sepolia", family: "base", id: 84532 },
  {
    key: "robinhood-testnet",
    name: "Robinhood Chain Testnet",
    family: "robinhood",
    id: 46630,
  },
  {
    key: "hyperevm-testnet",
    name: "HyperEVM Testnet",
    family: "hyperliquid",
    id: 998,
  },
  {
    key: "tempo-testnet",
    name: "Tempo Testnet (Moderato)",
    family: "tempo",
    id: 42431,
  },
] as const;

/**
 * A chain's name as brand and network, so the network reads second (Etherscan / Blockscout:
 * "Sepolia", "Testnet" beside the chain, quieter): "Base Sepolia" → ["Base", "Sepolia"],
 * "Tempo Testnet (Moderato)" → ["Tempo", "Moderato"].
 */
export function splitChain(name: string): [string, string] {
  const named = name.match(/^(.+?)(?: Testnet)? \((.+)\)$/);
  if (named) return [named[1], named[2]];
  const i = name.lastIndexOf(" ");
  return i > 0 ? [name.slice(0, i), name.slice(i + 1)] : [name, ""];
}

/** A Solidity identifier: what a suite (contract) or test function name can be, nothing else. */
const IDENT = /^[A-Za-z_$][\w$]{0,127}$/;
/** test_x() / testFuzz_x(uint256) → test_x / testFuzz_x */
const fnName = (name: string) => name.split("(")[0];
/** names as one forge filter, ^(a|b) then `end`, with $ (legal in identifiers) taken literally */
const anyOf = (names: Iterable<string>, end: string) =>
  `^(${[...new Set(names)].map((n) => n.replace(/\$/g, "\\$")).join("|")})${end}`;

export type RunScope = { suite: string; name: string }[];

/** Did forge's filters for `scope` take this test (the --mc × --mt cross-product)? */
export const inScope = (scope: RunScope, t: { suite: string; name: string }) =>
  scope.some((s) => s.suite === t.suite) &&
  scope.some((s) => fnName(s.name) === fnName(t.name));

/**
 * The exporter's arguments for a request body: the local run, plus `--forks <key>` for one listed
 * testnet, and for chosen tests forge's own filters (--mc on their contracts, --mt on their
 * functions; tests of the same name in another chosen contract run too). Names must be
 * identifiers, so the page can never pass forge a flag, a path or a pattern of its own.
 */
export function exportArgs(body: unknown): string[] | string {
  if (body == null || typeof body !== "object" || Array.isArray(body))
    return "Send a JSON object.";
  const { fork, tests } = body as { fork?: unknown; tests?: unknown };
  const args: string[] = [];
  if (fork != null && fork !== "") {
    const chain = FORK_CHAINS.find((c) => c.key === fork);
    if (!chain) return "Unknown fork.";
    args.push("--forks", chain.key);
  }
  if (tests != null) {
    if (!Array.isArray(tests) || !tests.length || tests.length > 500)
      return "Choose between 1 and 500 tests.";
    const picked: RunScope = [];
    for (const t of tests) {
      const { suite, name } = (t ?? {}) as { suite?: unknown; name?: unknown };
      if (
        typeof suite !== "string" ||
        typeof name !== "string" ||
        !IDENT.test(suite) ||
        !IDENT.test(fnName(name))
      )
        return "Tests are named by their contract and function.";
      picked.push({ suite, name: fnName(name) });
    }
    args.push(
      "--mc",
      anyOf(
        picked.map((t) => t.suite),
        "$",
      ),
      // forge matches --mt against the whole signature, test_x(uint256): the name, then its (
      "--mt",
      anyOf(
        picked.map((t) => t.name),
        "\\(",
      ),
    );
  }
  return args;
}

/** One line of the route's NDJSON stream. */
export type RunEvent =
  | { log: string; warn?: boolean; at: number }
  | { progress: Progress }
  | { done: true; code: number | null; file?: string; error?: string };

/** The exporter's `luora:: {…}` lines (LUORA_PROGRESS): what forge will run, then each result. */
export type Progress = {
  /** "local", or the fork's chain key */
  run: string;
  plan?: { suite: string; name: string }[];
  result?: Pick<TestResult, "suite" | "name" | "status" | "reason" | "kind">;
};

export function parseEvent(line: string): RunEvent | null {
  try {
    const e = JSON.parse(line);
    return e &&
      typeof e === "object" &&
      ("log" in e || "done" in e || "progress" in e)
      ? (e as RunEvent)
      : null;
  } catch {
    return null;
  }
}

export type Outcome = "pass" | "fail" | "skip";
export type ResultRow = {
  suite: string;
  name: string;
  outcome: Outcome;
  /** forge's revert reason or assertion message, for failures */
  reason: string | null;
  /** forge's own parenthesis: (gas: 107704), (runs: 256, calls: 128000, reverts: 110) */
  detail: string;
};

const num = (v: unknown) =>
  typeof v === "number" ? v.toLocaleString("en-US") : "?";

/** What forge prints after a test's name, from the test's `kind`. */
export function kindDetail(kind: TestResult["kind"]): string {
  if (typeof kind !== "object" || !kind) return "";
  const [[type, k]] = Object.entries(kind) as [
    string,
    Record<string, unknown>,
  ][];
  if (type === "Unit") return `gas: ${num(k?.gas)}`;
  if (type === "Fuzz")
    return `runs: ${num(k?.runs)}, μ: ${num(k?.mean_gas)}, ~: ${num(k?.median_gas)}`;
  if (type === "Invariant")
    return `runs: ${num(k?.runs)}, calls: ${num(k?.calls)}, reverts: ${num(k?.reverts)}`;
  return type;
}

const OUTCOME: Record<string, Outcome> = {
  Success: "pass",
  Failure: "fail",
  Skipped: "skip",
};

/**
 * The run as forge reports it: [PASS] / [FAIL] / [SKIP] per test and the suite tally, failures
 * first (what the auditor came to see; GitHub Actions opens a failed step the same way).
 */
const rowOf = (t: NonNullable<Progress["result"]>): ResultRow => ({
  suite: t.suite,
  name: t.name,
  outcome: OUTCOME[t.status] ?? "fail",
  reason: t.reason,
  detail: kindDetail(t.kind),
});

export function summarize(tests: TestResult[]) {
  const rows = tests.map(rowOf);
  const rank: Record<Outcome, number> = { fail: 0, pass: 1, skip: 2 };
  rows.sort((a, b) => rank[a.outcome] - rank[b.outcome]);
  const count = (o: Outcome) => rows.filter((r) => r.outcome === o).length;
  return {
    rows,
    passed: count("pass"),
    failed: count("fail"),
    skipped: count("skip"),
  };
}
export type RunSummary = ReturnType<typeof summarize>;

/** A run's tests as the log lists them: still running, or forge's verdict. */
export type LiveRow = Omit<ResultRow, "outcome"> & {
  outcome: Outcome | "running";
};
export type RunGroup = { run: string; rows: LiveRow[] };

/** a test's name without its parameters: `--list` gives test_x, results test_x(uint256) */
const bare = (name: string) => name.split("(")[0];

/**
 * The log's tests while the run goes: the plan lists them all as running, each result replaces its
 * row; runs (local, then the fork) keep the order they started in.
 */
export function applyProgress(groups: RunGroup[], p: Progress): RunGroup[] {
  if (!p || typeof p.run !== "string") return groups;
  let rows = groups.find((g) => g.run === p.run)?.rows ?? [];
  if (Array.isArray(p.plan))
    rows = p.plan.map((t) => ({
      suite: t.suite,
      name: `${t.name}()`,
      outcome: "running",
      reason: null,
      detail: "",
    }));
  if (p.result) {
    const r = rowOf(p.result);
    const i = rows.findIndex(
      (x) => x.suite === r.suite && bare(x.name) === bare(r.name),
    );
    rows = i < 0 ? [...rows, r] : rows.map((x, k) => (k === i ? r : x));
  }
  return groups.some((g) => g.run === p.run)
    ? groups.map((g) => (g.run === p.run ? { run: p.run, rows } : g))
    : [...groups, { run: p.run, rows }];
}

/** 83 → "1:23", the elapsed time a log line and the running button show. */
export const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
