"use client";

import { useEffect, useMemo, useState } from "react";
import type { AtlasModel } from "../utils/model";
import {
  callDeltas,
  callerRoles,
  dropVerdict,
  fnName,
  formatUsdc,
  isAmountParam,
  paramsOf,
  parseUsdc,
  stepCaption,
  type TraceCall,
  traceBindings,
} from "../utils/playground";
import type { CitySim } from "./useCitySim";

/**
 * USDC playground state: who the token calls as, with how much, and which building it was dropped
 * on. A drop on an entry point replays that ONE call through the step simulation; the run follows
 * the selection (selecting anything else ends it), so source panel and inspector stay in sync.
 */
export function usePlayground(
  model: AtlasModel,
  calls: TraceCall[],
  selected: string | null,
  onSelect: (id: string | null) => void,
  sim: CitySim,
) {
  const roles = callerRoles(model);
  const [caller, setCaller] = useState("anyone");
  const [amount, setAmount] = useState("1,000");
  /** test whose decoded values replace the symbolic ones, by name */
  const [traceTest, setTraceTest] = useState<string | null>(null);
  /** click-to-pick: the next building clicked receives the token */
  const [armed, setArmed] = useState(false);
  const [drag, setDrag] = useState<{
    id: string | null;
    x: number;
    y: number;
  } | null>(null);
  const [run, setRun] = useState<{ id: string; caller: string } | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const active = run && run.id === selected ? run : null;
  const verdict = active ? dropVerdict(model, active.id, active.caller) : null;
  const entry = verdict?.kind === "call" ? verdict.entry : null;
  const passed = verdict?.kind === "call" && verdict.access.pass;
  const p = entry ? model.byId[entry] : null;
  /** test calls into `id`; `key` tells apart a test that calls it more than once */
  const tracesOf = (id: string) => {
    const q = model.byId[id];
    const mine = q ? calls.filter((c) => c.fn === fnName(q)) : [];
    return mine.map((c) => {
      const same = mine.filter((x) => x.test === c.test);
      const n = same.indexOf(c);
      return { ...c, key: same.length > 1 ? `${c.test} #${n + 1}` : c.test };
    });
  };
  const traces = entry ? tracesOf(entry) : [];
  const trace = traces.find((c) => c.key === traceTest);
  const raw = parseUsdc(amount);

  const bound = useMemo(
    () => (entry && trace ? traceBindings(model, entry, trace) : undefined),
    [model, entry, trace],
  );
  const amountParam = p
    ? paramsOf(model.lines[model.lineOf(p)] ?? "").find(isAmountParam)
    : undefined;
  const traced = amountParam && bound?.[amountParam.name];
  const amountLabel = traced
    ? formatUsdc(BigInt(traced))
    : raw != null
      ? formatUsdc(raw)
      : "amount";
  const callerLabel = trace ? (trace.caller ?? "test") : "caller";
  const captions = useMemo(
    () =>
      entry && passed
        ? model.stepLines(entry).map((l) =>
            stepCaption(model, entry, l, {
              amount: amountLabel,
              caller: callerLabel,
              bound,
            }),
          )
        : undefined,
    [model, entry, passed, amountLabel, callerLabel, bound],
  );
  const deltas =
    entry && passed
      ? callDeltas(
          model,
          entry,
          { amount: amountLabel, caller: callerLabel, bound },
          trace,
        )
      : null;

  // start the replay once the dropped-on entry is the simulation's entry
  useEffect(() => {
    if (!pending || sim.entry !== pending) return;
    setPending(null);
    sim.play();
  }, [pending, sim]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setArmed(false);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  function reset() {
    setRun(null);
    setArmed(false);
    setPending(null);
    setDrag(null);
    setTraceTest(null);
    if (sim.entry) sim.reset();
  }

  /** Token lands on `id` (null = dropped on empty ground → back to the dock), optionally as `as`. */
  function drop(id: string | null, as = caller) {
    setArmed(false);
    setDrag(null);
    if (as !== caller) setCaller(as);
    const v = id ? dropVerdict(model, id, as) : null;
    if (!id || !v) return reset();
    onSelect(id);
    setRun({ id, caller: as });
    if (v.kind === "call" && v.access.pass) {
      if (sim.entry === id) sim.reset();
      setPending(id);
    }
    if (v.kind === "call" && traceTest)
      setTraceTest(
        tracesOf(id).some((c) => c.key === traceTest) ? traceTest : null,
      );
  }

  return {
    roles,
    caller,
    setCaller,
    cycleCaller: () =>
      setCaller(roles[(roles.indexOf(caller) + 1) % roles.length]),
    amount,
    setAmount,
    amountOk: raw != null,
    armed,
    setArmed,
    drag,
    setDrag,
    /** run on the selected building, null when none / selection moved on */
    active,
    verdict,
    passed,
    /** the call was stopped by access control (no steps to replay) */
    stopped: verdict?.kind === "call" && !verdict.access.pass,
    traces,
    trace,
    traceTest,
    setTraceTest,
    tracesOf,
    amountLabel,
    /** false when the called function takes no USDC amount (e.g. withdraw(shareAmount)) */
    amountUsed: !entry || !!amountParam,
    callerLabel,
    captions,
    deltas,
    drop,
    reset,
    /** verdict a drop on `id` would get right now (hover preview) */
    preview: (id: string | null) =>
      id ? dropVerdict(model, id, caller) : null,
  };
}

export type Playground = ReturnType<typeof usePlayground>;
