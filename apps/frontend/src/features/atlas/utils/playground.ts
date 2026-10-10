import type { Piece, Step, SystemKey } from "../types";
import { type PieceCov, pieceCoverage } from "./coverage.ts";
import type { AtlasModel } from "./model";
import { word } from "./step-lines.ts";
import { unitCode } from "./units.ts";

/**
 * Playground logic: replay ONE function's normal execution path as a what-if (who may call it,
 * what it touches, which findings sit on the path), with values from forge traces when a test made
 * the same call. Pure logic only; the Lab's symbolic scenario run (lab-scenario.ts) builds on it.
 */

export type PlayModel = Pick<
  AtlasModel,
  | "byId"
  | "pieces"
  | "lines"
  | "lineOf"
  | "seq"
  | "entry"
  | "internal"
  | "findings"
  | "lesion"
  | "callTarget"
  | "contract"
  | "coverage"
  | "stepLines"
>;

export const USDC_DECIMALS = 6;
const UNIT = 10n ** BigInt(USDC_DECIMALS);

/** "1,000.5" › 1000500000n raw units; null when it is not a non-negative amount. */
export function parseUsdc(s: string): bigint | null {
  const m = /^(\d+)(?:\.(\d*))?$/.exec(s.replace(/[,_\s]/g, ""));
  if (!m || (m[2]?.length ?? 0) > USDC_DECIMALS) return null;
  return BigInt(m[1]) * UNIT + BigInt((m[2] ?? "").padEnd(USDC_DECIMALS, "0"));
}

const group = (n: bigint) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/** 1000500000n › "1,000.5 USDC". */
export function formatUsdc(raw: bigint): string {
  const neg = raw < 0n;
  const a = neg ? -raw : raw;
  const frac = (a % UNIT)
    .toString()
    .padStart(USDC_DECIMALS, "0")
    .replace(/0+$/, "");
  return `${neg ? "−" : ""}${group(a / UNIT)}${frac ? `.${frac}` : ""} USDC`;
}
/** "1000000000" › "1,000,000,000" (raw integer, unit unknown). */
export const formatInt = (s: string) =>
  /^-?\d+$/.test(s) ? group(BigInt(s)) : s;

// ---- callers and access ----------------------------------------------------

/** Roles to call as: anyone first, then every role an entry point checks (Piece.caller). */
export function callerRoles(m: Pick<PlayModel, "entry" | "byId">): string[] {
  const roles = m.entry
    .map((id) => m.byId[id]?.caller)
    .filter((c): c is string => !!c && c !== "anyone");
  return ["anyone", ...new Set(roles)];
}

const bodyLines = (m: Pick<PlayModel, "lineOf">, p: Piece) => {
  const at = m.lineOf(p);
  return Array.from({ length: p.n ?? 1 }, (_, i) => at + i);
};

export type Guard = {
  /** modifier piece holding the check, null for an inline require */
  id: string | null;
  name: string;
  line: number;
  /** "msg.sender == owner" */
  cond: string;
};
export type Access = {
  required: string;
  pass: boolean;
  guard: Guard | null;
  /** "REVERTS · onlyOwner (require msg.sender == owner)" when !pass */
  caption: string;
};

/** First `require(<cond>…)` on a msg.sender check within the given lines. */
function senderCheck(lines: string[], at: number[]) {
  for (const i of at) {
    const m = /require\s*\(\s*([^,;]*msg\.sender[^,;]*?)\s*(?:,|\)\s*;)/.exec(
      lines[i] ?? "",
    );
    if (m) return { line: i, cond: m[1].trim() };
  }
  return null;
}

