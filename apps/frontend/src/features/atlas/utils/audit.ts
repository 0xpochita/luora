import type { Piece, Risk } from "../types";
import type { AtlasModel } from "./model";
import { word } from "./step-lines.ts";

const RANK: Record<Risk, number> = { high: 3, med: 2, low: 1 };
export const SEVERITY = { high: "HIGH", med: "MED", low: "LOW" } as const;
export const rankOf = (f: Piece) => RANK[f.risk ?? "low"];

/** "F-01 State written after external call in deposit()" → "State written after external call". */
export function shortTitle(f: Piece, max = 34): string {
  const t = f.name
    .replace(/^F-\d+\s*/, "")
    .replace(/\s+(in|on)\s+\w+\(\)$/, "")
    .trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Findings per host building, highest severity first; groups ordered the same way. */
export function findingGroups(
  model: Pick<AtlasModel, "findings" | "lesion">,
): { host: string; findings: Piece[] }[] {
  const by = new Map<string, Piece[]>();
  for (const f of model.findings) {
    const host = model.lesion[f.id];
    if (host) by.set(host, [...(by.get(host) ?? []), f]);
  }
  return [...by]
    .map(([host, fs]) => ({
      host,
      findings: fs.sort((a, b) => rankOf(b) - rankOf(a)),
    }))
    .sort((a, b) => rankOf(b.findings[0]) - rankOf(a.findings[0]));
}

/**
 * Lines a piece covers in the source panel. Slots, calls and events also light up every line
 * that uses them (reads / writes / call sites / emits), not just the declaration.
 */
export function linesOf(
  model: Pick<AtlasModel, "lines" | "lineOf">,
  p: Piece,
): number[] {
  const start = model.lineOf(p);
  const own = Array.from({ length: p.n ?? 1 }, (_, i) => start + i);
  const name =
    p.sys === "storage"
      ? (p.name.split("· ").pop() ?? "").replace("[]", "")
      : p.sys === "calls" && p.target && p.member
        ? `${p.target}.${p.member}`
        : p.sys === "events"
          ? `emit ${p.name}`
          : "";
  if (!name.trim()) return own;
  const re = word(name.trim());
  const uses = model.lines.flatMap((l, i) =>
    re.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l) ? [i] : [],
  );
  return [...new Set([...own, ...uses])].sort((a, b) => a - b);
}

/**
 * Piece a clicked source line belongs to: a piece declared on that line (function header, call
 * site, slot), else a finding whose red line it is, else the narrowest piece covering it.
 */
export function pieceAtLine(
  model: Pick<AtlasModel, "pieces" | "findings" | "lineOf">,
  line: number,
): string | null {
  const mapped = model.pieces.filter((p) => p.sys !== "vulns" && !p.ghost);
  const narrowest = (ps: Piece[]) =>
    ps.reduce<Piece | null>(
      (b, p) => (!b || (p.n ?? 1) < (b.n ?? 1) ? p : b),
      null,
    )?.id ?? null;
  const declared = narrowest(mapped.filter((p) => model.lineOf(p) === line));
  if (declared) return declared;
  const f = model.findings.find((x) =>
    (x.mark ?? [0]).some((m) => model.lineOf(x) + m === line),
  );
  if (f) return f.id;
  return narrowest(
    mapped.filter((p) => {
      const a = model.lineOf(p);
      return line >= a && line < a + (p.n ?? 1);
    }),
  );
}
