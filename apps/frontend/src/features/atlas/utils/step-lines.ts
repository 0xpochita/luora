import type { AtlasData, Piece } from "../types";

/** Regex for `s` as a whole identifier / expression (no word char or $ on either side). */
export const word = (s: string) =>
  new RegExp(
    `(?<![\\w$])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w$])`,
  );

/** Text that marks where a step touches its target on a source line. */
function needleOf(k: string, p: Piece): RegExp | null {
  if (k === "e") return word(`emit ${p.name}`);
  if (k === "c")
    return p.target && p.member
      ? word(`${p.target}.${p.member}`)
      : p.find
        ? word(p.find)
        : null;
  const name = (p.name.split("· ").pop() ?? "").replace("[]", "").trim();
  return name ? word(name) : null;
}

/**
 * Source line of each step of `fn`. Walks the body in execution order with modifier bodies
 * first and internal helpers (`_price()`) inlined before the line that calls them, so a step
 * reached through a helper points at the helper line that actually reads / writes / calls.
 * Each (line, step kind + target) is used once, so a repeated read moves on to the next use.
 * Falls back to the target's own line (declaration) when nothing matches.
 */
export function resolveStepLines(
  data: Pick<AtlasData, "pieces" | "seq" | "internal">,
  lines: string[],
  lineOf: (p: Piece) => number,
  fn: string,
): number[] {
  const byId = new Map(data.pieces.map((p) => [p.id, p]));
  const entry = byId.get(fn);
  if (!entry) return [];
  const helpers = data.internal
    .map((id) => byId.get(id))
    .filter((p): p is Piece => !!p && p.name.startsWith("_"))
    .map((p) => ({ p, call: word(p.name.replace(/\(.*$/, "")) }));
  const modifiers = data.pieces.flatMap((p) => {
    const m = p.sys === "access" && /^modifier\s+(\w+)/.exec(p.find);
    return m ? [{ p, use: word(m[1]) }] : [];
  });
  const body = (p: Piece) => {
    const at = lineOf(p);
    return Array.from(
      { length: Math.max(0, (p.n ?? 1) - 1) },
      (_, i) => at + 1 + i,
    );
  };

  const order: number[] = [];
  const walk = (p: Piece, seen: Set<string>) => {
    for (const i of body(p)) {
      if (/^\s*_;/.test(lines[i] ?? "")) continue;
      for (const h of helpers)
        if (!seen.has(h.p.id) && h.call.test(lines[i] ?? ""))
          walk(h.p, new Set([...seen, h.p.id]));
      order.push(i);
    }
  };
  const decl = lines[lineOf(entry)] ?? "";
  for (const m of modifiers)
    if (m.use.test(decl)) walk(m.p, new Set([entry.id, m.p.id]));
  walk(entry, new Set([entry.id]));

  let at = 0;
  const used = new Set<string>();
  return (data.seq[fn] ?? []).map(([k, t]) => {
    const p = byId.get(t);
    const needle = p && needleOf(k, p);
    if (!p || !needle) return order[at] ?? lineOf(entry);
    for (let j = at; j < order.length; j++) {
      const key = `${order[j]}:${k}${t}`;
      if (!used.has(key) && needle.test(lines[order[j]] ?? "")) {
        used.add(key);
        at = j;
        return order[j];
      }
    }
    return lineOf(p);
  });
}
