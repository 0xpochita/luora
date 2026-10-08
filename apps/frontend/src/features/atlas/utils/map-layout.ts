import type { AtlasData, Piece, Risk } from "../types.ts";
import { rankOf, shortTitle } from "./audit.ts";
import { isStateChanging, pieceCoverage } from "./coverage.ts";
import { type IconKey, iconOf } from "./icons.ts";
import { protocolOf } from "./protocols.ts";

/**
 * "Map" tab: a poster-style system map. The contract is a tall hub column fed by a Deploy box;
 * every entry point is a labelled port wired (orthogonal, one lane per wire) to a panel that
 * shows its gate → reads → calls → writes → events flow. Storage, external, events and findings
 * panels hang off the hub's bottom edge. Everything here is pure and rounded to whole pixels.
 */

export type MapCat =
  | "user"
  | "admin"
  | "storage"
  | "external"
  | "events"
  | "findings";
export type FlowKind = "gate" | "r" | "c" | "w" | "e";

export type Box = { x: number; y: number; w: number; h: number };
export type FlowNode = Box & {
  /** piece selected on click */
  id: string;
  kind: FlowKind;
  label: string;
  /** write that happens after a state-changing external call */
  late?: boolean;
  /** missing protection (ghost access piece) */
  ghost?: boolean;
  logo?: string;
};
export type FlowEdge = { d: string; late: boolean; arrow: boolean };
export type MapRow = {
  id: string | null;
  x: number;
  y: number;
  w: number;
  label: string;
  meta: string;
  head?: boolean;
  logo?: string;
  icon?: IconKey;
  risk?: Risk;
};
export type MapPanel = Box & {
  key: string;
  cat: MapCat;
  title: string;
  /** piece selected when the panel title is clicked */
  select: string | null;
  icon: IconKey;
  badge?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  rows: MapRow[];
  /** findings on this entry point (worst first) and how many fit as tags in the title row */
  findings: string[];
  tagsShown: number;
  footer?: string;
  footerBad?: boolean;
};
export type MapPort = {
  key: string;
  side: "left" | "right" | "bottom";
  x: number;
  y: number;
  cat: MapCat;
  label: string;
  icon: IconKey;
  badge?: string;
  id: string | null;
};
export type MapWire = { key: string; cat: MapCat; d: string };
export type MapLayout = {
  w: number;
  h: number;
  emblem: { x: number; y: number };
  deploy: Box & {
    ctor: string | null;
    label: string;
    chips: (Box & { id: string | null; label: string; imm: boolean })[];
  };
  trunk: string;
  hub: Box & { head: number };
  panels: MapPanel[];
  ports: MapPort[];
  wires: MapWire[];
};

const CH = 6.6; // mono glyph width at the 10.5px panel font
const NODE = { w: 96, h: 20, gap: 6, col: 30, max: 5 };
const PAD = 10;
const HEAD = 30;
const FOOT = 20;
const ROW = 17;
const HUB = { w: 300, head: 104, pitch: 32, foot: 56 };
const GAP = 22; // between stacked panels
const LANE = 9;
const EXTRA_W = { storage: 300, external: 300, events: 260, findings: 360 };

const r = Math.round;
const slotName = (p: Piece) =>
  (p.name.split("· ").pop() ?? p.name).replace("[]", "");
const fnName = (p: Piece) => p.name.replace(/\(\)$/, "");

/** Who may call an entry point, as a short badge ("anyone", "owner", "keeper"). */
export const accessOf = (p: Piece) => p.caller ?? "anyone";

/** Write steps of `fn` that follow a state-changing external call (checks-effects-interactions). */
function lateTargets(data: AtlasData, fn: string): Set<string> {
  const view = new Set(data.pieces.filter((p) => p.view).map((p) => p.id));
  let called = false;
  const late = new Set<string>();
  for (const [k, t] of data.seq[fn] ?? []) {
    if (k === "c" && !view.has(t)) called = true;
    if (k === "w" && called) late.add(t);
  }
  return late;
}

