import type {
  AtlasData,
  FindingReport,
  FindingTool,
  Piece,
  Risk,
  Triage,
  TriageStatus,
} from "../types";

export const SEVERITIES: Risk[] = ["high", "med", "low", "info"];
export const TOOLS: FindingTool[] = ["slither", "aderyn", "manual"];
export const SEVERITY_LABEL = {
  high: "High",
  med: "Medium",
  low: "Low",
  info: "Info",
} as const;
export const TOOL_LABEL: Record<FindingTool, string> = {
  slither: "Slither",
  aderyn: "Aderyn",
  manual: "Manual",
};
export const TRIAGE_LABEL: Record<TriageStatus, string> = {
  open: "Open",
  confirmed: "Confirmed",
  "false-positive": "False positive",
  duplicate: "Duplicate",
};
export const OPEN: Triage = { status: "open", note: "" };

/** False positives and duplicates fade out of the City. */
export const isDismissed = (t?: Triage) =>
  t?.status === "false-positive" || t?.status === "duplicate";

/** Every tool report of a finding; older exports carry none, so they count as one manual report. */
export const reportsOf = (f: Piece): FindingReport[] =>
  f.reports ?? [
    {
      tool: f.tool ?? "manual",
      detector: f.detector ?? "luora",
      risk: f.risk ?? "low",
      confidence: f.confidence,
    },
  ];

/** 0-based source lines a finding flags: its marks from the anchor line `at`, else the anchor. */
export const flaggedLines = (f: Piece, at: number) =>
  (f.mark?.length ? f.mark : [0]).map((m) => at + m);

/** 0-based lines → "75, 77–79" (1-based). */
export function lineRanges(lines: number[]): string {
  const out: string[] = [];
  const xs = [...new Set(lines)].sort((a, b) => a - b);
  for (let i = 0; i < xs.length; i++) {
    let j = i;
    while (xs[j + 1] === xs[j] + 1) j++;
    out.push(i === j ? `${xs[i] + 1}` : `${xs[i] + 1}–${xs[j] + 1}`);
    i = j;
  }
  return out.join(", ");
}

/** Descriptions end with "Fix: …": split into what is wrong and how to fix it. */
export function splitFix(desc: string): [string, string] {
  const i = desc.lastIndexOf("Fix:");
  return i < 0
    ? [desc.trim(), ""]
    : [desc.slice(0, i).trim(), desc.slice(i + 4).trim()];
}

export const titleOf = (f: Piece) => f.name.replace(/^F-\d+ /, "");

const ID_PREFIX: Record<Risk, string> = {
  high: "H",
  med: "M",
  low: "L",
  info: "I",
};

/**
 * Markdown report of the confirmed findings, Code4rena / Sherlock style: summary table, then per
 * finding severity, sources, file:line location, the flagged code (`// @audit`), description,
 * recommendation and the auditor's note.
 */
export function findingsReport(
  data: AtlasData,
  triage: Record<string, Triage | undefined>,
  date = new Date(),
): string {
  const lines = data.source.split("\n");
  const at = (p: Piece) =>
    p.line ??
    Math.max(
      0,
      lines.findIndex((l) => l.includes(p.find)),
    );
  const confirmed = data.pieces
    .filter((p) => p.sys === "vulns" && triage[p.id]?.status === "confirmed")
    .sort(
      (a, b) =>
        SEVERITIES.indexOf(a.risk ?? "low") -
          SEVERITIES.indexOf(b.risk ?? "low") || at(a) - at(b),
    );
  const seen: Partial<Record<Risk, number>> = {};
  const items = confirmed.map((f) => {
    const risk = f.risk ?? "low";
    seen[risk] = (seen[risk] ?? 0) + 1;
    return {
      f,
      risk,
      id: `${ID_PREFIX[risk]}-${String(seen[risk]).padStart(2, "0")}`,
    };
  });
  const counts = SEVERITIES.filter((s) => seen[s])
    .map((s) => `${seen[s]} ${SEVERITY_LABEL[s]}`)
    .join(", ");

  const out = [
    `# ${data.contract} — audit findings`,
    "",
    "| | |",
    "| --- | --- |",
    `| Contract | \`${data.contract}\` (\`${data.file}\`) |`,
    `| Compiler | solc ${data.compiler} |`,
    `| Date | ${date.toLocaleDateString("en-CA")} |`,
    `| Findings | ${items.length} confirmed${counts ? ` (${counts})` : ""} |`,
    "",
  ];
  if (!items.length) return [...out, "_No confirmed findings._", ""].join("\n");
  out.push(
    "## Summary",
    "",
    "| ID | Title | Severity |",
    "| --- | --- | --- |",
    ...items.map(
      ({ f, risk, id }) =>
        `| [${id}] | ${titleOf(f).replaceAll("|", "\\|")} | ${SEVERITY_LABEL[risk]} |`,
    ),
    "",
  );
  for (const { f, risk, id } of items) {
    const flagged = flaggedLines(f, at(f));
    const [what, fix] = splitFix(f.desc);
    const by = reportsOf(f)
      .map((r) =>
        r.tool === "manual"
          ? "Manual review"
          : `${TOOL_LABEL[r.tool]} \`${r.detector}\`${r.confidence ? ` (confidence ${SEVERITY_LABEL[r.confidence]})` : ""}`,
      )
      .join(", ");
    // flagged lines with one line of context, gaps elided
    const shown = new Set(flagged.flatMap((l) => [l - 1, l, l + 1]));
    const snippet: string[] = [];
    let prev = -2;
    for (const l of [...shown].sort((a, b) => a - b)) {
      if (l < 0 || l >= lines.length) continue;
      if (prev >= 0 && l > prev + 1) snippet.push("    // ...");
      snippet.push(`${lines[l]}${flagged.includes(l) ? " // @audit" : ""}`);
      prev = l;
    }
    const note = triage[f.id]?.note.trim();
    out.push(
      "---",
      "",
      `## [${id}] ${titleOf(f)}`,
      "",
      `**Severity:** ${SEVERITY_LABEL[risk]} · **Reported by:** ${by}`,
      "",
      "### Location",
      "",
      lineRanges(flagged)
        .split(", ")
        .map((r) => `- \`${data.file}:${r.replace("–", "-")}\``)
        .join("\n"),
      "",
      "```solidity",
      ...snippet,
      "```",
      "",
      "### Description",
      "",
      what,
      "",
      "### Recommendation",
      "",
      fix || "See description.",
      "",
      ...(note ? ["### Auditor note", "", note, ""] : []),
    );
  }
  return out.join("\n");
}
