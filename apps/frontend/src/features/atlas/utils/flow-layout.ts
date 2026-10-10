import type { AtlasCoverage, Piece, Step } from "../types.ts";
import { rankOf } from "./audit.ts";
import type { AtlasModel } from "./model.ts";
import { word } from "./step-lines.ts";

/** Node radius, horizontal pitch between nodes, and where lane nodes start (after the label box). */
export const FLOW = {
  r: 18,
  dx: 66,
  pad: 24,
  trunkX: 42,
  labelX: 80,
  labelW: 228,
  nodeX: 350,
  revertR: 12,
  /** revert circle centre below the lane's node row */
  drop: 64,
  badge: 9,
  /** minimum canvas width past nodeX, so the event / finding strips don't wrap too early */
  minW: 640,
} as const;

export type FlowKind = "entry" | "access" | Step[0] | "ret";
export type FlowNode = {
  key: string;
  kind: FlowKind;
  /** piece selected on click */
  id: string;
  x: number;
  y: number;
  /** index into seq[lane] (steps only) */
  step?: number;
  /** 0-based source line */
  line?: number;
  /** write after a state-changing external call (CEI) */
  late?: boolean;
  /** coverage ran and this line never executed */
  untested?: boolean;
  /** a finding is pinned on this piece */
  finding?: boolean;
};
/** A require / revert / modifier check that can stop the lane, hung below the node it follows. */
export type FlowRevert = {
  key: string;
  x: number;
  y: number;
  /** stem x, dropping from the lane line just after the anchor node */
  stem: number;
  reason: string;
  line: number;
};
export type FlowLane = {
  id: string;
  sig: string;
  /** modifier pieces applied on the declaration */
  gates: string[];
  y: number;
  h: number;
  cy: number;
  nodes: FlowNode[];
  reverts: FlowRevert[];
  /** findings on the function or on what it touches, worst first */
  findings: { id: string; x: number }[];
  /** x where the lane ends (last drawn element) */
  end: number;
};
export type FlowDot = { id: string; x: number; y: number; lanes: string[] };
export type FlowLayout = {
  deploy: { id: string | null; x: number; y: number; writes: string[] };
  idle: { x: number; y: number; roles: string[] };
  lanes: FlowLane[];
  eventsY: number;
  events: FlowDot[];
  findingsY: number;
  findings: FlowDot[];
  w: number;
  h: number;
};

type Model = Pick<
  AtlasModel,
  | "pieces"
  | "byId"
  | "entry"
  | "seq"
  | "lines"
  | "lineOf"
  | "stepLines"
  | "lateWrites"
  | "findings"
  | "lesion"
  | "coverage"
>;

const slotName = (p: Piece) =>
  (p.name.split("· ").pop() ?? "").replace("[]", "").trim();

/** `function deposit(uint256 amount, bytes calldata d) external {` → `deposit(uint256,bytes)`. */
export function signatureOf(decl: string, fallback: string): string {
  const m = /(?:function\s+)?(\w+)\s*\(([^)]*)\)/.exec(decl);
  if (!m) return fallback;
  const types = m[2]
    .split(",")
    .map((a) => a.trim().split(/\s+/))
    .filter((t) => t[0])
    .map((t) => t[0]);
  return `${m[1]}(${types.join(",")})`;
}

/** Reason a check line reverts with: the string literal, the custom error, else the condition. */
export function checkReason(line: string): string | null {
  if (/^\s*(\/\/|\*|\/\*)/.test(line)) return null;
  const req = /\brequire\s*\((.*)/.exec(line);
  const rev = /\brevert\s*(\w*)/.exec(line);
  if (!req && !rev) return null;
  const str = /"([^"]*)"/.exec(line);
  if (str) return str[1];
  if (rev?.[1]) return rev[1];
  return (req?.[1] ?? "revert").replace(/\)\s*;?\s*$/, "").trim();
}

/** 0-based body lines of a function / modifier (declaration line excluded). */
const bodyOf = (m: Model, p: Piece) => {
  const at = m.lineOf(p);
  return Array.from(
    { length: Math.max(0, (p.n ?? 1) - 1) },
    (_, i) => at + 1 + i,
  );
};

const untestedLine = (cov: AtlasCoverage | undefined, line: number) =>
  !!cov && cov.hits[line] === 0;

/**
 * Swimlane flow of the contract, like a watch UX diagram: a trunk (deploy → idle state) branching
 * into one lane per entry point, each lane = entry → access → seq steps → return, with the checks
 * that can revert hanging below. Pure and deterministic; every coordinate is an integer.
 */