/** Findings that concern an entry point: on it, linked to it, or on a helper / call / gate it uses. */
export function findingsOf(data: AtlasData, fn: string): Piece[] {
  const byId = new Map(data.pieces.map((p) => [p.id, p]));
  const uses = new Set(byId.get(fn)?.links ?? []);
  for (const [, t] of data.seq[fn] ?? []) uses.add(t);
  return data.pieces
    .filter((f) => {
      if (f.sys !== "vulns") return false;
      const host = data.lesion[f.id];
      if (host === fn || (f.links ?? []).includes(fn)) return true;
      const h = host ? byId.get(host) : undefined;
      return (
        !!h && uses.has(h.id) && ["logic", "calls", "access"].includes(h.sys)
      );
    })
    .sort((a, b) => rankOf(b) - rankOf(a));
}

/** Logo of the protocol behind a call (its own names, else the contract it targets). */
function logoOf(data: AtlasData, p: Piece): string | undefined {
  const dep = data.pieces.find((q) => q.id === data.callTarget[p.id]);
  return (protocolOf(p) ?? (dep ? protocolOf(dep) : null))?.logo;
}

/** Gate → reads → calls → writes → events columns, laid out left to right inside a panel. */
function entryFlow(data: AtlasData, fn: Piece) {
  const byId = new Map(data.pieces.map((p) => [p.id, p]));
  const steps = data.seq[fn.id] ?? [];
  const late = lateTargets(data, fn.id);
  const uniq = (k: string) => [
    ...new Set(steps.filter((s) => s[0] === k).map((s) => s[1])),
  ];
  const gates = (fn.links ?? [])
    .map((id) => byId.get(id))
    .filter((p): p is Piece => p?.sys === "access")
    .sort((a, b) => Number(!!a.ghost) - Number(!!b.ghost));
  const gateNodes = gates.map((g) => ({
    id: g.id,
    kind: "gate" as const,
    label: g.ghost ? fnName(g).replace(" (missing)", "?") : fnName(g),
    ghost: g.ghost,
  }));
  // A role check without its own modifier piece (require(msg.sender == keeper)) still gates.
  if (!gates.some((g) => !g.ghost))
    gateNodes.unshift({
      id: fn.id,
      kind: "gate",
      label:
        accessOf(fn) === "anyone" ? "open · anyone" : `only ${accessOf(fn)}`,
      ghost: undefined,
    });
  const node = (kind: FlowKind) => (id: string) => {
    const p = byId.get(id);
    const label = !p
      ? id
      : p.sys === "storage"
        ? slotName(p)
        : p.sys === "calls" && p.member
          ? `${p.target}.${p.member}`
          : fnName(p);
    return {
      id,
      kind,
      label,
      late: kind === "w" && late.has(id),
      logo: kind === "c" && p ? logoOf(data, p) : undefined,
    };
  };
  const cols = [
    gateNodes,
    uniq("r").map(node("r")),
    uniq("c").map(node("c")),
    uniq("w").map(node("w")),
    uniq("e").map(node("e")),
  ]
    .filter((c) => c.length)
    // tall columns wrap into sub-columns of the same kind
    .flatMap((c) =>
      Array.from({ length: Math.ceil(c.length / NODE.max) }, (_, i) =>
        c.slice(i * NODE.max, (i + 1) * NODE.max),
      ),
    );

  const rows = Math.max(...cols.map((c) => c.length));
  const colH = (n: number) => n * NODE.h + (n - 1) * NODE.gap;
  const inner = colH(rows);
  const nodes: FlowNode[][] = cols.map((c, ci) =>
    c.map((n, i) => ({
      ...n,
      x: PAD + ci * (NODE.w + NODE.col),
      y: HEAD + (inner - colH(c.length)) / 2 + i * (NODE.h + NODE.gap),
      w: NODE.w,
      h: NODE.h,
    })),
  );
  // Each column boundary is a bus: stubs out of every node, one vertical bar, arrows into the next.
  const edges: FlowEdge[] = [];
  for (let ci = 1; ci < nodes.length; ci++) {
    const a = nodes[ci - 1];
    const b = nodes[ci];
    const bx = r(b[0].x - NODE.col / 2);
    const mid = (n: FlowNode) => r(n.y + n.h / 2);
    const ys = [...a, ...b].map(mid);
    const out = a.map((n) => `M${r(n.x + n.w)} ${mid(n)}H${bx}`).join("");
    edges.push({
      d: `${out}M${bx} ${Math.min(...ys)}V${Math.max(...ys)}`,
      late: false,
      arrow: false,
    });
    for (const n of b)
      edges.push({
        d: `M${bx} ${mid(n)}H${r(n.x - 2)}`,
        late: !!n.late,
        arrow: true,
      });
  }
  const flat = nodes.flat().map((n) => ({ ...n, x: r(n.x), y: r(n.y) }));
  return {
    nodes: flat,
    edges,
    w: PAD * 2 + cols.length * NODE.w + (cols.length - 1) * NODE.col,
    h: HEAD + inner + PAD,
  };
}

