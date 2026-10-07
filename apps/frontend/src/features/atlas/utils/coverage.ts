import type { AtlasData, CoverageCount } from "../types";

/** untested = body never ran, partial = some lines or branches missed, covered = everything ran */
export type CovState = "untested" | "partial" | "covered";
export type PieceCov = {
  /** lines + branches hit / found, 0..1 */
  pct: number;
  lines: CoverageCount;
  branches: CoverageCount;
  calls?: number;
  state: CovState;
};

export const ratio = (c: CoverageCount) => (c.found ? c.hit / c.found : 1);
export const pctLabel = (x: number) => `${Math.round(x * 100)}%`;

/** Coverage of one piece's body, or null when the piece holds no executable code / no coverage ran. */
export function pieceCoverage(data: AtlasData, id: string): PieceCov | null {
  const c = data.coverage?.pieces[id];
  if (!c) return null;
  const hit = c.lines.hit + c.branches.hit;
  const found = c.lines.found + c.branches.found;
  const state: CovState = !c.lines.hit
    ? "untested"
    : hit === found
      ? "covered"
      : "partial";
  return { ...c, pct: ratio({ hit, found }), state };
}

/** Entry point that writes storage or makes a state-changing external call. */
export function isStateChanging(data: AtlasData, id: string): boolean {
  if (!data.entry.includes(id)) return false;
  return (data.seq[id] ?? []).some(
    ([k, t]) =>
      k === "w" || (k === "c" && !data.pieces.find((p) => p.id === t)?.view),
  );
}

export type FocusItem = { id: string; cov: PieceCov; why: string };

/**
 * Audit focus list: state-changing entry points whose body never ran (worst first), then the ones
 * with untested lines or branches.
 */
export function coverageFocus(data: AtlasData): {
  untested: FocusItem[];
  gaps: FocusItem[];
} {
  const items = data.entry.flatMap((id) => {
    const cov = pieceCoverage(data, id);
    if (!cov || cov.state === "covered" || !isStateChanging(data, id))
      return [];
    const missed = cov.branches.found - cov.branches.hit;
    const why =
      cov.state === "partial"
        ? missed
          ? `${missed} branch${missed > 1 ? "es" : ""} never taken`
          : `${cov.lines.found - cov.lines.hit} line(s) never run`
        : cov.calls
          ? "Only reverts, body never ran"
          : "Never called by a test";
    return [{ id, cov, why }];
  });
  const byPct = (a: FocusItem, b: FocusItem) => a.cov.pct - b.cov.pct;
  return {
    untested: items.filter((x) => x.cov.state === "untested").sort(byPct),
    gaps: items.filter((x) => x.cov.state === "partial").sort(byPct),
  };
}

/** 1234 → "1.2k": compact hit count for the source gutter. */
export function hitLabel(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1e6) return `${+(n / 1e3).toFixed(n < 1e4 ? 1 : 0)}k`;
  return `${+(n / 1e6).toFixed(1)}M`;
}