export function flowLayout(m: Model): FlowLayout {
  const { r, dx, pad, trunkX, nodeX, drop, badge } = FLOW;
  const modifiers = m.pieces.flatMap((p) => {
    const mm = p.sys === "access" && /^modifier\s+(\w+)/.exec(p.find);
    return mm ? [{ p, use: word(mm[1]) }] : [];
  });
  const severity = (id: string) => rankOf(m.byId[id]);
  const pinned = new Set(Object.values(m.lesion));
  const checkLines: number[] = [];

  const deployY = pad + r;
  const idleY = deployY + 90;
  let y = idleY + r + 40;
  const lanes: FlowLane[] = m.entry
    .filter((id) => m.byId[id])
    .map((id) => {
      const entry = m.byId[id];
      const decl = m.lines[m.lineOf(entry)] ?? "";
      const gates = modifiers.filter((g) => g.use.test(decl)).map((g) => g.p);
      const steps = m.seq[id] ?? [];
      const at = m.stepLines(id);
      const late = m.lateWrites(id);
      const body = bodyOf(m, entry);
      const cov = m.coverage?.pieces[id];
      const laneUntested = !!cov && !cov.lines.hit;
      const cy = y + r + 8;

      const nodes: FlowNode[] = [
        {
          key: `${id}:in`,
          kind: "entry",
          id,
          x: nodeX,
          y: cy,
          line: m.lineOf(entry),
        },
        {
          key: `${id}:acc`,
          kind: "access",
          id: gates[0]?.id ?? id,
          x: nodeX + dx,
          y: cy,
          line: gates[0] ? m.lineOf(gates[0]) : m.lineOf(entry),
        },
        ...steps.map(
          ([k, t], i): FlowNode => ({
            key: `${id}:${i}`,
            kind: k,
            id: t,
            x: nodeX + dx * (i + 2),
            y: cy,
            step: i,
            line: at[i],
            late: late[i],
            untested: laneUntested || untestedLine(m.coverage, at[i]),
            finding: pinned.has(t),
          }),
        ),
      ];
      nodes.push({
        key: `${id}:ret`,
        kind: "ret",
        id,
        x: nodeX + dx * (steps.length + 2),
        y: cy,
      });

      // checks: modifier bodies first, then the function body; each hangs after the last step
      // already done within the same body (falls back to the access node)
      const anchorIn = (scope: Set<number>, line: number) => {
        let anchor = 1;
        at.forEach((l, i) => {
          if (scope.has(l) && l <= line) anchor = i + 2;
        });
        return anchor;
      };
      const checks = [...gates.map((g) => bodyOf(m, g)), body].flatMap(
        (lines) => {
          const scope = new Set(lines);
          return lines.map((line) => ({ line, anchor: anchorIn(scope, line) }));
        },
      );
      const reverts: FlowRevert[] = [];
      for (const c of checks) {
        const reason = checkReason(m.lines[c.line] ?? "");
        if (reason == null) continue;
        checkLines.push(c.line);
        const stem = nodes[c.anchor].x + dx / 2;
        const prev = reverts.at(-1);
        reverts.push({
          key: `${id}:rv${reverts.length}`,
          x: Math.max(stem, prev ? prev.x + dx : stem),
          y: cy + drop,
          stem,
          reason,
          line: c.line,
        });
      }

      const lesions = new Set([
        id,
        ...steps.map(([, t]) => t),
        ...(entry.links ?? []),
      ]);
      const fx = nodes[nodes.length - 1].x + r + 18 + badge;
      const findings = m.findings
        .filter((f) => lesions.has(m.lesion[f.id]))
        .sort(
          (a, b) =>
            severity(b.id) - severity(a.id) || a.name.localeCompare(b.name),
        )
        .map((f, i) => ({ id: f.id, x: fx + i * (badge * 2 + 6) }));
      const end = Math.max(
        nodes[nodes.length - 1].x + r,
        (reverts.at(-1)?.x ?? 0) + dx / 2,
        (findings.at(-1)?.x ?? 0) + badge,
      );
      const h = reverts.length ? r + 8 + drop + 34 : r * 2 + 8 + 34;
      const lane = {
        id,
        sig: signatureOf(decl, entry.name),
        gates: gates.map((g) => g.id),
        y,
        h,
        cy,
        nodes,
        reverts,
        findings,
        end,
      };
      y += h + 10;
      return lane;
    });

  // deploy + idle state: constructor writes, and the slots the access checks compare against
  const ctor = m.pieces.find(
    (p) => p.name === "constructor" || /^\s*constructor\s*\(/.test(p.find),
  );
  const checkText = checkLines.map((l) => m.lines[l] ?? "").join("\n");
  const slots = m.pieces.filter((p) => p.sys === "storage" && slotName(p));
  const roles = slots
    .filter((p) => word(slotName(p)).test(checkText))
    .map((p) => p.id);
  const writes = (ctor?.links ?? []).filter(
    (id) => m.byId[id]?.sys === "storage",
  );

  // bottom strips: events (with the lanes that emit them) and findings, worst first, wrapped
  const W = Math.max(nodeX + FLOW.minW, ...lanes.map((l) => l.end)) + pad;
  const perRow = Math.max(1, Math.floor((W - nodeX) / dx));
  const strip = (
    ids: string[],
    top: number,
    lanesOf: (id: string) => string[],
  ) =>
    ids.map((id, i) => ({
      id,
      x: nodeX + (i % perRow) * dx,
      y: top + Math.floor(i / perRow) * 70 + r + 8,
      lanes: lanesOf(id),
    }));
  const rows = (n: number) => Math.max(1, Math.ceil(n / perRow));
  const eventsY = y + 30;
  const events = strip(
    m.pieces.filter((p) => p.sys === "events").map((p) => p.id),
    eventsY,
    (ev) =>
      lanes
        .filter((l) =>
          (m.seq[l.id] ?? []).some(([k, t]) => k === "e" && t === ev),
        )
        .map((l) => l.id),
  );
  const findingsY = eventsY + rows(events.length) * 70 + 20;
  const findings = strip(
    [...m.findings]
      .sort(
        (a, b) =>
          severity(b.id) - severity(a.id) || a.name.localeCompare(b.name),
      )
      .map((f) => f.id),
    findingsY,
    (f) =>
      lanes.filter((l) => l.findings.some((x) => x.id === f)).map((l) => l.id),
  );
  const h = findingsY + rows(findings.length) * 70 + pad;

  const round = <T extends { x: number; y: number }>(o: T): T => ({
    ...o,
    x: Math.round(o.x),
    y: Math.round(o.y),
  });
  return {
    deploy: { id: ctor?.id ?? null, x: trunkX, y: deployY, writes },
    idle: { x: trunkX, y: idleY, roles },
    lanes: lanes.map((l) => ({
      ...l,
      nodes: l.nodes.map(round),
      reverts: l.reverts.map((v) => ({
        ...round(v),
        stem: Math.round(v.stem),
      })),
      findings: l.findings.map((f) => ({ ...f, x: Math.round(f.x) })),
      end: Math.round(l.end),
    })),
    eventsY,
    events: events.map(round),
    findingsY,
    findings: findings.map(round),
    w: Math.round(W),
    h: Math.round(h),
  };
}

/** One row of a function's path, top to bottom (the Paths view). */
export type PathRow =
  | (Omit<FlowNode, "x" | "y" | "key"> & { key: string })
  | { key: string; kind: "check"; id: string; reason: string; line: number };

/**
 * One function's path as rows in execution order: entry, access, then every step with the checks
 * that can revert placed right after the step they follow (the same anchoring as the lanes), and
 * the findings on what it touches, worst first.
 */
export function pathOf(
  m: Model,
  id: string,
): {
  sig: string;
  gates: string[];
  rows: PathRow[];
  findings: string[];
} | null {
  const lane = flowLayout(m).lanes.find((l) => l.id === id);
  if (!lane) return null;
  const rows = [
    ...lane.nodes.map((n) => ({ at: n.x, row: n })),
    ...lane.reverts.map((v) => ({
      at: v.stem,
      row: {
        key: v.key,
        kind: "check" as const,
        id,
        reason: v.reason,
        line: v.line,
      },
    })),
  ]
    .sort((a, b) => a.at - b.at)
    .map(({ row }) => {
      const { x: _x, y: _y, ...rest } = row as FlowNode;
      return ("reason" in row ? row : rest) as PathRow;
    });
  return {
    sig: lane.sig,
    gates: lane.gates,
    rows,
    findings: lane.findings.map((f) => f.id),
  };
}

/** A Paths row, Phalcon-style: a type word, how deep it runs, what it touches. */
export type TreeKind =
  | "ENTRY"
  | "MODIFIER"
  | "INTERNAL"
  | "SLOAD"
  | "SSTORE"
  | "CALL"
  | "STATICCALL"
  | "EMIT"
  | "REQUIRE"
  | "RETURN";
export type TreeRow = {
  key: string;
  depth: number;
  kind: TreeKind;
  /** piece selected on click */
  id: string;
  name: string;
  /** 0-based source line */
  line?: number;
  /** index into the entry's seq (steps only), for replay */
  step?: number;
  reason?: string;
  late?: boolean;
  untested?: boolean;
  finding?: boolean;
  /** a modifier or internal function: the rows under it fold */
  group?: boolean;
};

/**
 * One function's path as an invocation tree (Phalcon's invocation flow, docs/ux/atlas.md): the
 * steps of `pathOf`, nested under the modifier or internal function whose lines they run in; an
 * internal function called from another one's body nests under it.
 */
export function pathTree(
  m: Model,
  id: string,
): {
  sig: string;
  gates: string[];
  rows: TreeRow[];
  findings: string[];
} | null {
  const path = pathOf(m, id);
  const entry = m.byId[id];
  if (!path || !entry) return null;
  const spanOf = (p: Piece) => {
    const a = m.lineOf(p);
    return [a, a + Math.max(1, p.n ?? 1) - 1] as const;
  };
  const inside = (p: Piece, line: number) => {
    const [a, b] = spanOf(p);
    return line >= a && line <= b;
  };
  const scopes = m.pieces.filter(
    (p) => (p.sys === "access" || p.sys === "logic") && (p.n ?? 0) > 1,
  );
  const scopeOf = (line?: number) =>
    line == null || inside(entry, line)
      ? null
      : (scopes
          .filter((p) => inside(p, line))
          .sort((a, b) => (a.n ?? 0) - (b.n ?? 0))[0] ?? null);
  const body = (p: Piece) => {
    const [a, b] = spanOf(p);
    return m.lines.slice(a, b + 1).join("\n");
  };
  const callName = (p: Piece) =>
    p.name.replace(/\(\)$/, "").replace(/^modifier\s+/, "");

  const rows: TreeRow[] = [];
  let stack: Piece[] = [];
  const open = (p: Piece) => {
    // nest under the innermost open function that calls it, else directly under the entry
    while (stack.length && !word(callName(p)).test(body(stack[stack.length - 1])))
      stack.pop();
    rows.push({
      key: `${id}:g${rows.length}`,
      depth: stack.length + 1,
      kind: p.sys === "access" ? "MODIFIER" : "INTERNAL",
      id: p.id,
      name: p.name,
      line: m.lineOf(p),
      group: true,
    });
    stack.push(p);
  };
  const slot = (p?: Piece) =>
    p ? (p.name.split("· ").pop() ?? p.name).trim() : "";

  for (const r of path.rows) {
    if (r.kind === "entry") {
      rows.push({
        key: r.key,
        depth: 0,
        kind: "ENTRY",
        id,
        name: path.sig,
        line: r.line,
      });
      continue;
    }
    // the modifier opens as a group when its first line runs; "guarded by" sits in the header
    if (r.kind === "access") continue;
    if (r.kind === "ret") {
      stack = [];
      rows.push({ key: r.key, depth: 1, kind: "RETURN", id, name: "return" });
      continue;
    }
    const scope = scopeOf(r.line);
    if (!scope) stack = [];
    else if (stack[stack.length - 1]?.id !== scope.id) {
      const at = stack.findIndex((s) => s.id === scope.id);
      if (at >= 0) stack = stack.slice(0, at + 1);
      else open(scope);
    }
    const depth = stack.length + 1;
    if (r.kind === "check") {
      rows.push({
        key: r.key,
        depth,
        kind: "REQUIRE",
        id,
        name: r.reason,
        reason: r.reason,
        line: r.line,
      });
      continue;
    }
    const p = m.byId[r.id];
    const kind: TreeKind =
      r.kind === "r"
        ? "SLOAD"
        : r.kind === "w"
          ? "SSTORE"
          : r.kind === "e"
            ? "EMIT"
            : p?.view
              ? "STATICCALL"
              : "CALL";
    rows.push({
      key: r.key,
      depth,
      kind,
      id: r.id,
      name: kind === "SLOAD" || kind === "SSTORE" ? slot(p) : (p?.name ?? r.id),
      line: r.line,
      step: r.step,
      late: r.late,
      untested: r.untested,
      finding: r.finding,
    });
  }
  return { sig: path.sig, gates: path.gates, rows, findings: path.findings };
}