/** Can `caller` get past the entry's access control? Finds the modifier or inline require that checks it. */
export function accessCheck(
  m: Pick<PlayModel, "byId" | "pieces" | "lines" | "lineOf">,
  entry: string,
  caller: string,
): Access {
  const p = m.byId[entry];
  const required = p?.caller ?? "anyone";
  if (!p || required === "anyone")
    return { required, pass: true, guard: null, caption: "" };
  const decl = m.lines[m.lineOf(p)] ?? "";
  let guard: Guard | null = null;
  for (const q of m.pieces) {
    const mod = q.sys === "access" && /^modifier\s+(\w+)/.exec(q.find);
    if (!mod || !word(mod[1]).test(decl)) continue;
    const hit = senderCheck(m.lines, bodyLines(m, q));
    if (hit) guard = { id: q.id, name: mod[1], ...hit };
  }
  if (!guard) {
    const hit = senderCheck(m.lines, bodyLines(m, p));
    if (hit) guard = { id: null, name: "require", ...hit };
  }
  const pass = caller === required;
  const cond = guard?.cond ?? `msg.sender == ${required}`;
  const caption = pass
    ? ""
    : guard?.id
      ? `REVERTS · ${guard.name} (require ${cond})`
      : `REVERTS · require(${cond})`;
  return { required, pass, guard, caption };
}

// ---- captions with the amount filled in ------------------------------------

export type Param = { type: string; name: string };
/** Parameters from a function header line: `function deposit(uint256 amount) …`. */
export function paramsOf(decl: string): Param[] {
  const m = /\(([^)]*)\)/.exec(decl);
  return (m?.[1] ?? "")
    .split(",")
    .map((s) => s.trim().split(/\s+/))
    .filter((t) => t.length >= 2)
    .map((t) => ({ type: t[0], name: t[t.length - 1] }));
}
/** Parameters that carry the token amount (uint named amount / assets / value, never shares). */
export const isAmountParam = (p: Param) =>
  /^uint/.test(p.type) &&
  /amount|assets?$|value/i.test(p.name) &&
  !/share/i.test(p.name);

export type CaptionCtx = {
  /** formatted amount, e.g. "1,000 USDC" */
  amount: string;
  /** label for msg.sender, e.g. "caller" or the test's prank address "alice" */
  caller: string;
  /** identifier › decoded value from a forge trace */
  bound?: Record<string, string>;
};
const selfLabel = (contract: string) =>
  /vault/i.test(contract) ? "vault" : "this";

/**
 * Symbolic effect of one source line: msg.sender › caller, address(this) › vault, and the
 * entry's amount parameter › the amount wherever it is passed directly as an argument
 * (`f(…, amount)`), never inside arithmetic. Trace-bound identifiers get `(=value)`.
 */
export function stepCaption(
  m: Pick<PlayModel, "byId" | "lines" | "lineOf" | "contract">,
  entry: string,
  line: number,
  ctx: CaptionCtx,
): string {
  const p = m.byId[entry];
  let s = (m.lines[line] ?? "").trim().replace(/;\s*(\/\/.*)?$/, "");
  s = s
    .replace(/\bmsg\.sender\b/g, ctx.caller)
    .replace(/\baddress\(this\)/g, selfLabel(m.contract));
  if (!p) return s;
  const own = line > m.lineOf(p) && line < m.lineOf(p) + (p.n ?? 1);
  for (const q of paramsOf(m.lines[m.lineOf(p)] ?? "")) {
    if (!own || !isAmountParam(q)) continue;
    s = s.replace(
      new RegExp(`([(,]\\s*)${q.name}(?=\\s*[,)])`, "g"),
      `$1${ctx.amount}`,
    );
  }
  for (const [k, v] of Object.entries(ctx.bound ?? {}))
    if (own && word(k).test(s) && !s.includes(`${k} (=`))
      s = s.replace(word(k), `${k} (=${formatInt(v)})`);
  return s;
}

// ---- trace values from forge tests -----------------------------------------

/** The slice of a `luora-data.json` test that the playground reads. */
export type TraceTest = {
  name: string;
  frames: {
    d: number;
    kind: string;
    to: string;
    contract: string | null;
    fn: string;
    args: string;
    ret: string;
    ok: boolean;
  }[];
};
/** One call a test made into the contract, decoded. */
export type TraceCall = {
  test: string;
  fn: string;
  /** "amount=1000000000" */
  args: string;
  ret: string;
  ok: boolean;
  /** prank address the call ran as, null = the test contract itself */
  caller: string | null;
  /** emitted inside the call: "Deposit(user=alice, assets=…)" */
  events: string[];
  /** external calls made inside it: "MockUSDC.transferFrom(from=alice, …) › true" */
  calls: string[];
  transfers: { token: string; from: string; to: string; value: string }[];
};

