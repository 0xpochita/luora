import { wirePath } from "../../atlas/utils/lab-graph.ts";
import type {
  Edge,
  EdgeKind,
  Flow,
  Protocol,
  ProtocolContract,
  ProtocolSummary,
} from "../types";

/**
 * Pure logic for the Explore pages: gallery summary, GitHub links, the protocol map's layout
 * (docs/ux/explore.md) and the flow lane layout. Components in components/(main)/explore draw it.
 */

export function summarize(p: Protocol): ProtocolSummary {
  return {
    id: p.id,
    name: p.name,
    version: p.version,
    category: p.category,
    chain: p.chain,
    logo: p.logo,
    purpose: p.purpose,
    contracts: p.contracts.length,
    flows: p.flows.length,
    licenses: [
      ...new Set(p.contracts.map((c) => c.license ?? "unknown")),
    ].sort(),
    excerpts: p.contracts.filter((c) => c.excerpts).length,
    flowTitles: p.flows.map((f) => f.title),
    preview: hubPreview(p),
  };
}

/** what the hub's relations are shown first: the work it hands off, then what it calls */
const PREVIEW_ORDER: EdgeKind[] = [
  "delegates",
  "calls",
  "deploys",
  "uses",
  "holds",
];
const PREVIEW_ROWS = 5;

/** The first contract (the entry point) and the contracts it reaches, one row per target. */
export function hubPreview(p: Protocol): ProtocolSummary["preview"] {
  const hub = p.contracts[0];
  const by = new Map<string, EdgeKind[]>();
  for (const e of p.edges)
    if (e.from === hub.name && e.kind !== "inherits")
      by.set(e.to, [...(by.get(e.to) ?? []), e.kind]);
  const rank = (ks: EdgeKind[]) =>
    Math.min(...ks.map((k) => PREVIEW_ORDER.indexOf(k)));
  const out = [...by.entries()]
    .sort((a, b) => rank(a[1]) - rank(b[1]) || a[0].localeCompare(b[0]))
    .map(([to, ks]) => ({
      to,
      verb: PREVIEW_ORDER.filter((k) => ks.includes(k))
        .map((k) => EDGE_VERB[k])
        .join(" · "),
      outside: p.externals.some((e) => e.name === to),
    }));
  return {
    hub: hub.name,
    role: hub.role,
    out: out.slice(0, PREVIEW_ROWS),
    more: Math.max(0, out.length - PREVIEW_ROWS),
  };
}

/** "Structure only", "Source excerpts" or "Source for 4 of 14", from the per-file licences. */
export function sourceLabel(s: { contracts: number; excerpts: number }) {
  if (s.excerpts === 0) return "Structure only";
  if (s.excerpts === s.contracts) return "Source excerpts";
  return `Source for ${s.excerpts} of ${s.contracts}`;
}

/** The exact line on GitHub at the pinned commit, or null (vendored code, unknown repo). */
export function githubUrl(
  p: Pick<Protocol, "repos">,
  repo: string | null | undefined,
  file: string | undefined,
  line: number | undefined,
): string | null {
  const r = p.repos.find((x) => x.id === repo);
  if (!r || !file) return null;
  return `${r.url}/blob/${r.commit}/${file}${line != null ? `#L${line + 1}` : ""}`;
}

export const contractOf = (p: Protocol, name: string) =>
  p.contracts.find((c) => c.name === name);

/** Verb for an edge, read as "<from> <verb> <to>". */
export const EDGE_VERB: Record<EdgeKind, string> = {
  calls: "calls",
  delegates: "delegates to",
  uses: "uses",
  holds: "holds",
  deploys: "deploys",
  inherits: "is",
};
const KIND_ORDER: EdgeKind[] = [
  "calls",
  "delegates",
  "uses",
  "holds",
  "deploys",
];

// ---------- map layout ----------

export const MAP = {
  /** card width */
  w: 248,
  /** title row above the card (white dot + name) */
  title: 28,
  /** card border and padding, inner border, inner header (kind) 34 and role line 22 */
  head: 66,
  row: 30,
  pad: 10,
  /** ≥160px between columns (DESIGN.md node anatomy) */
  colGap: 176,
  /** 44px from a card's bottom to the next title */
  gap: 44,
} as const;

/** One row per target: every kind of relation to it, merged ("calls · holds AToken"). */
export type MapRow = {
  to: string;
  kinds: EdgeKind[];
  members: string[];
  label: string;
  y: number;
  /** the target sits outside the protocol (blue port: external / address) */
  outside: boolean;
  /** read by hand, not from the AST */
  manual: boolean;
};
export type MapNode = {
  id: string;
  title: string;
  /** role (contracts) or label (externals) */
  role: string;
  kind: ProtocolContract["kind"] | "external";
  group: string;
  /** track (column on screen); a tall group wraps into several tracks */
  col: number;
  x: number;
  y: number;
  h: number;
  rows: MapRow[];
  /** inherited mapped contracts, shown as text */
  is: string[];
};
export type MapWire = {
  from: string;
  to: string;
  /** the strongest kind decides the line style: calls / delegates over uses / holds over deploys */
  kind: EdgeKind;
  /** row port on the source, header port on the target */
  a: { x: number; y: number };
  b: { x: number; y: number };
  d: string;
};

/**
 * Contracts in columns by role (p.groups, left to right), one row per contract it reaches with its
 * port; wires leave from the row and enter the target's header, on its left side when the target
 * is further right, else on its right side (LayerZero Scan pin 18577417209678198, L2BEAT Disco).
 * A group taller than `maxH` wraps into another column so the map keeps a readable scale.
 */
