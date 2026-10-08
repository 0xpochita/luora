import {
  argsOf,
  entryPorts,
  findingBadge,
  type GNode,
  type Port,
  type Revert,
  revertsOf,
  slotName,
  type Wire,
} from "./lab-graph.ts";
import {
  accessCheck,
  callerRoles,
  fnName,
  formatInt,
  formatUsdc,
  type PlayModel,
  parseUsdc,
  pathReport,
  type TraceCall,
  traceBindings,
} from "./playground.ts";

/**
 * Scenario Lab: an auditor wires actors, amounts and calls into a test of INTENDED behaviour
 * (access control holds, accounting stays consistent, pause works, funds round-trip), then
 * replays it symbolically over the atlas. A failing assert is reported as a finding with a fix.
 * Pure logic only; components/(main)/atlas/lab draws it, lab-foundry.ts exports it.
 */

export type CmpOp = "==" | ">=" | "<=" | ">" | "<";
export type AssertCheck =
  | { type: "cmp"; op: CmpOp }
  /** totalShares == Σ shares[actor] */
  | { type: "sum" }
  /** asset.balanceOf(vault) >= totalShares */
  | { type: "solvent" }
  /** only the entry's role may call it */
  | { type: "only"; fn: string }
  /** the entry reverts while paused */
  | { type: "paused"; fn: string };

type At = { id: string; x: number; y: number };
export type ScNode = At &
  (
    | { kind: "actor"; label: string; role: string; balance: string }
    | { kind: "const"; value: string }
    | { kind: "call"; fn: string }
    | { kind: "expect"; reason: string }
    | { kind: "assert"; check: AssertCheck }
    /** of = storage slot id, or "balance" for the asset token balance */
    | { kind: "snapshot"; of: string }
  );
export type Scenario = {
  id: string;
  name: string;
  nodes: ScNode[];
  wires: Wire[];
};

// ---- what the model offers -----------------------------------------------------

/** Actor roles: plain user, then every role an entry point checks (owner, keeper, …). */
export const actorRoles = (m: Pick<PlayModel, "entry" | "byId">) => [
  "user",
  ...callerRoles(m).filter((r) => r !== "anyone"),
];

const declType = (m: PlayModel, id: string) => {
  const p = m.byId[id];
  return /^\s*(\w+)/.exec(p ? (m.lines[m.lineOf(p)] ?? "") : "")?.[1] ?? "";
};
const slotOf = (m: PlayModel, name: string) =>
  m.pieces.find((p) => p.sys === "storage" && slotName(p) === name);
/** Slots with a public getter (the generated test can read them). */
export const publicSlots = (m: PlayModel) =>
  m.pieces.filter(
    (p) => p.sys === "storage" && /\bpublic\b/.test(m.lines[m.lineOf(p)] ?? ""),
  );
export const isBoolSlot = (m: PlayModel, id: string) =>
  declType(m, id) === "bool";

/** The token the contract holds: the `asset` slot, else the first IERC20 slot. */
export function assetSlot(m: PlayModel): string | null {
  const tokens = m.pieces.filter(
    (p) => p.sys === "storage" && /ERC20/.test(declType(m, p.id)),
  );
  return (tokens.find((p) => slotName(p) === "asset") ?? tokens[0])?.id ?? null;
}

/** `total<X>` slot + `<x>` mapping, e.g. totalShares + shares[]. */
export function sharePair(m: PlayModel) {
  for (const t of m.pieces) {
    const k = t.sys === "storage" && /^total(\w+)$/.exec(slotName(t));
    if (!k) continue;
    const map = m.pieces.find(
      (p) =>
        p.sys === "storage" &&
        p.mapping &&
        slotName(p).toLowerCase() === k[1].toLowerCase(),
    );
    if (map) return { total: slotName(t), map: slotName(map) };
  }
  return null;
}

/** The access check on an entry: a require comparing msg.sender with a role. */
const senderRevert = (rs: Revert[]) =>
  rs.find((r) => /msg\.sender\s*==|==\s*msg\.sender/.test(r.cond));
/** The pause check on an entry: a require on a bool slot (`!paused`). */
function pauseRevert(m: PlayModel, fn: string) {
  return revertsOf(m, fn).find((r) => {
    const s = /^!\s*(\w+)$/.exec(r.cond);
    const p = s && slotOf(m, s[1]);
    return !!p && isBoolSlot(m, p.id);
  });
}

export type AssertOption = { check: AssertCheck; label: string };
/** Pre-built safe invariants derived from the model, plus a plain comparison. */
export function assertOptions(m: PlayModel): AssertOption[] {
  const out: AssertOption[] = [];
  const pair = sharePair(m);
  if (pair)
    out.push({
      check: { type: "sum" },
      label: `${pair.total} == Σ ${pair.map}[actor]`,
    });
  const asset = assetSlot(m);
  if (pair && asset)
    out.push({
      check: { type: "solvent" },
      label: `${slotName(m.byId[asset])} balance ≥ ${pair.total}`,
    });
  for (const fn of m.entry) {
    const role = m.byId[fn]?.caller ?? "anyone";
    if (role !== "anyone")
      out.push({
        check: { type: "only", fn },
        label: `only ${role} can call ${fnName(m.byId[fn])}`,
      });
  }
  for (const fn of m.entry)
    if (pauseRevert(m, fn))
      out.push({
        check: { type: "paused", fn },
        label: `paused blocks ${fnName(m.byId[fn])}`,
      });
  out.push(
    ...(["==", ">=", "<="] as const).map((op) => ({
      check: { type: "cmp" as const, op },
      label: `a ${op} b`,
    })),
  );
  return out;
}
export const checkKey = (c: AssertCheck) =>
  c.type === "cmp"
    ? `cmp:${c.op}`
    : c.type === "only" || c.type === "paused"
      ? `${c.type}:${c.fn}`
      : c.type;