export const kv = (args: string): Record<string, string> =>
  Object.fromEntries(
    args
      .split(/,\s*/)
      .map((a) => a.split("="))
      .filter((a) => a.length === 2),
  );

/** Every direct call a test made into `contract`, with the prank caller and what happened inside it. */
export function traceCalls(tests: TraceTest[], contract: string): TraceCall[] {
  const out: TraceCall[] = [];
  for (const t of tests) {
    let once: string | null = null;
    let sticky: string | null = null;
    const fs = t.frames;
    fs.forEach((f, i) => {
      if (f.contract === "vm") {
        const who = kv(f.args).msgSender ?? null;
        if (f.fn === "prank") once = who;
        if (f.fn === "startPrank") sticky = who;
        if (f.fn === "stopPrank") sticky = null;
        return;
      }
      if (f.kind === "EVENT" || f.d !== 1) return;
      const caller = once ?? sticky;
      once = null;
      if (f.contract !== contract) return;
      const call: TraceCall = {
        test: t.name.replace(/\(\)$/, ""),
        fn: f.fn,
        args: f.args,
        ret: f.ret,
        ok: f.ok,
        caller,
        events: [],
        calls: [],
        transfers: [],
      };
      for (let j = i + 1; j < fs.length && fs[j].d > f.d; j++) {
        const g = fs[j];
        if (g.kind === "EVENT") {
          if (g.to === contract) call.events.push(`${g.fn}(${g.args})`);
          if (g.fn === "Transfer") {
            const a = kv(g.args);
            call.transfers.push({
              token: g.to,
              from: a.from,
              to: a.to,
              value: a.value,
            });
          }
        } else if (g.d === f.d + 1)
          call.calls.push(
            `${g.to}.${g.fn}(${g.args})${g.ok ? (g.ret ? ` › ${g.ret}` : "") : ` ✕ ${g.ret}`}`,
          );
      }
      out.push(call);
    });
  }
  return out;
}

/** Entry piece name `deposit()` › trace function name `deposit`. */
export const fnName = (p: Piece) => p.name.replace(/\(.*$/, "");

/**
 * Identifier › value from a traced call: the entry's parameters, plus the arguments of every
 * `emit` in its body matched to the event's declared parameter names (emit Deposit(_, amount, minted)
 * + Deposit(…, shares=5) › minted = 5).
 */
export function traceBindings(
  m: Pick<PlayModel, "byId" | "pieces" | "lines" | "lineOf">,
  entry: string,
  call: TraceCall,
): Record<string, string> {
  const p = m.byId[entry];
  const out: Record<string, string> = { ...kv(call.args) };
  if (!p) return out;
  const events = new Map(
    call.events.map((e) => {
      const at = e.indexOf("(");
      return [e.slice(0, at), kv(e.slice(at + 1, -1))] as const;
    }),
  );
  for (const i of bodyLines(m, p)) {
    const em = /emit\s+(\w+)\s*\(([^;]*)\)\s*;/.exec(m.lines[i] ?? "");
    const vals = em && events.get(em[1]);
    const ev =
      em && m.pieces.find((q) => q.sys === "events" && q.name === em[1]);
    if (!em || !vals || !ev) continue;
    const names = paramsOf(m.lines[m.lineOf(ev)] ?? "").map((q) => q.name);
    em[2].split(",").forEach((arg, k) => {
      const a = arg.trim();
      if (/^[A-Za-z_]\w*$/.test(a) && vals[names[k]] != null)
        out[a] ??= vals[names[k]];
    });
  }
  return out;
}

// ---- symbolic resources ------------------------------------------------------

export type Deltas = {
  /** token balance change of the caller / the contract, e.g. "−1,000 USDC" or "+value" */
  caller: string | null;
  vault: string | null;
  /** slot name › "+= minted" */
  writes: Record<string, string>;
};

/** What one call moves, read off its source lines (symbolic) or a test's Transfer events (real). */
export function callDeltas(
  m: PlayModel,
  entry: string,
  ctx: CaptionCtx,
  call?: TraceCall,
): Deltas {
  const d: Deltas = { caller: null, vault: null, writes: {} };
  const lines = m.stepLines(entry);
  const steps = m.seq[entry] ?? [];
  steps.forEach(([k, t], i) => {
    const cap = stepCaption(m, entry, lines[i], ctx);
    const slot = (m.byId[t]?.name.split("· ").pop() ?? "").replace("[]", "");
    if (k === "w") {
      const w = new RegExp(`\\b${slot}\\b[^=+\\-]*([+-]?=)\\s*(.+)$`).exec(cap);
      if (w) d.writes[slot] = `${w[1]} ${w[2]}`;
    }
    const p = m.byId[t];
    if (k !== "c" || !p?.member) return;
    const args = /\(([^)]*)\)/.exec(cap.slice(cap.indexOf(p.member)))?.[1];
    // ", " splits arguments; the formatted amount keeps its "1,000" grouping
    const a = (args ?? "").split(/,\s+/).map((s) => s.trim());
    const self = selfLabel(m.contract);
    const neg = (x: string) => (/^\d/.test(x) ? `−${x}` : `− ${x}`);
    if (p.member === "transferFrom" && a.length === 3) {
      if (a[0] === ctx.caller) d.caller = neg(a[2]);
      if (a[1] === self) d.vault = `+${a[2]}`;
    } else if (p.member === "transfer" && a.length === 2) {
      d.vault = neg(a[1]);
      if (a[0] === ctx.caller) d.caller = `+${a[1]}`;
    }
  });
  if (call?.transfers.length) {
    const net = (who: string | null) =>
      who == null
        ? null
        : call.transfers.reduce(
            (n, x) =>
              n +
              (x.to === who ? BigInt(x.value) : 0n) -
              (x.from === who ? BigInt(x.value) : 0n),
            0n,
          );
    const sign = (v: bigint | null) =>
      v == null ? null : `${v > 0n ? "+" : ""}${formatUsdc(v)}`;
    d.caller = sign(net(call.caller)) ?? d.caller;
    d.vault = sign(net(m.contract)) ?? d.vault;
  }
  return d;
}