function entryPanel(data: AtlasData, fn: Piece, cat: MapCat): MapPanel {
  const flow = entryFlow(data, fn);
  const fs = findingsOf(data, fn.id);
  const cov = pieceCoverage(data, fn.id);
  const titleW = 34 + fnName(fn).length * CH + (accessOf(fn).length + 2) * CH;
  const w = r(Math.max(flow.w, titleW + 3 * 38, 250));
  const tagsShown = Math.min(
    fs.length,
    Math.max(0, Math.floor((w - titleW - PAD) / 38)),
  );
  const missed = cov ? cov.branches.found - cov.branches.hit : 0;
  const footer = cov
    ? cov.state === "untested"
      ? `COV 0% · never run${cov.calls ? " (only reverts)" : ""}`
      : `COV ${Math.round(cov.pct * 100)}%${missed ? ` · ${missed} branch${missed > 1 ? "es" : ""} untested` : " · all branches hit"}`
    : undefined;
  return {
    key: fn.id,
    cat,
    title: fnName(fn),
    select: fn.id,
    icon: iconOf(fn),
    badge: accessOf(fn),
    x: 0,
    y: 0,
    w,
    h: flow.h + (footer ? FOOT : 0),
    nodes: flow.nodes,
    edges: flow.edges,
    rows: [],
    findings: fs.map((f) => f.id),
    tagsShown,
    footer,
    footerBad: !!cov && cov.state !== "covered",
  };
}

function listPanel(
  key: string,
  cat: MapCat,
  title: string,
  colW: number,
  rows: Omit<MapRow, "y" | "x" | "w">[],
  perCol = Number.POSITIVE_INFINITY,
): MapPanel {
  // long lists flow into side-by-side columns of `perCol` rows
  const cols = Math.max(1, Math.ceil(rows.length / perCol));
  const w = colW * cols;
  let y = HEAD;
  let bottom = HEAD;
  const placed = rows.map((row, i) => {
    if (i && i % perCol === 0) y = HEAD;
    const at = {
      ...row,
      x: Math.floor(i / perCol) * colW,
      w: colW,
      y: r(y + (row.head ? 4 : 0)),
    };
    y += row.head ? ROW + 4 : ROW;
    bottom = Math.max(bottom, y);
    return at;
  });
  y = bottom;
  return {
    key,
    cat,
    title,
    select: null,
    icon:
      cat === "storage"
        ? "cylinder"
        : cat === "external"
          ? "antenna"
          : cat === "events"
            ? "waves"
            : "warn",
    x: 0,
    y: 0,
    w,
    h: r(y + PAD),
    nodes: [],
    edges: [],
    rows: placed,
    findings: [],
    tagsShown: 0,
  };
}

