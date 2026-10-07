import type { Frame } from "../types";

export type TreeNode = { index: number; frame: Frame; children: TreeNode[] };

/** Rebuild the call tree from depth-ordered frames (parent = nearest shallower frame). */
export function buildTree(
  frames: { index: number; frame: Frame }[],
): TreeNode[] {
  const roots: TreeNode[] = [];
  const stack: TreeNode[] = [];
  for (const { index, frame } of frames) {
    while (stack.length && stack[stack.length - 1].frame.d >= frame.d)
      stack.pop();
    const node: TreeNode = { index, frame, children: [] };
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(node);
    else roots.push(node);
    stack.push(node);
  }
  return roots;
}

export type Placed = { node: TreeNode; x: number; y: number; h: number };

/**
 * Tidy left-to-right layout: leaves stack downward, parents centre on their
 * children, then each column is pushed apart so cards never overlap.
 */
export function layoutTree(
  roots: TreeNode[],
  heightOf: (n: TreeNode) => number,
  colWidth = 380,
  gap = 22,
): Placed[] {
  const out: Placed[] = [];
  let cursor = 0;
  const place = (n: TreeNode, depth: number): Placed => {
    const h = heightOf(n);
    if (!n.children.length) {
      const p = { node: n, x: depth * colWidth, y: cursor, h };
      cursor += h + gap;
      out.push(p);
      return p;
    }
    const kids = n.children.map((c) => place(c, depth + 1));
    const first = kids[0];
    const last = kids[kids.length - 1];
    const p = {
      node: n,
      x: depth * colWidth,
      y: (first.y + first.h / 2 + last.y + last.h / 2) / 2 - h / 2,
      h,
    };
    out.push(p);
    return p;
  };
  for (const r of roots) place(r, 0);

  const columns = new Map<number, Placed[]>();
  for (const p of out) columns.set(p.x, [...(columns.get(p.x) ?? []), p]);
  for (const col of columns.values()) {
    col.sort((a, b) => a.y - b.y);
    for (let i = 1; i < col.length; i++)
      col[i].y = Math.max(col[i].y, col[i - 1].y + col[i - 1].h + gap);
  }
  const minY = Math.min(0, ...out.map((p) => p.y));
  for (const p of out) p.y -= minY;
  return out;
}
