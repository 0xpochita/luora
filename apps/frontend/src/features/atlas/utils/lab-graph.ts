import type { Piece, Risk } from "../types";
import { pctLabel, pieceCoverage } from "./coverage.ts";
import { type PlayModel, paramsOf } from "./playground.ts";
import { protocolOf } from "./protocols.ts";
import { word } from "./step-lines.ts";

/**
 * Lab node graph, ShaderLab style: cards with typed ports, wires between them. Pure logic only
 * (port typing, wire validation, socket positions, the read-only contract graph and its layout);
 * components/(main)/atlas/lab draws it.
 */

export type PortType =
  | "actor"
  | "amount"
  | "slot"
  | "event"
  | "bool"
  | "revert"
  | "flow";
export const PORT_COLOR: Record<PortType, string> = {
  actor: "#3fd4f2",
  amount: "#f4c542",
  slot: "#2bc4a4",
  event: "#a68bfa",
  bool: "#f2f3f4",
  revert: "#ff4545",
  flow: "#8a8f96",
};
export type Port = { id: string; label: string; type: PortType };

export type NodeKind =
  | "entry"
  | "slot"
  | "ext"
  | "event"
  | "actor"
  | "const"
  | "call"
  | "expect"
  | "assert"
  | "snapshot";
/** Title bar colour per card kind. */
export const KIND_COLOR: Record<NodeKind, string> = {
  entry: "#e0873a",
  call: "#e0873a",
  slot: "#1f9e86",
  snapshot: "#1f9e86",
  ext: "#3b8fd9",
  event: "#7f62d9",
  actor: "#2ba9c6",
  const: "#c99a1e",
  expect: "#c43c3c",
  assert: "#8d9399",
};

export type Badge = {
  label: string;
  tone: "bad" | "ok" | "warn" | "dim";
  title?: string;
};
export type GNode = {
  id: string;
  kind: NodeKind;
  title: string;
  x: number;
  y: number;
  w: number;
  inputs: Port[];
  outputs: Port[];
  /** execution-order ("then") ports on the title bar */
  flow?: boolean;
  /** inline value widgets, drawn above the port rows */
  widgets?: number;
  /** plain text rows under the ports */
  rows?: string[];
  /** atlas piece this card stands for (selection sync) */
  piece?: string;
  logo?: string;
  badges?: Badge[];
};
export type End = { node: string; port: string };
export type Wire = { from: End; to: End };

export const HEADER = 28;
export const ROW = 20;
export const WIDGET = 26;
const PAD = 8;
export const THEN: Port = { id: "then", label: "then", type: "flow" };

export const nodeHeight = (n: GNode) =>
  HEADER +
  (n.widgets ?? 0) * WIDGET +
  Math.max(n.inputs.length, n.outputs.length) * ROW +
  (n.rows?.length ?? 0) * ROW +
  PAD;

/** Canvas position of a socket: inputs on the left edge, outputs on the right, `then` on the title bar. */
export function portPos(n: GNode, port: string, side: "in" | "out") {
  const x = side === "in" ? n.x : n.x + n.w;
  if (port === "then") return { x, y: n.y + HEADER / 2 };
  const i = (side === "in" ? n.inputs : n.outputs).findIndex(
    (p) => p.id === port,
  );
  return {
    x,
    y:
      n.y + HEADER + (n.widgets ?? 0) * WIDGET + Math.max(0, i) * ROW + ROW / 2,
  };
}

export function portOf(n: GNode, port: string, side: "in" | "out") {
  if (port === "then") return n.flow ? THEN : null;
  return (side === "in" ? n.inputs : n.outputs).find((p) => p.id === port);
}

/** Smooth horizontal cubic bezier between two sockets. */
export function wirePath(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = Math.max(40, Math.abs(b.x - a.x) / 2);
  return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
}

/**
 * Why `from` (an output) cannot be wired to `to` (an input), or null when it can: same card,
 * port types differ, or an execution-order loop.
 */
export function wireError(
  nodes: GNode[],
  wires: Wire[],
  w: Wire,
): string | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const a = byId.get(w.from.node);
  const b = byId.get(w.to.node);
  const pa = a && portOf(a, w.from.port, "out");
  const pb = b && portOf(b, w.to.port, "in");
  if (!pa || !pb) return "no such port";
  if (a === b) return "same card";
  if (pa.type !== pb.type) return `${pa.type} → ${pb.type}`;
  // a wire a→b closes a loop when b already reaches a (data and then wires both order cards)
  const next = (id: string) =>
    wires.filter((x) => x.from.node === id).map((x) => x.to.node);
  const seen = new Set<string>();
  const stack = [b.id];
  while (stack.length) {
    const id = stack.pop() as string;
    if (id === a.id) return "loop";
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...next(id));
  }
  return null;
}

/** Adds `w`, replacing whatever was wired into the same input. */
export const connect = (wires: Wire[], w: Wire): Wire[] => [
  ...wires.filter((x) => x.to.node !== w.to.node || x.to.port !== w.to.port),
  w,
];