/** Constructor or initializer: what runs once at deployment. */
function ctorOf(data: AtlasData): Piece | undefined {
  return (
    data.pieces.find((p) => p.sys === "logic" && /^constructor/.test(p.name)) ??
    data.pieces.find(
      (p) =>
        (p.sys === "logic" || p.sys === "entry") &&
        /^_?initiali[sz]e/i.test(p.name),
    )
  );
}

/** `Type immutable name` declarations (immutables live in bytecode, not in storage slots). */
export function immutablesOf(source: string): string[] {
  const re =
    /^\s*[\w.[\]]+(?:\s+(?:public|private|internal))?\s+immutable(?:\s+(?:public|private|internal))?\s+(\w+)/;
  return source.split("\n").flatMap((l) => {
    const m = re.exec(l);
    return m ? [m[1]] : [];
  });
}

function extraPanels(data: AtlasData): MapPanel[] {
  const byId = new Map(data.pieces.map((p) => [p.id, p]));
  const name = (id: string) =>
    byId.get(id) ? fnName(byId.get(id) as Piece) : id;
  const ctor = ctorOf(data);
  const writers = (slot: string) => [
    ...(ctor && (ctor.links ?? []).includes(slot) ? ["ctor"] : []),
    ...data.entry
      .filter((e) =>
        (data.seq[e] ?? []).some(([k, t]) => k === "w" && t === slot),
      )
      .map(name),
  ];
  const of = (sys: string) => data.pieces.filter((p) => p.sys === sys);
  const out: MapPanel[] = [];

  const slots = of("storage");
  const imm = immutablesOf(data.source);
  if (slots.length || imm.length) {
    const group = (title: string, ps: Piece[]) =>
      ps.length
        ? [
            { id: null, label: title, meta: "written by", head: true },
            ...ps.map((p) => ({
              id: p.id,
              label: `${p.slot != null ? String(p.slot).padStart(2, "0") : "--"} ${slotName(p)}`,
              meta: writers(p.id).join(" ") || "never written",
              icon: iconOf(p),
            })),
          ]
        : [];
    out.push(
      listPanel("storage", "storage", "Storage", EXTRA_W.storage, [
        ...group(
          "Values",
          slots.filter((p) => !p.mapping),
        ),
        ...group(
          "Mappings / arrays",
          slots.filter((p) => p.mapping),
        ),
        ...(imm.length
          ? [
              { id: null, label: "Immutable", meta: "set in ctor", head: true },
              ...imm.map((n) => ({
                id: ctor?.id ?? null,
                label: `-- ${n}`,
                meta: "bytecode",
                icon: "cylinder" as const,
              })),
            ]
          : []),
      ]),
    );
  }

  const deps = of("deps");
  if (deps.length)
    out.push(
      listPanel(
        "external",
        "external",
        "External dependencies",
        EXTRA_W.external,
        deps.map((d) => {
          const calls = Object.keys(data.callTarget)
            .filter((c) => data.callTarget[c] === d.id)
            .map((c) => byId.get(c)?.member ?? name(c));
          return {
            id: d.id,
            label: d.name,
            meta: [...new Set(calls)].join(" ") || "no calls",
            logo: protocolOf(d)?.logo,
            icon: iconOf(d),
          };
        }),
      ),
    );

  const evs = of("events");
  if (evs.length)
    out.push(
      listPanel(
        "events",
        "events",
        "Events",
        EXTRA_W.events,
        evs.map((e) => ({
          id: e.id,
          label: e.name,
          meta:
            data.entry
              .filter((f) =>
                (data.seq[f] ?? []).some(([k, t]) => k === "e" && t === e.id),
              )
              .map(name)
              .join(" ") || "never emitted",
          icon: "waves",
        })),
      ),
    );

  const fs = of("vulns").sort((a, b) => rankOf(b) - rankOf(a));
  if (fs.length)
    out.push(
      listPanel(
        "findings",
        "findings",
        "Findings",
        EXTRA_W.findings,
        fs.map((f) => ({
          id: f.id,
          label: shortTitle(f, 30),
          meta: f.tool ?? "manual",
          risk: f.risk ?? "low",
        })),
        12,
      ),
    );
  return out;
}

