import { COLORS, LAYERS, SYS_COLOR } from "../data/layers";
import type { AtlasData, Layer, Piece } from "../types";
import { resolveStepLines } from "./step-lines";

export const colorOf = (p: Piece) => COLORS[SYS_COLOR[p.sys]];

export type AtlasModel = ReturnType<typeof createAtlasModel>;

/** Lookups and derived relations over one contract's atlas data. */
export function createAtlasModel(data: AtlasData) {
  const byId: Record<string, Piece> = Object.fromEntries(
    data.pieces.map((p) => [p.id, p]),
  );
  const findings = data.pieces.filter((p) => p.sys === "vulns");
  const lines = data.source.split("\n");
  const lineOf = (p: Piece) =>
    p.line ??
    Math.max(
      0,
      lines.findIndex((l) => l.includes(p.find)),
    );

  function layerOf(p: Piece): Layer {
    const host = p.sys === "vulns" ? byId[data.lesion[p.id]] : p;
    if (!host || host.sys === "vulns") return LAYERS[0];
    return LAYERS.find((L) => L.sys.includes(host.sys)) ?? LAYERS[0];
  }

  /** Undirected, de-duplicated relations between pieces. */
  const links: [string, string][] = [];
  const seen = new Set<string>();
  for (const p of data.pieces)
    for (const t of p.links ?? []) {
      const k = [p.id, t].sort().join("|");
      if (byId[t] && !seen.has(k)) {
        seen.add(k);
        links.push([p.id, t]);
      }
    }

  function neighbours(id: string): Set<string> {
    const n = new Set([id]);
    for (const [a, b] of links) {
      if (a === id) n.add(b);
      if (b === id) n.add(a);
    }
    return n;
  }

  /** A write after a state-changing external call breaks checks-effects-interactions. */
  function lateWrites(fn: string): boolean[] {
    let called = false;
    return (data.seq[fn] ?? []).map(([k, t]) => {
      if (k === "c" && !byId[t]?.view) called = true;
      return k === "w" && called;
    });
  }

  /** Source line of each step of `fn` (helpers and modifiers inlined, see resolveStepLines). */
  const stepLines = (fn: string) => resolveStepLines(data, lines, lineOf, fn);

  /** Weighted finding severity → 0..10. */
  function riskScore(): number {
    if (!findings.length) return 0;
    const w = { high: 3, med: 2, low: 1, info: 0 } as const;
    const score = findings.reduce((s, f) => s + w[f.risk ?? "low"], 0);
    return (score / (findings.length * 3)) * 10;
  }

  return {
    ...data,
    byId,
    findings,
    lines,
    lineOf,
    layerOf,
    links,
    neighbours,
    lateWrites,
    stepLines,
    riskScore,
    hasFinding: (id: string) =>
      findings.some((f) => (f.links ?? []).includes(id)),
    isLesionHost: (id: string) =>
      findings.some((f) => data.lesion[f.id] === id),
    gated: (id: string) => (byId[id].caller ?? "anyone") !== "anyone",
  };
}