export const checkLabel = (m: PlayModel, c: AssertCheck) =>
  assertOptions(m).find((o) => checkKey(o.check) === checkKey(c))?.label ??
  checkKey(c);

// ---- cards -----------------------------------------------------------------------

/** Card (ports + widgets) for a scenario node. */
export function scenarioCard(m: PlayModel, n: ScNode): GNode {
  const base = {
    id: n.id,
    x: n.x,
    y: n.y,
    w: 220,
    inputs: [] as Port[],
    outputs: [] as Port[],
  };
  switch (n.kind) {
    case "actor":
      return {
        ...base,
        kind: "actor",
        title: `Actor · ${n.label}`,
        w: 200,
        widgets: 3,
        outputs: [{ id: "addr", label: "address", type: "actor" }],
      };
    case "const":
      return {
        ...base,
        kind: "const",
        title: "Amount",
        w: 180,
        widgets: 1,
        outputs: [{ id: "value", label: "USDC", type: "amount" }],
      };
    case "call": {
      const ports = m.byId[n.fn]
        ? entryPorts(m, n.fn)
        : { inputs: [], outputs: [] };
      const fb = findingBadge(m, n.fn);
      return {
        ...base,
        kind: "call",
        title: `Call ${m.byId[n.fn] ? fnName(m.byId[n.fn]) : n.fn}`,
        w: 240,
        flow: true,
        inputs: ports.inputs,
        outputs: ports.outputs.filter((p) => !p.id.startsWith("c:")),
        piece: n.fn,
        badges: fb ? [fb] : [],
      };
    }
    case "expect":
      return {
        ...base,
        kind: "expect",
        title: "Expect revert",
        w: 200,
        widgets: 1,
        inputs: [{ id: "call", label: "revert", type: "revert" }],
        outputs: [{ id: "held", label: "held", type: "bool" }],
      };
    case "assert":
      return {
        ...base,
        kind: "assert",
        title: "Assert",
        w: 240,
        flow: true,
        widgets: 1,
        inputs:
          n.check.type === "cmp"
            ? [
                { id: "a", label: "a", type: "amount" },
                { id: "b", label: "b", type: "amount" },
              ]
            : [],
        outputs: [{ id: "ok", label: "holds", type: "bool" }],
      };
    case "snapshot":
      return {
        ...base,
        kind: "snapshot",
        title: "Snapshot",
        w: 210,
        flow: true,
        widgets: 1,
        inputs: [
          { id: "slot", label: "slot", type: "slot" },
          { id: "who", label: "who", type: "actor" },
        ],
        outputs: [
          {
            id: "value",
            label: "value",
            type: n.of !== "balance" && isBoolSlot(m, n.of) ? "bool" : "amount",
          },
        ],
      };
  }
}

// ---- order -------------------------------------------------------------------------

const EXEC = new Set(["call", "snapshot", "assert"]);

/**
 * Execution order of the call / snapshot / assert cards: every wire orders its two ends (then
 * wires and data wires alike), ties broken left to right, then top to bottom.
 */
export function scenarioOrder(sc: Scenario): string[] {
  const exec = sc.nodes.filter((n) => EXEC.has(n.kind));
  const ids = new Set(exec.map((n) => n.id));
  // an expect card hangs off its call: wires through it do not order anything
  const edges = sc.wires.filter(
    (w) => ids.has(w.from.node) && ids.has(w.to.node),
  );
  const indeg = new Map(exec.map((n) => [n.id, 0]));
  for (const w of edges) indeg.set(w.to.node, (indeg.get(w.to.node) ?? 0) + 1);
  const pos = (id: string) => sc.nodes.find((n) => n.id === id) as ScNode;
  const byPlace = (a: string, b: string) =>
    pos(a).x - pos(b).x || pos(a).y - pos(b).y;
  const out: string[] = [];
  const ready = exec.filter((n) => !indeg.get(n.id)).map((n) => n.id);
  while (ready.length) {
    ready.sort(byPlace);
    const id = ready.shift() as string;
    out.push(id);
    for (const w of edges)
      if (w.from.node === id) {
        const d = (indeg.get(w.to.node) ?? 0) - 1;
        indeg.set(w.to.node, d);
        if (!d) ready.push(w.to.node);
      }
  }
  // loops (only possible in hand-edited storage) run last, in place order
  return [
    ...out,
    ...exec
      .map((n) => n.id)
      .filter((id) => !out.includes(id))
      .sort(byPlace),
  ];
}

// ---- symbolic values -------------------------------------------------------------

/** Linear value: constant + Σ coefficient·symbol. A value with no symbols is known. */
export type Lin = { c: bigint; t: Record<string, bigint> };
/** Lin for numbers, boolean for flags, string for addresses, null = cannot be derived. */
export type Val = Lin | boolean | string | null;

