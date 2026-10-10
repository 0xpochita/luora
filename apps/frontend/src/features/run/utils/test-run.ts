import type { TestResult } from "../../trace/types";

/*
 * Start test (Trace sidebar): the app runs the exporter the auditor would run by hand,
 * `node luora-export.mjs`, and reads its result back. These are the pure parts: what may be run,
 * the stream between the route and the page, and the result in forge's own words.
 */

/**
 * The testnets Start test can add a fork run on: foundry/luora-chains.mjs's list (key, name, logo
 * family), which test-run.check.ts keeps equal to it.
 */
export const FORK_CHAINS = [
  { key: "sepolia", name: "Ethereum Sepolia", family: "ethereum" },
  { key: "arbitrum-sepolia", name: "Arbitrum Sepolia", family: "arbitrum" },
  { key: "base-sepolia", name: "Base Sepolia", family: "base" },
  {
    key: "robinhood-testnet",
    name: "Robinhood Chain Testnet",
    family: "robinhood",
  },
  { key: "hyperevm-testnet", name: "HyperEVM Testnet", family: "hyperliquid" },
  { key: "tempo-testnet", name: "Tempo Testnet (Moderato)", family: "tempo" },
] as const;

/**
 * The exporter's arguments for a request body: nothing (the local run), or `--forks <key>` for one
 * listed testnet. Anything else is refused, so the page can never pass forge a flag or a path.
 */
export function exportArgs(body: unknown): string[] | string {
  if (body == null || typeof body !== "object" || Array.isArray(body))
    return "Send a JSON object.";
  const { fork } = body as { fork?: unknown };
  if (fork == null || fork === "") return [];
  const chain = FORK_CHAINS.find((c) => c.key === fork);
  return chain ? ["--forks", chain.key] : "Unknown fork.";
}

/** One line of the route's NDJSON stream. */
export type RunEvent =
  | { log: string; warn?: boolean; at: number }
  | { done: true; code: number | null; file?: string; error?: string };

export function parseEvent(line: string): RunEvent | null {
  try {
    const e = JSON.parse(line);
    return e && typeof e === "object" && ("log" in e || "done" in e)
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
export function summarize(tests: TestResult[]) {
  const rows: ResultRow[] = tests.map((t) => ({
    suite: t.suite,
    name: t.name,
    outcome: OUTCOME[t.status] ?? "fail",
    reason: t.reason,
    detail: kindDetail(t.kind),
  }));
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

/** 83 → "1:23", the elapsed time a log line and the running button show. */
export const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