// ---- drop targets ----------------------------------------------------------

export type Reach = {
  entry: string;
  /** "writes", "reads", "calls", "emits", "runs", "guarded by", "missing on" */
  how: string;
  /** external calls only: whether storage is written after this call in the entry */
  order?: "before state writes" | "after state writes" | "no state writes";
};
export type Verdict =
  | { kind: "call"; entry: string; access: Access }
  | { kind: "reach"; id: string; sys: SystemKey; reach: Reach[] };

/** Where the steps of `entry` that hit `ids` sit relative to its storage writes. */
function callOrder(seq: Step[], ids: Set<string>): Reach["order"] {
  const at = seq.findIndex(([k, t]) => k === "c" && ids.has(t));
  const writes = seq.flatMap(([k], i) => (k === "w" ? [i] : []));
  if (!writes.length) return "no state writes";
  return writes.some((w) => w > at)
    ? "before state writes"
    : "after state writes";
}

const HOW: Record<Step[0], string> = {
  r: "reads",
  w: "writes",
  c: "calls",
  e: "emits",
};

/** Entry points that reach a non-entry piece, and how. */
export function reachOf(m: PlayModel, id: string): Reach[] {
  const p = m.byId[id];
  if (!p) return [];
  if (p.sys === "deps" || p.sys === "calls") {
    const ids = new Set(
      p.sys === "calls"
        ? [id]
        : Object.entries(m.callTarget).flatMap(([c, d]) =>
            d === id ? [c] : [],
          ),
    );
    return m.entry.flatMap((e) => {
      const seq = m.seq[e] ?? [];
      return seq.some(([k, t]) => k === "c" && ids.has(t))
        ? [{ entry: e, how: "calls", order: callOrder(seq, ids) }]
        : [];
    });
  }
  if (p.sys === "storage" || p.sys === "events")
    return m.entry.flatMap((e) => {
      const kinds = [
        ...new Set(
          (m.seq[e] ?? []).filter(([, t]) => t === id).map(([k]) => k),
        ),
      ].sort((a, b) => "wrce".indexOf(a) - "wrce".indexOf(b));
      return kinds.length
        ? [{ entry: e, how: kinds.map((k) => HOW[k]).join(" + ") }]
        : [];
    });
  // logic / access: linked entries, through internal helpers (deposit › _computeShares › _price)
  const inner = new Set(m.internal);
  const reaches = (from: string, seen: Set<string>): boolean =>
    (m.byId[from]?.links ?? []).some(
      (l) =>
        l === id ||
        (inner.has(l) && !seen.has(l) && reaches(l, new Set([...seen, l]))),
    );
  const how =
    p.sys === "access" ? (p.ghost ? "missing on" : "guarded by") : "runs";
  return m.entry.flatMap((e) =>
    reaches(e, new Set([e])) ? [{ entry: e, how }] : [],
  );
}

