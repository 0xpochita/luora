import type { Frame, TestResult } from "../types";

/*
 * Why a test passed or failed, from what the export holds: its executed source lines, the calls
 * each line made, forge's verdict. Read the way auditors already read `forge test -vvvv`.
 */

/** forge-std's checks and Foundry's expectations, as they appear on a test's source line */
const CHECK = /\b(assert\w*|expect(?:Revert|PartialRevert|Emit|Call)\w*)\s*\(/;

export type Check = {
  line: number;
  /** the source line, trimmed */
  code: string;
  /** what the test called on that line (the values the check compared) */
  calls: Frame[];
  ok: boolean;
};

/**
 * The checks the test ran, in order: every executed line of its body that asserts or expects
 * something. forge-std's assertEq leaves no frame of its own, so the line is the check and the
 * calls on it are its values. A failing test stops at its last executed line: that check failed.
 */
export function checksOf(test: TestResult, source: string | undefined) {
  const src = source?.split("\n") ?? [];
  const ran = [...new Set(test.frames[0]?.lines?.[test.file] ?? [])];
  const failLine = test.status === "Failure" ? ran.at(-1) : undefined;
  const checks: Check[] = ran
    .filter((l) => CHECK.test(src[l - 1] ?? ""))
    .map((line) => ({
      line,
      code: src[line - 1].trim(),
      calls: test.frames.filter(
        (f) =>
          f.d === 1 &&
          f.kind !== "EVENT" &&
          f.callSite?.file === test.file &&
          f.callSite.line === line,
      ),
      ok: line !== failLine,
    }));
  return { checks, failLine };
}

const n = (v: unknown) =>
  typeof v === "number" ? v.toLocaleString("en-US") : "?";

/** One sentence: why forge gave this verdict. */
export function whyOf(test: TestResult, checks: Check[], failLine?: number) {
  if (test.status === "Skipped")
    return "Skipped: the test skipped itself (vm.skip), so it checked nothing on this run.";
  if (test.status === "Failure")
    return `Failed${failLine ? ` at line ${failLine}` : ""}: ${test.reason || "it reverted"}.`;
  const [type, k = {}] = Object.entries(
    typeof test.kind === "object" ? test.kind : { [test.kind]: {} },
  )[0] as [string, Record<string, unknown>];
  if (type === "Invariant")
    return `Held: forge made ${n(k.calls)} random calls over ${n(k.runs)} runs and the invariant was true after each${k.reverts ? ` (${n(k.reverts)} calls reverted, which this test allows)` : ""}.`;
  if (type === "Fuzz")
    return `Held for all ${n(k.runs)} fuzzed inputs: none made it revert or fail a check.`;
  const asserts = checks.filter((c) => /assert/.test(c.code)).length;
  const expects = checks.some((c) => /expect/.test(c.code));
  return `Passed: Foundry passes a test that ends without reverting, and this one did${asserts ? `; its ${asserts} assertion${asserts > 1 ? "s" : ""} held` : ""}${expects ? `; the revert it expected happened` : ""}.`;
}

export type TreeLine = { prefix: string; frame: Frame };

/**
 * The call tree drawn like `forge test -vvvv`: ├─ for a call with more siblings after it, └─ for
 * the last, │ carrying an open branch down.
 */
export function forgeTree(frames: Frame[]): TreeLine[] {
  const last = frames.map((f, i) => {
    for (let j = i + 1; j < frames.length; j++) {
      if (frames[j].d < f.d) return true;
      if (frames[j].d === f.d) return false;
    }
    return true;
  });
  const open: boolean[] = []; // per depth: does that branch continue below?
  return frames.map((f, i) => {
    open[f.d] = !last[i];
    if (f.d === 0) return { prefix: "", frame: f };
    let prefix = "";
    for (let d = 1; d < f.d; d++) prefix += open[d] ? "│  " : "   ";
    return { prefix: prefix + (last[i] ? "└─ " : "├─ "), frame: f };
  });
}
