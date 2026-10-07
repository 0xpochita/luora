import { COLORS, LAYERS, LESION, PIECES, SEQ, SYS_COLOR } from "../data/pieces";
import { SOURCE } from "../data/source";
import type { Layer, Piece } from "../types";

export const byId: Record<string, Piece> = Object.fromEntries(
  PIECES.map((p) => [p.id, p]),
);
export const FINDINGS = PIECES.filter((p) => p.sys === "vulns");
export const LINES = SOURCE.split("\n");
export const lineOf = (anchor: string) =>
  Math.max(
    0,
    LINES.findIndex((l) => l.includes(anchor)),
  );
export const colorOf = (p: Piece) => COLORS[SYS_COLOR[p.sys]];

export function layerOf(p: Piece): Layer {
  if (p.sys === "vulns") return layerOf(byId[LESION[p.id]]);
  return LAYERS.find((L) => L.sys.includes(p.sys)) ?? LAYERS[0];
}

/** Undirected, de-duplicated relations between pieces. */
export const LINKS: [string, string][] = (() => {
  const out: [string, string][] = [];
  const seen = new Set<string>();
  for (const p of PIECES)
    for (const t of p.links ?? []) {
      const k = [p.id, t].sort().join("|");
      if (byId[t] && !seen.has(k)) {
        seen.add(k);
        out.push([p.id, t]);
      }
    }
  return out;
})();

export function neighbours(id: string): Set<string> {
  const n = new Set([id]);
  for (const [a, b] of LINKS) {
    if (a === id) n.add(b);
    if (b === id) n.add(a);
  }
  return n;
}

export const hasFinding = (id: string) =>
  FINDINGS.some((f) => (f.links ?? []).includes(id));
export const isLesionHost = (id: string) =>
  FINDINGS.some((f) => LESION[f.id] === id);
export const gated = (id: string) =>
  (byId[id].links ?? []).includes("onlyOwner");

/** A write that happens after an external call breaks checks-effects-interactions. */
export function lateWrites(fn: string): boolean[] {
  let called = false;
  return (SEQ[fn] ?? []).map(([k]) => {
    if (k === "c") called = true;
    return k === "w" && called;
  });
}

/** Weighted finding severity → 0..10. */
export function riskScore(): number {
  const w = { high: 3, med: 2, low: 1 } as const;
  const score = FINDINGS.reduce((s, f) => s + w[f.risk ?? "low"], 0);
  return (score / (FINDINGS.length * 3)) * 10;
}