export const lin = (c: bigint): Lin => ({ c, t: {} });
const sym = (s: string): Lin => ({ c: 0n, t: { [s]: 1n } });
const isLin = (v: Val): v is Lin => !!v && typeof v === "object";
export const known = (v: Lin) => Object.values(v.t).every((k) => k === 0n);
export function addLin(a: Lin, b: Lin, sign = 1n): Lin {
  const t = { ...a.t };
  for (const [s, k] of Object.entries(b.t)) {
    t[s] = (t[s] ?? 0n) + sign * k;
    if (!t[s]) delete t[s];
  }
  return { c: a.c + sign * b.c, t };
}
/** "minted₁ + 1,000 USDC" */
export function showVal(v: Val, usdc = false): string {
  if (v === null) return "unknown";
  if (typeof v !== "object") return String(v);
  const n = (x: bigint) => (usdc ? formatUsdc(x) : formatInt(x.toString()));
  const terms = Object.entries(v.t).map(
    ([s, k]) => `${k === 1n ? "" : k === -1n ? "−" : `${k}·`}${s}`,
  );
  if (!terms.length) return n(v.c);
  return [...terms, ...(v.c ? [n(v.c)] : [])]
    .join(" + ")
    .replaceAll("+ −", "− ");
}
/** a op b when it can be decided (known difference), else null. */
export function compare(a: Val, b: Val, op: CmpOp): boolean | null {
  if (!isLin(a) || !isLin(b))
    return op === "==" && a !== null && b !== null && typeof a === typeof b
      ? a === b
      : null;
  const d = addLin(a, b, -1n);
  if (!known(d)) return null;
  return {
    "==": d.c === 0n,
    ">=": d.c >= 0n,
    "<=": d.c <= 0n,
    ">": d.c > 0n,
    "<": d.c < 0n,
  }[op];
}

const SUB = "₀₁₂₃₄₅₆₇₈₉";
const subscript = (i: number) =>
  String(i)
    .split("")
    .map((d) => SUB[+d])
    .join("");

// ---- run ---------------------------------------------------------------------------

export type Status = "pass" | "revert" | "fail" | "unknown";
export type NodeRun = {
  status: Status;
  /** "PASS · access owner" / "REVERT · onlyOwner (require msg.sender == owner)" */
  head: string;
  /** source line / deltas / notes */
  lines: string[];
  /** source line to jump to */
  line?: number;
  /** finding ids on the call's path */
  findings?: string[];
  value?: Val;
  /** revert reason when the call reverted */
  reason?: string;
};
export type LabFinding = {
  node: string;
  title: string;
  detail: string;
  fix: string;
};
export type RunResult = {
  order: string[];
  runs: Record<string, NodeRun>;
  findings: LabFinding[];
};

type State = {
  /** asset token balance per actor label / "vault" */
  bal: Map<string, Lin>;
  /** "totalShares" / "shares[alice]" / "paused" */
  slots: Map<string, Val>;
  /** mappings written under a key we could not resolve (their sum is unknown) */
  dirty: Set<string>;
};

/** Value of a slot right after deployment: its initializer, unknown when the constructor sets it, else zero. */
function initialSlot(m: PlayModel, name: string): Val {
  const p = slotOf(m, name);
  if (!p) return null;
  const decl = m.lines[m.lineOf(p)] ?? "";
  const init = /=\s*([^;]+);/.exec(decl)?.[1].trim();
  if (init) return literal(init);
  const ctor = m.pieces.find(
    (q) => q.sys === "logic" && q.name === "constructor",
  );
  if (ctor) {
    const body = m.lines.slice(m.lineOf(ctor), m.lineOf(ctor) + (ctor.n ?? 1));
    if (body.some((l) => new RegExp(`^\\s*${name}\\s*=`).test(l))) return null;
  }
  return isBoolSlot(m, p.id) ? false : lin(0n);
}

/** 1_000e6 → 1000000000n, true → true; null when it is not a literal. */
function literal(s: string): Val {
  if (s === "true" || s === "false") return s === "true";
  const n = /^(\d[\d_]*)(?:e(\d+))?$/.exec(s.trim());
  return n
    ? lin(BigInt(n[1].replaceAll("_", "")) * 10n ** BigInt(n[2] ?? 0))
    : null;
}

type Env = {
  caller: string;
  /** identifier → value: parameters, trace-bound locals, derived locals */
  vars: Map<string, Val>;
  self: string;
  asset: string | null;
};

