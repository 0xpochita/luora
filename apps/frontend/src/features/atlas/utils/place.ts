import { LAYERS } from "../data/layers";
import type { Layer, Piece } from "../types";

/** Distance between grid cells on a plate (world units). */
export const CELL = 1.6;
/** Outermost ring that still fits on a plate of this half-width. */
export const reach = (half: number) => Math.floor((half - 0.6) / CELL);

function ring(r: number): [number, number][] {
  if (r === 0) return [[0, 0]];
  const out: [number, number][] = [];
  for (let i = -r; i <= r; i++)
    for (let j = -r; j <= r; j++)
      if (Math.max(Math.abs(i), Math.abs(j)) === r) out.push([i, j]);
  return out.sort(
    ([a, b], [c, d]) => Math.atan2(b, a) - Math.atan2(d, c) || a - c,
  );
}

/**
 * Grid cell per piece. Each layer fills its rings outermost-first, starting with the rings
 * the plate above doesn't cover, spreading pieces evenly around a ring; rings past the plate
 * edge take any overflow so every piece gets a cell.
 */
export function placePieces(
  pieces: Piece[],
  layerOf: (p: Piece) => Layer,
): Record<string, [number, number]> {
  const spot: Record<string, [number, number]> = {};
  LAYERS.forEach((L, li) => {
    const ids = pieces
      .filter((p) => p.sys !== "vulns" && layerOf(p) === L)
      .map((p) => p.id);
    const n = reach(L.half);
    const covered = li > 0 ? Math.min(n, reach(LAYERS[li - 1].half)) : -1;
    const order = [
      ...Array.from({ length: n - covered }, (_, k) => n - k),
      ...Array.from({ length: covered + 1 }, (_, k) => covered - k),
    ];
    let k = 0;
    for (let o = 0; k < ids.length; o++) {
      const cells = ring(order[o] ?? n + o - order.length + 1);
      const take = Math.min(ids.length - k, cells.length);
      for (let t = 0; t < take; t++)
        spot[ids[k++]] = cells[Math.floor((t * cells.length) / take)];
    }
  });
  return spot;
}