// ---- solidity signatures ------------------------------------------------------

/** Port type of a solidity type: (u)int → amount, bool → bool, address / contract → actor. */
export function portType(sol: string): PortType {
  if (/^u?int\d*$/.test(sol)) return "amount";
  if (sol === "bool") return "bool";
  return "actor";
}

const declOf = (
  m: Pick<PlayModel, "byId" | "lines" | "lineOf">,
  id: string,
) => {
  const p = m.byId[id];
  return p ? (m.lines[m.lineOf(p)] ?? "") : "";
};
export const argsOf = (
  m: Pick<PlayModel, "byId" | "lines" | "lineOf">,
  fn: string,
) => paramsOf(declOf(m, fn));
export const returnsOf = (
  m: Pick<PlayModel, "byId" | "lines" | "lineOf">,
  fn: string,
) => paramsOf(/returns\s*(\([^)]*\))/.exec(declOf(m, fn))?.[1] ?? "");

export type Revert = {
  /** "!owner", or a custom error "NotOwner()" */
  reason: string;
  /** "msg.sender == owner" */
  cond: string;
  line: number;
  /** modifier holding the check, null when inline */
  via: string | null;
};

const bodyOf = (m: Pick<PlayModel, "lineOf">, p: Piece) =>
  Array.from({ length: p.n ?? 1 }, (_, i) => m.lineOf(p) + i);

/** Every require / custom-error revert an entry point can hit: its modifiers first, then its body. */
export function revertsOf(
  m: Pick<PlayModel, "byId" | "pieces" | "lines" | "lineOf">,
  fn: string,
): Revert[] {
  const p = m.byId[fn];
  if (!p) return [];
  const decl = declOf(m, fn);
  const scan = (q: Piece, via: string | null): Revert[] =>
    bodyOf(m, q).flatMap((i) => {
      const l = m.lines[i] ?? "";
      const req = /require\s*\((.*),\s*"([^"]*)"\s*\)\s*;/.exec(l);
      if (req) return [{ reason: req[2], cond: req[1].trim(), line: i, via }];
      const err = /if\s*\((.*)\)\s*revert\s+(\w+)\s*\(/.exec(l);
      if (err)
        return [{ reason: `${err[2]}()`, cond: `!(${err[1]})`, line: i, via }];
      return [];
    });
  const mods = m.pieces.flatMap((q) => {
    const mod = q.sys === "access" && /^modifier\s+(\w+)/.exec(q.find);
    return mod && word(mod[1]).test(decl) ? scan(q, mod[1]) : [];
  });
  return [...mods, ...scan(p, null)];
}

// ---- contract graph -----------------------------------------------------------

const RANK: Record<Risk, number> = { high: 3, med: 2, low: 1, info: 0 };
const SEV = { high: "H", med: "M", low: "L", info: "I" } as const;
export const slotName = (p: Piece) =>
  (p.name.split("· ").pop() ?? p.name).replace("[]", "").trim();
const uniq = <T>(xs: T[]) => [...new Set(xs)];

/** Findings badge for a card: count and worst severity of the findings on that piece. */
export function findingBadge(
  m: Pick<PlayModel, "findings" | "lesion">,
  id: string,
): Badge | null {
  const fs = m.findings.filter(
    (f) => m.lesion[f.id] === id || (f.links ?? []).includes(id),
  );
  if (!fs.length) return null;
  const worst = fs.reduce((a, b) =>
    RANK[b.risk ?? "low"] > RANK[a.risk ?? "low"] ? b : a,
  );
  const r = worst.risk ?? "low";
  return {
    label: `▲${fs.length} ${SEV[r]}`,
    tone: r === "high" || r === "med" ? "bad" : "warn",
    title: fs.map((f) => f.name).join("\n"),
  };
}

/**
 * Ports of an entry function card: caller + typed args in; returns, slots written (`w:<slot>`),
 * external calls (`c:<call>`), events (`e:<event>`) and revert reasons (`r:<reason>`) out.
 */
export function entryPorts(m: PlayModel, fn: string) {
  const touched = (k: string) =>
    uniq((m.seq[fn] ?? []).filter(([s]) => s === k).map(([, t]) => t));
  const inputs: Port[] = [
    {
      id: "caller",
      label: `caller · ${m.byId[fn]?.caller ?? "anyone"}`,
      type: "actor",
    },
    ...argsOf(m, fn).map((a, i) => ({
      id: `a${i}`,
      label: `${a.name} : ${a.type}`,
      type: portType(a.type),
    })),
  ];
  const outputs: Port[] = [
    ...returnsOf(m, fn).map((a, i) => ({
      id: `ret${i}`,
      label: a.name || a.type,
      type: portType(a.type),
    })),
    ...touched("w").map((t) => ({
      id: `w:${t}`,
      label: slotName(m.byId[t]),
      type: "slot" as const,
    })),
    ...touched("c").map((t) => ({
      id: `c:${t}`,
      label: m.byId[t]?.member ?? m.byId[t]?.name ?? t,
      type: "actor" as const,
    })),
    ...touched("e").map((t) => ({
      id: `e:${t}`,
      label: m.byId[t]?.name ?? t,
      type: "event" as const,
    })),
    ...uniq(revertsOf(m, fn).map((r) => r.reason)).map((r) => ({
      id: `r:${r}`,
      label: r,
      type: "revert" as const,
    })),
  ];
  return { inputs, outputs };
}