function slotGet(m: PlayModel, st: State, key: string): Val {
  if (st.slots.has(key)) return st.slots.get(key) ?? null;
  const base = key.replace(/\[.*$/, "");
  if (key !== base) return slotOf(m, base) ? lin(0n) : null; // unset mapping entry = 0
  return initialSlot(m, base);
}

/** Small expression evaluator: literals, identifiers, slots, map[key], token.balanceOf(x). */
function evalExpr(m: PlayModel, st: State, env: Env, e: string): Val {
  const s = e.trim();
  const lit = literal(s);
  if (lit !== null) return lit;
  if (s === "msg.sender") return env.caller;
  if (s === "address(this)") return env.self;
  const not = /^!\s*(.+)$/.exec(s);
  if (not) {
    const v = evalExpr(m, st, env, not[1]);
    return typeof v === "boolean" ? !v : null;
  }
  const bal = /^(\w+)\.balanceOf\((.+)\)$/.exec(s);
  if (bal) {
    const who = evalExpr(m, st, env, bal[2]);
    return bal[1] === env.asset && typeof who === "string"
      ? (st.bal.get(who) ?? lin(0n))
      : null;
  }
  if (/^\w+$/.test(s)) {
    if (env.vars.has(s)) return env.vars.get(s) ?? null;
    return slotOf(m, s) ? slotGet(m, st, s) : null;
  }
  const idx = /^(\w+)\[(.+)\]$/.exec(s);
  if (idx && slotOf(m, idx[1])) {
    const k = evalExpr(m, st, env, idx[2]);
    return typeof k === "string" ? slotGet(m, st, `${idx[1]}[${k}]`) : null;
  }
  return null;
}

const OPS: CmpOp[] = [">=", "<=", "==", ">", "<"];
/** require condition → holds / fails / null when it cannot be decided. */
function evalCond(
  m: PlayModel,
  st: State,
  env: Env,
  cond: string,
): boolean | null {
  for (const op of [...OPS, "!="]) {
    const at = cond.indexOf(` ${op} `);
    if (at < 0) continue;
    const a = evalExpr(m, st, env, cond.slice(0, at));
    const b = evalExpr(m, st, env, cond.slice(at + op.length + 2));
    if (op === "!=") {
      const eq = compare(a, b, "==");
      return eq === null ? null : !eq;
    }
    return compare(a, b, op as CmpOp);
  }
  const v = evalExpr(m, st, env, cond);
  return typeof v === "boolean" ? v : null;
}

/** First traced forge call with the same function and arguments (same caller preferred). */
function matchTrace(
  calls: TraceCall[],
  fn: string,
  args: string,
  caller: string,
) {
  const same = calls.filter((c) => c.ok && c.fn === fn && c.args === args);
  return same.find((c) => c.caller === caller) ?? same[0];
}

/** Recommendation shown with a failing assert / expectation. */
export const FIX = {
  only: (fn: string, role: string) =>
    `Restrict ${fn} to ${role}: add an only${role[0].toUpperCase()}${role.slice(1)} modifier or require(msg.sender == ${role}, "!${role}") as its first statement.`,
  paused: (fn: string) =>
    `Gate ${fn} with whenNotPaused (require(!paused, "paused")) so pausing stops it.`,
  sum: (total: string, map: string) =>
    `Every write to ${map}[…] must change ${total} by the same amount in the same function (mint/burn both or neither).`,
  solvent: (total: string) =>
    `Funds leaving the contract must burn the matching ${total} first, and deposits must pull funds before minting.`,
  cmp: "Check the arithmetic between the two snapshots (rounding, fees, missing transfer).",
  revert: (fn: string, reason: string) =>
    `${fn} should revert with "${reason}" here: add or fix the require that enforces it.`,
};

/**
 * Symbolic replay in execution order. Values come from the source (literals, parameters,
 * fresh-deploy defaults, token moves) or from a forge trace of the same call; anything else stays a
 * named symbol (minted₁) and asserts on it stay unknown rather than guessed.
 */
export function runScenario(
  m: PlayModel,
  sc: Scenario,
  calls: TraceCall[] = [],
): RunResult {
  const order = scenarioOrder(sc);
  const runs: Record<string, NodeRun> = {};
  const findings: LabFinding[] = [];
  const node = (id: string) => sc.nodes.find((n) => n.id === id);
  const into = (id: string, port: string) =>
    sc.wires.find((w) => w.to.node === id && w.to.port === port)?.from;
  const asset = assetSlot(m);
  const assetName = asset ? slotName(m.byId[asset]) : null;
  const self = /vault/i.test(m.contract) ? "vault" : "this";
  const st: State = {
    bal: new Map([[self, lin(0n)]]),
    slots: new Map(),
    dirty: new Set(),
  };
  for (const n of sc.nodes)
    if (n.kind === "actor")
      st.bal.set(n.label, lin(parseUsdc(n.balance) ?? 0n));
  const pair = sharePair(m);

  /** Value flowing out of a card's output port. */
  const valueAt = (from: { node: string; port: string } | undefined): Val => {
    const n = from && node(from.node);
    if (!n) return null;
    if (n.kind === "actor") return n.label;
    if (n.kind === "const") {
      const v = parseUsdc(n.value);
      return v === null ? null : lin(v);
    }
    return runs[n.id]?.value ?? null;
  };
  const actorOf = (id: string, port: string) => {
    const n = node(into(id, port)?.node ?? "");
    return n?.kind === "actor" ? n : null;
  };

  let step = 0;
  for (const id of order) {
    const n = node(id);
    if (!n) continue;
    step++;
    if (n.kind === "call") runs[id] = runCall(id, n.fn);
    if (n.kind === "snapshot") runs[id] = runSnapshot(n);
    if (n.kind === "assert") runs[id] = runAssert(n);
  }
  // expect cards: judged on the call wired into them
  for (const n of sc.nodes) {
    if (n.kind !== "expect") continue;
    const from = into(n.id, "call");
    const call = from && runs[from.node];
    const target = from && node(from.node);
    const reason = n.reason || from?.port.replace(/^r:/, "") || "";
    const fn =
      target?.kind === "call"
        ? fnName(m.byId[target.fn] ?? ({ name: target.fn } as never))
        : "call";
    let r: NodeRun;
    if (!call)
      r = {
        status: "unknown",
        head: "Wire a call's revert port in",
        lines: [],
      };
    else if (call.status === "revert")
      r =
        call.reason === reason
          ? {
              status: "pass",
              head: `Reverted "${reason}" as expected`,
              lines: call.lines.slice(0, 1),
              line: call.line,
              value: true,
            }
          : {
              status: "fail",
              head: `Reverted "${call.reason}", expected "${reason}"`,
              lines: [],
              line: call.line,
              value: false,
            };
    else if (call.status === "pass")
      r = {
        status: "fail",
        head: `${fn} did not revert`,
        lines: [`expected "${reason}"`],
        value: false,
      };
    else
      r = {
        status: "unknown",
        head: "Revert cannot be decided symbolically",
        lines: call.lines,
        value: null,
      };
    runs[n.id] = r;
    if (r.status === "fail")
      findings.push({
        node: n.id,
        title: `${fn}: ${r.head}`,
        detail: `Scenario expected ${fn} to revert with "${reason}".`,
        fix: FIX.revert(fn, reason),
      });
  }
  return { order, runs, findings };

  function runCall(id: string, fn: string): NodeRun {
    const p = m.byId[fn];
    if (!p) return { status: "unknown", head: `No entry ${fn}`, lines: [] };
    const actor = actorOf(id, "caller");
    if (!actor)
      return {
        status: "unknown",
        head: "Wire an actor into caller",
        lines: [],
      };
    const lines: string[] = [];
    const vars = new Map<string, Val>();
    const argv: string[] = [];
    argsOf(m, fn).forEach((a, i) => {
      const from = into(id, `a${i}`);
      let v: Val = from
        ? valueAt(from)
        : /^u?int/.test(a.type)
          ? lin(0n)
          : a.type === "bool"
            ? false
            : "address(0)";
      if (!from) lines.push(`${a.name} not wired · 0`);
      if (from && v === null) v = sym(`${a.name}${subscript(step)}`);
      vars.set(a.name, v);
      if (isLin(v) && known(v)) argv.push(`${a.name}=${v.c}`);
      else argv.push(`${a.name}=?`);
    });
    const env: Env = { caller: actor.label, vars, self, asset: assetName };
    const role = actor.role === "user" ? "anyone" : actor.role;

    // gates: modifiers first, then the body, in source order
    for (const r of revertsOf(m, fn)) {
      const access = /msg\.sender\s*==|==\s*msg\.sender/.test(r.cond);
      const holds = access
        ? accessCheck(m, fn, role).pass
        : evalCond(m, st, env, r.cond);
      const at = `L${r.line + 1} ${m.lines[r.line]?.trim()}`;
      if (holds === false) {
        const caption = access
          ? accessCheck(m, fn, role).caption
          : `REVERTS · ${r.via ?? "require"} (${r.cond})`;
        return {
          status: "revert",
          head: caption.replace("REVERTS", "REVERT"),
          lines: [at],
          line: r.line,
          reason: r.reason,
        };
      }
      if (holds === null)
        lines.push(`? ${at} · not decidable, assumed to hold`);
    }
    const access = accessCheck(m, fn, role);
    const head =
      access.required === "anyone"
        ? "PASS · open to anyone"
        : `PASS · access ${access.required}`;

    // values from a forge test making the same call
    const trace = matchTrace(calls, fnName(p), argv.join(", "), actor.label);
    if (trace) {
      for (const [k, v] of Object.entries(traceBindings(m, fn, trace)))
        if (!vars.has(k) && /^\d+$/.test(v)) vars.set(k, lin(BigInt(v)));
      lines.push(`values from forge ${trace.test}`);
    }
    // locals: uint256 minted = …;
    const body = Array.from({ length: p.n ?? 1 }, (_, i) => m.lineOf(p) + i);
    for (const i of body) {
      const d = /^\s*(?:u?int\d*|bool|address)\s+(\w+)\s*=\s*(.+);/.exec(
        m.lines[i] ?? "",
      );
      if (d && !vars.has(d[1]))
        vars.set(
          d[1],
          evalExpr(m, st, env, d[2]) ?? sym(`${d[1]}${subscript(step)}`),
        );
    }

    // effects in execution order
    const seq = m.seq[fn] ?? [];
    const at = m.stepLines(fn);
    const writes = new Map<string, Val>();
    const moves = new Map<string, Lin>();
    for (const [i, [k, t]] of seq.entries()) {
      const src = (m.lines[at[i]] ?? "").trim();
      if (k === "w") {
        const w = /^(\w+)(?:\[(.+?)\])?\s*([+-]?=)\s*(.+);/.exec(src);
        if (!w) continue;
        let key = w[1];
        if (w[2]) {
          const kk = evalExpr(m, st, env, w[2]);
          if (typeof kk !== "string") {
            st.dirty.add(w[1]);
            lines.push(`${w[1]}[${w[2]}] written (key unknown)`);
            continue;
          }
          key = `${w[1]}[${kk}]`;
        }
        const old = writes.get(key) ?? slotGet(m, st, key);
        const rhs =
          evalExpr(m, st, env, w[4]) ??
          sym(`${w[4].replace(/\W+/g, "")}${subscript(step)}`);
        if (w[3] === "=") writes.set(key, rhs);
        else if (isLin(old) && isLin(rhs)) {
          const nv = addLin(old, rhs, w[3] === "-=" ? -1n : 1n);
          if (w[3] === "-=" && known(nv) && nv.c < 0n)
            return {
              status: "revert",
              head: `REVERT · arithmetic underflow on ${key}`,
              lines: [`L${at[i] + 1} ${src}`],
              line: at[i],
              reason: "panic: arithmetic underflow (0x11)",
            };
          writes.set(key, nv);
        } else writes.set(key, null);
      }
      if (k === "c") {
        const c = m.byId[t];
        if (c?.target !== assetName || !c.member) {
          if (c && !c.view) lines.push(`external ${c.name} · not modelled`);
          continue;
        }
        const args = src
          .slice(src.indexOf(`.${c.member}(`) + c.member.length + 2)
          .replace(/\)\s*;?\s*$/, "");
        const a = args.split(",").map((x) => evalExpr(m, st, env, x));
        const move = (from: Val, to: Val, v: Val) => {
          if (typeof from !== "string" || typeof to !== "string") return;
          const amt = isLin(v) ? v : sym(`amount${subscript(step)}`);
          moves.set(from, addLin(moves.get(from) ?? lin(0n), amt, -1n));
          moves.set(to, addLin(moves.get(to) ?? lin(0n), amt));
        };
        if (c.member === "transferFrom") move(a[0], a[1], a[2]);
        if (c.member === "transfer") move(self, a[0], a[1]);
      }
    }
    for (const [who, d] of moves) {
      const nb = addLin(st.bal.get(who) ?? lin(0n), d);
      if (known(nb) && nb.c < 0n)
        return {
          status: "revert",
          head: `REVERT · ${who} holds too little ${assetName}`,
          lines: [`needs ${showVal(addLin(lin(0n), d, -1n), true)}`],
          reason: "panic: arithmetic underflow (0x11)",
        };
    }
    for (const [who, d] of moves) {
      st.bal.set(who, addLin(st.bal.get(who) ?? lin(0n), d));
      lines.push(
        `${who} ${d.c >= 0n && known(d) ? "+" : ""}${showVal(d, true)}`,
      );
    }
    for (const [key, v] of writes) {
      st.slots.set(key, v);
      lines.push(`${key} = ${showVal(v)}`);
    }
    for (const [k, t] of seq)
      if (k === "e") lines.push(`emit ${m.byId[t]?.name ?? t}`);
    const r = pathReport(m, fn);
    return {
      status: "pass",
      head,
      lines,
      line: m.lineOf(p),
      findings: r.findings.map((f) => f.id),
    };
  }

  function runSnapshot(n: Extract<ScNode, { kind: "snapshot" }>): NodeRun {
    const wired = into(n.id, "slot");
    const of = wired?.port.startsWith("w:") ? wired.port.slice(2) : n.of;
    const who = actorOf(n.id, "who")?.label;
    let key: string;
    let v: Val;
    if (of === "balance") {
      key = `${assetName ?? "token"}.balanceOf(${who ?? self})`;
      v = st.bal.get(who ?? self) ?? lin(0n);
    } else {
      const p = m.byId[of];
      if (!p) return { status: "unknown", head: "Pick a slot", lines: [] };
      if (p.mapping && !who)
        return {
          status: "unknown",
          head: `Wire who for ${slotName(p)}[…]`,
          lines: [],
        };
      key = p.mapping ? `${slotName(p)}[${who}]` : slotName(p);
      v =
        p.mapping && st.dirty.has(slotName(p)) && !st.slots.has(key)
          ? null
          : slotGet(m, st, key);
    }
    const usdc = of === "balance";
    const ok = v !== null && (!isLin(v) || known(v));
    return {
      status: ok ? "pass" : "unknown",
      head: `${key} = ${showVal(v, usdc)}`,
      lines: ok ? [] : ["symbolic: run the exported test for the number"],
      value: v,
    };
  }

  function runAssert(n: Extract<ScNode, { kind: "assert" }>): NodeRun {
    const c = n.check;
    const judge = (
      ok: boolean | null,
      head: string,
      lines: string[],
      f?: Omit<LabFinding, "node">,
    ): NodeRun => {
      if (ok === false && f) findings.push({ node: n.id, ...f });
      return {
        status: ok === null ? "unknown" : ok ? "pass" : "fail",
        head,
        lines,
        value: ok,
      };
    };
    if (c.type === "cmp") {
      const a = valueAt(into(n.id, "a"));
      const b = valueAt(into(n.id, "b"));
      const ok = compare(a, b, c.op);
      return judge(
        ok,
        `${showVal(a)} ${c.op} ${showVal(b)}`,
        ok === null ? ["depends on a symbolic value · confirm with forge"] : [],
        {
          title: `Assert a ${c.op} b failed`,
          detail: `${showVal(a)} ${c.op} ${showVal(b)} does not hold.`,
          fix: FIX.cmp,
        },
      );
    }
    if (c.type === "sum" || c.type === "solvent") {
      if (!pair)
        return judge(null, "No total / mapping pair in this contract", []);
      const total = slotGet(m, st, pair.total);
      if (c.type === "solvent") {
        const held = st.bal.get(self) ?? lin(0n);
        const ok = compare(held, total, ">=");
        return judge(
          ok,
          `${self} ${showVal(held)} ≥ ${pair.total} ${showVal(total)}`,
          [],
          {
            title: `${self} holds less ${assetName} than ${pair.total}`,
            detail: `${showVal(held)} < ${showVal(total)}`,
            fix: FIX.solvent(pair.total),
          },
        );
      }
      let sum: Lin | null = lin(0n);
      for (const [k, v] of st.slots)
        if (k.startsWith(`${pair.map}[`))
          sum = sum && isLin(v) ? addLin(sum, v) : null;
      if (st.dirty.has(pair.map)) sum = null;
      const ok = sum && compare(total, sum, "==");
      return judge(
        ok ?? null,
        `${pair.total} ${showVal(total)} == Σ ${pair.map} ${showVal(sum)}`,
        [],
        {
          title: `${pair.total} != Σ ${pair.map}[…]`,
          detail: `${showVal(total)} vs ${showVal(sum)}`,
          fix: FIX.sum(pair.total, pair.map),
        },
      );
    }
    const fn = fnName(m.byId[c.fn] ?? ({ name: c.fn } as never));
    if (c.type === "only") {
      const role = m.byId[c.fn]?.caller ?? "anyone";
      const g = senderRevert(revertsOf(m, c.fn));
      return judge(
        !!g && role !== "anyone",
        g
          ? `${fn} checks ${g.cond} · "${g.reason}"`
          : `${fn} has no msg.sender check`,
        g ? [`L${g.line + 1} ${m.lines[g.line]?.trim()}`] : [],
        {
          title: `${fn} is not restricted to ${role}`,
          detail:
            "No require comparing msg.sender with a role was found on its path.",
          fix: FIX.only(fn, role),
        },
      );
    }
    const g = pauseRevert(m, c.fn);
    const flag = g ? (/^!\s*(\w+)$/.exec(g.cond)?.[1] ?? "paused") : "paused";
    const now = slotGet(m, st, flag);
    if (now !== true)
      return judge(null, `not ${flag} here · nothing to check`, [
        "run the pause call before this assert",
      ]);
    return judge(
      !!g,
      g ? `${fn} reverts "${g.reason}" while ${flag}` : `${fn} ignores ${flag}`,
      g ? [`L${g.line + 1} ${m.lines[g.line]?.trim()}`] : [],
      {
        title: `${fn} still runs while ${flag}`,
        detail: `${fn} has no require on ${flag}.`,
        fix: FIX.paused(fn),
      },
    );
  }
}