/** What dropping the token on a building does, as `caller`. */
export function dropVerdict(
  m: PlayModel,
  id: string,
  caller: string,
): Verdict | null {
  const p = m.byId[id];
  if (!p || p.sys === "vulns") return null;
  if (m.entry.includes(id))
    return { kind: "call", entry: id, access: accessCheck(m, id, caller) };
  return { kind: "reach", id, sys: p.sys, reach: reachOf(m, id) };
}

/** One-line preview for the hover tooltip. */
export function verdictLine(m: PlayModel, v: Verdict): string {
  if (v.kind === "call")
    return v.access.pass
      ? `Call ${m.byId[v.entry].name} · ${(m.seq[v.entry] ?? []).length} steps`
      : v.access.caption;
  if (!v.reach.length) return "No call · no entry point reaches it";
  const verb = v.reach[0].how.split(" ")[0];
  return `No call · ${verb} by ${v.reach.map((r) => `${unitCode(m as AtlasModel, r.entry)} ${m.byId[r.entry].name}`).join(", ")}`;
}

// ---- end-of-run report -------------------------------------------------------

export type PathReport = {
  steps: number;
  written: string[];
  calls: string[];
  events: string[];
  /** findings on pieces along the path, worst first */
  findings: Piece[];
  coverage: PieceCov | null;
};

const RANK = { high: 3, med: 2, low: 1, info: 0 } as const;

/**
 * Pieces an entry's path touches up to step `upto` (default: all): itself, its modifiers and
 * internal helpers, each step target and the factory behind each external call.
 */
export function pathPieces(
  m: PlayModel,
  entry: string,
  upto = Infinity,
): Set<string> {
  const on = new Set([entry]);
  const inner = new Set(m.internal);
  const visit = (id: string) => {
    for (const l of m.byId[id]?.links ?? []) {
      const q = m.byId[l];
      if (!q || on.has(l) || (q.sys !== "access" && !inner.has(l))) continue;
      on.add(l);
      visit(l);
    }
  };
  visit(entry);
  for (const [, t] of (m.seq[entry] ?? []).slice(0, upto + 1)) {
    on.add(t);
    if (m.callTarget[t]) on.add(m.callTarget[t]);
  }
  return on;
}

export function pathReport(m: PlayModel, entry: string): PathReport {
  const seq = m.seq[entry] ?? [];
  const names = (k: Step[0]) => [
    ...new Set(
      seq.filter(([s]) => s === k).map(([, t]) => m.byId[t]?.name ?? t),
    ),
  ];
  const on = pathPieces(m, entry);
  const findings = m.findings
    .filter((f) => onPath(m, f, on))
    .sort((a, b) => RANK[b.risk ?? "low"] - RANK[a.risk ?? "low"]);
  return {
    steps: seq.length,
    written: names("w"),
    calls: names("c"),
    events: names("e"),
    findings,
    coverage: m.coverage ? pieceCoverage(m as never, entry) : null,
  };
}

/**
 * A finding sits on the path when its host building does, or it links to a path piece that is
 * not a shared slot (a slot linked by withdraw's CEI finding is not deposit's problem).
 */
const onPath = (m: PlayModel, f: Piece, on: Set<string>) =>
  on.has(m.lesion[f.id]) ||
  (f.links ?? []).some((l) => on.has(l) && m.byId[l]?.sys !== "storage");

/** Findings lit once step `i` of a run is reached (step -1 = the entry with its gates and helpers). */
export function findingsAt(
  m: PlayModel,
  entry: string,
  i: number,
): Set<string> {
  const on = pathPieces(m, entry, i);
  return new Set(m.findings.filter((f) => onPath(m, f, on)).map((f) => f.id));
}