const COL = { entry: 0, slot: 340, side: 610 } as const;
const GAP = 18;

/**
 * Read-only contract graph: one card per entry function (caller + typed args in; returns, slots
 * written, external calls, events and revert reasons out), cards for storage slots, external
 * contracts and events, wired from `model.seq`. Laid out in three columns, targets ordered by
 * the mean position of the functions that touch them so wires cross less.
 */
export function contractGraph(m: PlayModel): { nodes: GNode[]; wires: Wire[] } {
  const wires: Wire[] = [];
  const nodes: GNode[] = [];

  let y = 0;
  for (const fn of m.entry) {
    const p = m.byId[fn];
    if (!p) continue;
    const { inputs, outputs } = entryPorts(m, fn);
    const badges: Badge[] = [];
    const fb = findingBadge(m, fn);
    if (fb) badges.push(fb);
    const cov = m.coverage ? pieceCoverage(m as never, fn) : null;
    if (cov)
      badges.push({
        label: pctLabel(cov.pct),
        tone:
          cov.state === "covered"
            ? "ok"
            : cov.state === "untested"
              ? "bad"
              : "dim",
        title: `Tests cover lines ${cov.lines.hit}/${cov.lines.found}, branches ${cov.branches.hit}/${cov.branches.found}`,
      });
    const node: GNode = {
      id: fn,
      kind: "entry",
      title: p.name.replace("()", ""),
      x: COL.entry,
      y,
      w: 250,
      inputs,
      outputs,
      piece: fn,
      badges,
    };
    nodes.push(node);
    y += nodeHeight(node) + GAP;
    for (const o of outputs) {
      const [k, t] = o.id.split(":");
      const to =
        k === "c" ? m.callTarget[t] : k === "w" || k === "e" ? t : null;
      if (to)
        wires.push({
          from: { node: fn, port: o.id },
          to: { node: to, port: "in" },
        });
    }
  }

  // targets, ordered by the mean y of the cards wired into them
  const entryY = new Map(nodes.map((n) => [n.id, n.y]));
  const mean = (id: string) => {
    const ys = wires
      .filter((w) => w.to.node === id)
      .map((w) => entryY.get(w.from.node) ?? 0);
    return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 1e9;
  };
  const readers = (id: string) =>
    m.entry.filter((fn) =>
      (m.seq[fn] ?? []).some(([k, t]) => k === "r" && t === id),
    );
  const target = (p: Piece): GNode | null => {
    const fb = findingBadge(m, p.id);
    const base = {
      id: p.id,
      piece: p.id,
      badges: fb ? [fb] : [],
      outputs: [],
      w: 210,
      x: 0,
      y: 0,
    };
    const name = (id: string) => (m.byId[id]?.name ?? id).replace("()", "");
    if (p.sys === "storage") {
      const r = readers(p.id).map(name);
      return {
        ...base,
        kind: "slot",
        title: `${slotName(p)}${p.mapping ? "[ ]" : ""}`,
        inputs: [
          {
            id: "in",
            label: `slot ${p.slot ?? "?"} · written by`,
            type: "slot",
          },
        ],
        rows: r.length ? [`read by ${r.join(", ")}`] : [],
      };
    }
    if (p.sys === "deps") {
      const members = uniq(
        Object.entries(m.callTarget)
          .filter(([, d]) => d === p.id)
          .map(([c]) => m.byId[c]?.member ?? c),
      );
      return {
        ...base,
        kind: "ext",
        title: p.name,
        inputs: [{ id: "in", label: "called", type: "actor" }],
        rows: members.map((x) => `· ${x}()`),
        logo: protocolOf(p)?.logo,
      };
    }
    if (p.sys === "events")
      return {
        ...base,
        kind: "event",
        title: p.name,
        inputs: [{ id: "in", label: "emitted", type: "event" }],
        rows: paramsOf(m.lines[m.lineOf(p)] ?? "").map(
          (a) => `${a.name} : ${a.type}`,
        ),
      };
    return null;
  };
  const column = (sys: Piece["sys"][], x: number) => {
    const ns = m.pieces
      .filter((p) => sys.includes(p.sys))
      .map(target)
      .filter((n): n is GNode => !!n)
      .sort(
        (a, b) =>
          sys.indexOf(m.byId[a.id].sys) - sys.indexOf(m.byId[b.id].sys) ||
          mean(a.id) - mean(b.id),
      );
    let cy = 0;
    for (const n of ns) {
      n.x = x;
      n.y = cy;
      cy += nodeHeight(n) + GAP;
    }
    return ns;
  };
  nodes.push(
    ...column(["storage"], COL.slot),
    ...column(["deps", "events"], COL.side),
  );
  return { nodes, wires };
}