// ---- templates -----------------------------------------------------------------------

let made = 0;
export const newId = (kind: string) =>
  `${kind}${Date.now().toString(36)}${(made++).toString(36)}`;

const W = (from: string, fp: string, to: string, tp: string): Wire => ({
  from: { node: from, port: fp },
  to: { node: to, port: tp },
});
const entryLike = (m: PlayModel, re: RegExp) =>
  m.entry.find((id) => re.test(fnName(m.byId[id])));

export type Template = { name: string; build: () => Scenario };

/** Ready-made scenarios, only where the contract has the pieces they need. */
export function templates(m: PlayModel): Template[] {
  const out: Template[] = [];
  const mk = (name: string, nodes: ScNode[], wires: Wire[]): Scenario => ({
    id: newId("sc"),
    name,
    nodes,
    wires,
  });
  const actor = (
    id: string,
    x: number,
    y: number,
    label: string,
    role: string,
    balance: string,
  ): ScNode => ({ id, x, y, kind: "actor", label, role, balance });
  const amountArg = (fn: string) =>
    argsOf(m, fn).findIndex((a) => /^uint/.test(a.type));

  const owned =
    m.entry.find(
      (id) => m.byId[id]?.caller === "owner" && /oracle/i.test(id),
    ) ?? m.entry.find((id) => (m.byId[id]?.caller ?? "anyone") !== "anyone");
  if (owned) {
    const role = m.byId[owned].caller as string;
    const g = senderRevert(revertsOf(m, owned));
    out.push({
      name: `Non-${role} cannot ${fnName(m.byId[owned])}`,
      build: () =>
        mk(
          `Non-${role} cannot ${fnName(m.byId[owned])}`,
          [
            actor("alice", 0, 0, "alice", "user", "1,000"),
            { id: "call", x: 300, y: 0, kind: "call", fn: owned },
            {
              id: "expect",
              x: 640,
              y: 0,
              kind: "expect",
              reason: g?.reason ?? "",
            },
            {
              id: "only",
              x: 640,
              y: 150,
              kind: "assert",
              check: { type: "only", fn: owned },
            },
          ],
          [
            W("alice", "addr", "call", "caller"),
            ...(g ? [W("call", `r:${g.reason}`, "expect", "call")] : []),
            W("call", "then", "only", "then"),
          ],
        ),
    });
  }

  const dep = entryLike(m, /^deposit$/i);
  const wd = entryLike(m, /^withdraw$/i);
  const pair = sharePair(m);
  if (dep && wd && pair && amountArg(dep) >= 0 && amountArg(wd) >= 0) {
    const map = slotOf(m, pair.map)?.id as string;
    out.push({
      name: "Deposit then withdraw returns funds",
      build: () =>
        mk(
          "Deposit then withdraw returns funds",
          [
            actor("alice", 0, 40, "alice", "user", "5,000"),
            { id: "amt", x: 0, y: 220, kind: "const", value: "1,000" },
            { id: "before", x: 260, y: -160, kind: "snapshot", of: "balance" },
            { id: "dep", x: 300, y: 120, kind: "call", fn: dep },
            { id: "held", x: 620, y: -40, kind: "snapshot", of: map },
            { id: "wd", x: 900, y: 120, kind: "call", fn: wd },
            { id: "after", x: 1200, y: -40, kind: "snapshot", of: "balance" },
            {
              id: "same",
              x: 1480,
              y: 40,
              kind: "assert",
              check: { type: "cmp", op: "==" },
            },
          ],
          [
            W("alice", "addr", "before", "who"),
            W("before", "then", "dep", "then"),
            W("alice", "addr", "dep", "caller"),
            W("amt", "value", "dep", `a${amountArg(dep)}`),
            W("dep", "then", "held", "then"),
            W("dep", `w:${map}`, "held", "slot"),
            W("alice", "addr", "held", "who"),
            W("held", "then", "wd", "then"),
            W("alice", "addr", "wd", "caller"),
            W("held", "value", "wd", `a${amountArg(wd)}`),
            W("wd", "then", "after", "then"),
            W("alice", "addr", "after", "who"),
            W("after", "then", "same", "then"),
            W("after", "value", "same", "a"),
            W("before", "value", "same", "b"),
          ],
        ),
    });
  }

  const pause = entryLike(m, /^pause$/i);
  if (pause && dep && pauseRevert(m, dep) && amountArg(dep) >= 0) {
    const role = m.byId[pause].caller ?? "anyone";
    const reason = pauseRevert(m, dep)?.reason as string;
    out.push({
      name: `Pause blocks ${fnName(m.byId[dep])}`,
      build: () =>
        mk(
          `Pause blocks ${fnName(m.byId[dep])}`,
          [
            actor(
              "k",
              0,
              0,
              role === "anyone" ? "keeper" : role,
              role === "anyone" ? "user" : role,
              "0",
            ),
            actor("alice", 0, 200, "alice", "user", "1,000"),
            { id: "amt", x: 0, y: 380, kind: "const", value: "100" },
            { id: "pause", x: 280, y: 0, kind: "call", fn: pause },
            { id: "dep", x: 600, y: 160, kind: "call", fn: dep },
            { id: "expect", x: 920, y: 160, kind: "expect", reason },
            {
              id: "blocks",
              x: 920,
              y: 330,
              kind: "assert",
              check: { type: "paused", fn: dep },
            },
          ],
          [
            W("k", "addr", "pause", "caller"),
            W("pause", "then", "dep", "then"),
            W("alice", "addr", "dep", "caller"),
            W("amt", "value", "dep", `a${amountArg(dep)}`),
            W("dep", `r:${reason}`, "expect", "call"),
            W("dep", "then", "blocks", "then"),
          ],
        ),
    });
  }

  if (dep && pair && amountArg(dep) >= 0) {
    const sum = { type: "sum" } as const;
    out.push({
      name: `${pair.map[0].toUpperCase()}${pair.map.slice(1)} accounting holds after deposits by two users`,
      build: () =>
        mk(
          `${pair.map[0].toUpperCase()}${pair.map.slice(1)} accounting holds after deposits by two users`,
          [
            actor("alice", 0, 0, "alice", "user", "5,000"),
            { id: "a1", x: 0, y: 170, kind: "const", value: "1,000" },
            actor("bob", 0, 300, "bob", "user", "20,000"),
            { id: "a2", x: 0, y: 470, kind: "const", value: "20,000" },
            { id: "d1", x: 280, y: 60, kind: "call", fn: dep },
            { id: "d2", x: 600, y: 300, kind: "call", fn: dep },
            { id: "sum", x: 920, y: 120, kind: "assert", check: sum },
            ...(assetSlot(m)
              ? [
                  {
                    id: "solvent",
                    x: 920,
                    y: 300,
                    kind: "assert",
                    check: { type: "solvent" },
                  } as ScNode,
                ]
              : []),
          ],
          [
            W("alice", "addr", "d1", "caller"),
            W("a1", "value", "d1", `a${amountArg(dep)}`),
            W("d1", "then", "d2", "then"),
            W("bob", "addr", "d2", "caller"),
            W("a2", "value", "d2", `a${amountArg(dep)}`),
            W("d2", "then", "sum", "then"),
            ...(assetSlot(m) ? [W("sum", "then", "solvent", "then")] : []),
          ],
        ),
    });
  }
  return out;
}

/** Blank card of `kind` for the palette. */
export function paletteNode(
  m: PlayModel,
  kind: ScNode["kind"],
  x: number,
  y: number,
  fn?: string,
): ScNode {
  const id = newId(kind);
  switch (kind) {
    case "actor":
      return {
        id,
        x,
        y,
        kind,
        label: `user${made}`,
        role: "user",
        balance: "1,000",
      };
    case "const":
      return { id, x, y, kind, value: "100" };
    case "call":
      return { id, x, y, kind, fn: fn ?? m.entry[0] };
    case "expect":
      return { id, x, y, kind, reason: "" };
    case "assert":
      return { id, x, y, kind, check: assertOptions(m)[0].check };
    case "snapshot":
      return { id, x, y, kind, of: "balance" };
  }
}
