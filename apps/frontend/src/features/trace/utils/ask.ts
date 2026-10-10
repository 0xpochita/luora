import type { Frame, LuoraData, TestResult } from "../types";
import { splitArgs } from "./format.ts";
import { displayKind } from "./frame.ts";
import { locateFrame } from "./source.ts";

/** A run of calls in one test's trace, by frame index, `from` ≤ `to` (GitHub's #L7-L11). */
export type CallRange = { from: number; to: number };

const MAX_CALLS = 60;
const MAX_LINES = 160;

/** "#7" or "#7–#11" */
export const rangeLabel = ({ from, to }: CallRange) =>
  from === to ? `#${from}` : `#${from}–#${to}`;

const kindWord = (f: Frame) => {
  const k = displayKind(f);
  return k === "VM" ? "CHEATCODE" : k;
};

/** What the composer's context strip says: the one call, or the range and where it starts. */
export function selectionText(frames: Frame[], r: CallRange): string {
  const f = frames[r.from];
  if (!f) return "";
  // values as the row writes them (1,000e6), not raw
  const args = splitArgs(f.args)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  if (r.from === r.to) return `#${r.from} ${f.to}.${f.fn}(${args})`;
  return `${rangeLabel(r)} · ${r.to - r.from + 1} calls from ${f.to}.${f.fn}`;
}

/** One call as a line: indented by depth, raw values (the model reads wei, not "1,000e6"). */
function callLine(f: Frame, i: number, base: number): string {
  const ret = f.ok
    ? f.ret
      ? ` returns ${f.ret}`
      : ""
    : ` REVERTED${f.ret ? `: ${f.ret}` : ""}`;
  const gas = f.gas != null && f.kind !== "EVENT" ? ` · gas ${f.gas}` : "";
  const site = f.callSite ? ` · at ${f.callSite.file}:${f.callSite.line}` : "";
  const store = f.storage?.length
    ? ` · storage ${f.storage.map((s) => `${s.op} ${s.file}:${s.line}`).join(", ")}`
    : "";
  return `${"  ".repeat(Math.max(0, f.d - base))}#${i} ${kindWord(f)} ${f.to}.${f.fn}(${f.args})${ret}${gas}${site}${store}`;
}

/** The source lines the calls ran (or the whole function without step data) and the lines they were made from. */
function sourceExcerpt(data: LuoraData, calls: Frame[]): string {
  const want: Record<string, Set<number>> = {};
  const add = (file: string, line: number) => {
    if (!data.sources[file]) return;
    want[file] ??= new Set();
    want[file].add(line);
  };
  for (const f of calls) {
    const span = locateFrame(data, f);
    if (span?.lines)
      for (const [file, ls] of Object.entries(span.lines))
        for (const l of ls) add(file, l);
    else if (span)
      for (let l = span.start; l <= span.end; l++) add(span.file, l);
    if (f.callSite) add(f.callSite.file, f.callSite.line - 1);
  }
  let budget = MAX_LINES;
  const out: string[] = [];
  for (const [file, set] of Object.entries(want)) {
    if (budget <= 0) break;
    const src = data.sources[file].split("\n");
    out.push(`--- ${file}`);
    let last = -2;
    for (const l of [...set].sort((a, b) => a - b)) {
      if (budget-- <= 0) break;
      if (l > last + 1 && last >= 0) out.push("  …");
      out.push(`${String(l + 1).padStart(5)}  ${src[l] ?? ""}`);
      last = l;
    }
  }
  return out.length ? out.join("\n") : "none";
}

/** The user message for one question about a run of calls: the test, the calls, their source, then the question. */
export function traceAskPrompt(
  data: LuoraData,
  test: TestResult,
  r: CallRange,
  question: string,
): string {
  const frames = test.frames;
  const to = Math.min(r.to, r.from + MAX_CALLS - 1);
  const calls = frames.slice(r.from, to + 1);
  const base = Math.min(...calls.map((f) => f.d));
  // the chain of callers above the first selected call
  const path: string[] = [];
  let d = frames[r.from]?.d ?? 0;
  for (let i = r.from - 1; i >= 0 && d > 0; i--)
    if (frames[i].d < d) {
      path.unshift(`#${i} ${frames[i].to}.${frames[i].fn}`);
      d = frames[i].d;
    }
  const status =
    test.status === "Success"
      ? "passed"
      : `${test.status.toLowerCase()}${test.reason ? ` (${test.reason})` : ""}`;
  return `<context>
Foundry test: ${test.name} in ${test.file}, ${status}
Called through: ${path.length ? path.join(" › ") : "the test itself"}
Selected calls, indented by call depth (# is the call's number in the trace):
${calls.map((f, i) => callLine(f, r.from + i, base)).join("\n")}${to < r.to ? `\n… ${r.to - to} more calls not shown` : ""}

Source lines these calls ran, or were made from:
${sourceExcerpt(data, calls)}
</context>

${question}
Refer to calls by their #number.`;
}

/** Starting questions for the selection (Copilot's predefined questions), all defensive. */
export function suggestions(frames: Frame[], r: CallRange): string[] {
  if (r.from !== r.to)
    return [
      "Walk me through these calls in order",
      "Which state do these calls change, and in what order?",
      "Do these calls follow checks-effects-interactions?",
      "Write a test that pins this behaviour",
    ];
  const f = frames[r.from];
  if (!f) return [];
  switch (displayKind(f)) {
    case "REVERT":
      return [
        "Why did this call revert?",
        "Is this revert the intended behaviour?",
        "What should an auditor check here?",
      ];
    case "EVENT":
      return [
        "What does this event record?",
        "Do its values match the state change around it?",
      ];
    case "VM":
      return [
        "What does this cheatcode set up for the test?",
        "How does it change the calls after it?",
      ];
    default:
      return [
        "What does this call do?",
        ...(f.gas ? [`Why does it cost ${f.gas.toLocaleString()} gas?`] : []),
        "What should an auditor check here?",
        "Write a test that pins this behaviour",
      ];
  }
}

/** "7" / "7-11" in the URL (?call=), the other way round too. */
export const rangeParam = ({ from, to }: CallRange) =>
  from === to ? String(from) : `${from}-${to}`;
export function parseRange(s: string | null): CallRange | null {
  const m = s?.match(/^(\d+)(?:-(\d+))?$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  return { from: Math.min(a, b), to: Math.max(a, b) };
}