/** Wire lanes: wires heading away from the port's centre get the innermost lane first, so none cross. */
function laneRanks(from: number[], to: number[]): number[] {
  const rank = from.map(() => 0);
  const up = from.map((_, i) => i).filter((i) => to[i] < from[i]);
  const down = from
    .map((_, i) => i)
    .filter((i) => to[i] > from[i])
    .reverse();
  up.forEach((i, k) => {
    rank[i] = k;
  });
  down.forEach((i, k) => {
    rank[i] = k;
  });
  return rank;
}

export function mapLayout(data: AtlasData): MapLayout {
  const byId = new Map(data.pieces.map((p) => [p.id, p]));
  const entries = data.entry
    .map((id) => byId.get(id))
    .filter((p): p is Piece => !!p);
  const privileged = (p: Piece) => accessOf(p) !== "anyone";
  const left = entries
    .filter((p) => !privileged(p) && isStateChanging(data, p.id))
    .map((p) => entryPanel(data, p, "user"));
  const right = entries
    .filter((p) => privileged(p) || !isStateChanging(data, p.id))
    .map((p) => entryPanel(data, p, privileged(p) ? "admin" : "user"));
  const bottom = extraPanels(data);

  // ---- top: emblem, title, Deploy box ----
  const ctor = ctorOf(data);
  const imm = immutablesOf(data.source);
  const init = (ctor?.links ?? []).filter(
    (id) => byId.get(id)?.sys === "storage",
  );
  const chipsSrc = [
    ...init.map((id) => ({
      id,
      label: slotName(byId.get(id) as Piece),
      imm: false,
    })),
    ...imm.map((n) => ({ id: ctor?.id ?? null, label: n, imm: true })),
  ];
  const DW = 320;
  let cx = PAD;
  let cy = 40;
  const chips = chipsSrc.map((c) => {
    const w = r(c.label.length * 5.6 + 14);
    if (cx + w > DW - PAD) {
      cx = PAD;
      cy += 20;
    }
    const chip = { ...c, x: cx, y: cy, w, h: 15 };
    cx += w + 5;
    return chip;
  });
  const deployH = (chips.length ? cy + 15 : 30) + PAD;
  const emblemY = 50;
  const deployY = 128;
  const hubY = deployY + deployH + 46;

  // ---- hub + side columns ----
  const nPorts = Math.max(left.length, right.length);
  const colH = (ps: MapPanel[]) =>
    ps.reduce((s, p) => s + p.h, 0) + Math.max(0, ps.length - 1) * GAP;
  // side columns may rise beside the title / Deploy box; the hub reaches down to their bottom
  const top = 40;
  const hubH = Math.max(
    HUB.head + nPorts * HUB.pitch + HUB.foot,
    top + colH(left) - hubY,
    top + colH(right) - hubY,
  );
  const portY = (i: number) => hubY + HUB.head + i * HUB.pitch + HUB.pitch / 2;
  const stack = (ps: MapPanel[]) => {
    // centre the column on the top..hub-bottom span so wires fan both ways
    let y = top + (hubY + hubH - top - colH(ps)) / 2;
    for (const p of ps) {
      p.y = r(y);
      y += p.h + GAP;
    }
  };
  stack(left);
  stack(right);
  const anchor = (p: MapPanel) => p.y + 15;
  const lanes = (ps: MapPanel[]) =>
    laneRanks(
      ps.map((_, i) => portY(i)),
      ps.map(anchor),
    );
  const lRank = lanes(left);
  const rRank = lanes(right);
  const gapW = (rank: number[]) => 40 + Math.max(0, ...rank) * LANE;
  const leftW = Math.max(0, ...left.map((p) => p.w));
  const rightW = Math.max(0, ...right.map((p) => p.w));
  const hubX = 40 + leftW + gapW(lRank);
  const hubR = hubX + HUB.w;
  for (const p of left) p.x = r(hubX - gapW(lRank) - p.w);
  for (const p of right) p.x = r(hubR + gapW(rRank));

  const ports: MapPort[] = [];
  const wires: MapWire[] = [];
  const side = (ps: MapPanel[], rank: number[], dir: -1 | 1) =>
    ps.forEach((p, i) => {
      const edge = dir < 0 ? hubX : hubR;
      const py = r(portY(i));
      const lane = r(edge + dir * (20 + rank[i] * LANE));
      const end = dir < 0 ? p.x + p.w : p.x;
      const fn = byId.get(p.key) as Piece;
      ports.push({
        key: p.key,
        side: dir < 0 ? "left" : "right",
        x: edge,
        y: py,
        cat: p.cat,
        label: p.title,
        icon: p.icon,
        badge: accessOf(fn),
        id: p.key,
      });
      wires.push({
        key: p.key,
        cat: p.cat,
        d: `M${edge} ${py}H${lane}V${anchor(p)}H${end}`,
      });
    });
  side(left, lRank, -1);
  side(right, rRank, 1);

  // ---- bottom row: storage / external / events / findings ----
  const hubB = hubY + hubH;
  const colsB = Math.max(hubB, ...[...left, ...right].map((p) => p.y + p.h));
  const rowW =
    bottom.reduce((s, p) => s + p.w, 0) + Math.max(0, bottom.length - 1) * 28;
  const hubC = hubX + HUB.w / 2;
  const bx0 = Math.max(40, hubC - rowW / 2);
  const bPortX = (i: number) => r(hubC + (i - (bottom.length - 1) / 2) * 56);
  const bTarget = (p: MapPanel) => r(p.x + 40);
  let x = bx0;
  for (const p of bottom) {
    p.x = r(x);
    x += p.w + 28;
  }
  const bRank = laneRanks(
    bottom.map((_, i) => bPortX(i)),
    bottom.map(bTarget),
  );
  const bottomY = r(colsB + 36 + Math.max(0, ...bRank) * LANE + 24);
  for (const p of bottom) p.y = bottomY;
  bottom.forEach((p, i) => {
    const px = bPortX(i);
    const lane = r(colsB + 22 + bRank[i] * LANE);
    ports.push({
      key: p.key,
      side: "bottom",
      x: px,
      y: r(hubB),
      cat: p.cat,
      label: p.title.split(" ")[0],
      icon: p.icon,
      id: null,
    });
    wires.push({
      key: p.key,
      cat: p.cat,
      d: `M${px} ${r(hubB)}V${lane}H${bTarget(p)}V${p.y}`,
    });
  });

  const panels = [...left, ...right, ...bottom];
  const w = r(
    Math.max(hubR + gapW(rRank) + rightW, x - 28, hubC + DW / 2) + 40,
  );
  const h = r(Math.max(...panels.map((p) => p.y + p.h), hubB) + 40);
  return {
    w,
    h,
    emblem: { x: r(hubC), y: emblemY },
    deploy: {
      x: r(hubC - DW / 2),
      y: deployY,
      w: DW,
      h: r(deployH),
      ctor: ctor?.id ?? null,
      label: ctor ? fnName(ctor) : "no constructor",
      chips,
    },
    trunk: `M${r(hubC)} ${r(deployY + deployH)}V${r(hubY)}`,
    hub: { x: r(hubX), y: r(hubY), w: HUB.w, h: r(hubH), head: HUB.head },
    panels,
    ports,
    wires,
  };
}