export function mapLayout(
  p: Protocol,
  maxH?: number,
): ReturnType<typeof layoutAt> {
  if (maxH != null) return layoutAt(p, maxH);
  // the wrap height whose map is closest to the stage's shape (about 1.9 : 1), so Fit stays legible
  let best = layoutAt(p, 400);
  for (let h = 500; h <= 4000; h += 100) {
    const l = layoutAt(p, h);
    const off = (x: typeof l) => Math.abs(Math.log(x.w / x.h / 1.9));
    if (off(l) < off(best)) best = l;
  }
  return best;
}

function layoutAt(p: Protocol, maxH: number) {
  const rowsOf = (id: string) => {
    const by = new Map<string, Edge[]>();
    for (const e of p.edges)
      if (e.from === id && e.kind !== "inherits")
        by.set(e.to, [...(by.get(e.to) ?? []), e]);
    return [...by.entries()]
      .map(([to, es]) => ({
        to,
        kinds: KIND_ORDER.filter((k) => es.some((e) => e.kind === k)),
        members: [...new Set(es.flatMap((e) => e.members))].sort(),
        manual: es.some((e) => e.manual),
      }))
      .sort(
        (a, b) =>
          KIND_ORDER.indexOf(a.kinds[0]) - KIND_ORDER.indexOf(b.kinds[0]) ||
          a.to.localeCompare(b.to),
      );
  };
  const items = [
    ...p.contracts.map((c) => ({
      id: c.name,
      role: c.role,
      kind: c.kind as MapNode["kind"],
      group: c.group,
    })),
    ...p.externals.map((e) => ({
      id: e.name,
      role: e.label,
      kind: "external" as const,
      group: e.group,
    })),
  ];
  const nodes: MapNode[] = [];
  const bottoms: number[] = [];
  const heads: { group: string; col: number }[] = [];
  for (const g of p.groups) {
    const members = items.filter((i) => i.group === g);
    if (!members.length) continue;
    let col = bottoms.length;
    bottoms.push(0);
    heads.push({ group: g, col });
    for (const it of members) {
      const rows = rowsOf(it.id);
      const h = MAP.title + MAP.head + rows.length * MAP.row + MAP.pad;
      if (bottoms[col] > 0 && bottoms[col] + h > maxH) {
        col = bottoms.length;
        bottoms.push(0);
      }
      const x = col * (MAP.w + MAP.colGap);
      const y = bottoms[col];
      const top = y + MAP.title + MAP.head;
      bottoms[col] = y + h + MAP.gap;
      nodes.push({
        id: it.id,
        title: it.id,
        role: it.role,
        kind: it.kind,
        group: g,
        col,
        x,
        y,
        h,
        rows: rows.map((r, i) => ({
          ...r,
          label: `${r.kinds.map((k) => EDGE_VERB[k]).join(" · ")} ${r.to}`,
          y: top + i * MAP.row + MAP.row / 2,
          outside: p.externals.some((e) => e.name === r.to),
        })),
        is: p.edges
          .filter((e) => e.from === it.id && e.kind === "inherits")
          .map((e) => e.to),
      });
    }
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const wires: MapWire[] = [];
  for (const n of nodes)
    for (const r of n.rows) {
      const t = byId.get(r.to);
      if (!t) continue;
      const a = { x: n.x + MAP.w, y: r.y };
      const ty = t.y + MAP.title + 27;
      const base = { from: n.id, to: t.id, kind: r.kinds[0], a };
      if (t.col > n.col) {
        const b = { x: t.x, y: ty };
        wires.push({ ...base, b, d: wirePath(a, b) });
      } else {
        // backwards or same column: loop out to the right and into the target's right side
        const b = { x: t.x + MAP.w, y: ty };
        const k = 56 + Math.abs(b.y - a.y) / 5 + (n.col - t.col) * 24;
        wires.push({
          ...base,
          b,
          d: `M${a.x},${a.y} C${a.x + k},${a.y} ${b.x + k},${b.y} ${b.x},${b.y}`,
        });
      }
    }
  return {
    nodes,
    wires,
    /** column headings: each group over its first track */
    heads,
    w: bottoms.length * MAP.w + (bottoms.length - 1) * MAP.colGap,
    h: Math.max(...bottoms) - MAP.gap,
  };
}

/** The node ids an edge set touches from `id` (itself included): what stays lit on selection. */
export function neighbours(p: Protocol, id: string): Set<string> {
  const n = new Set([id]);
  for (const e of p.edges) {
    if (e.from === id) n.add(e.to);
    if (e.to === id) n.add(e.from);
  }
  return n;
}

// ---------- flow lanes ----------

export const LANES = { label: 196, step: 148, lane: 52, top: 8 } as const;

/**
 * One lane per participant, the actor first, the rest in order of first appearance; each step a
 * pill on its lane, steps left to right (Workflow plan pin 10414642884268257).
 */
export function laneLayout(f: Flow) {
  const lanes = [
    f.actor,
    ...new Set(f.steps.map((s) => s.lane).filter((l) => l !== f.actor)),
  ];
  const steps = f.steps.map((s, i) => ({
    i,
    lane: lanes.indexOf(s.lane),
    x: LANES.label + i * LANES.step,
    y: LANES.top + lanes.indexOf(s.lane) * LANES.lane,
  }));
  return {
    lanes,
    steps,
    w: LANES.label + f.steps.length * LANES.step,
    h: LANES.top * 2 + lanes.length * LANES.lane,
  };
}
