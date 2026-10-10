"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  Dropdown,
  FloatingDock,
  IconButton,
  Input,
  SegmentedControl,
  Toolbar,
} from "@/components/ui";
import type { AtlasModel } from "@/features/atlas";
import { useScenarios } from "@/features/atlas/hooks/useScenarios";
import { ICON_PATH } from "@/features/atlas/utils/icons";
import { foundryTest } from "@/features/atlas/utils/lab-foundry";
import {
  connect,
  contractGraph,
  type GNode,
  KIND_META,
  PORT_COLOR,
  type PortType,
  revertsOf,
  type Wire,
  wireError,
} from "@/features/atlas/utils/lab-graph";
import {
  actorRoles,
  assertOptions,
  checkKey,
  type NodeRun,
  newId,
  paletteNode,
  publicSlots,
  type RunResult,
  runScenario,
  type Scenario,
  type ScNode,
  scenarioCard,
  scenarioErrors,
  templates,
} from "@/features/atlas/utils/lab-scenario";
import type { TraceCall } from "@/features/atlas/utils/playground";
import { fnName } from "@/features/atlas/utils/playground";
import { LabCanvas, wireKey } from "./LabCanvas";
import "./lab.css";

type Mode = "contract" | "scenario";
type Panel = "add" | "code" | "settings" | "help" | null;
const STEP_MS = 650;

const ICONS: Record<string, string> = {
  add: "M12 5v14M5 12h14",
  code: "M8 7l-5 5 5 5M16 7l5 5-5 5",
  settings:
    "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4",
  export: "M12 4v11M7 10l5 5 5-5M5 20h14",
  share:
    "M18 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 13l8 4M16 7l-8 4",
  help: "M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.5",
};
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="lab-ico">
    <path d={d} />
  </svg>
);

const KindIco = ({ kind }: { kind: keyof typeof KIND_META }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="lab-ico sm">
    <path d={ICON_PATH[KIND_META[kind].icon]} />
  </svg>
);

const download = (name: string, text: string, type = "text/plain") => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Lab: node editor. Contract mode = the contract as read-only cards wired from
 * the atlas; Scenario mode = wire actors, amounts and calls into a test of intended behaviour,
 * replay it symbolically and export it as a Foundry test.
 */
export function LabView({
  model,
  calls = [],
  proposed = [],
  selected,
  onSelect,
  only,
}: {
  model: AtlasModel;
  calls?: TraceCall[];
  /** luora-scenarios.json entries for this contract (unvalidated) */
  proposed?: unknown[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** pin the Lab to one mode and hide its Contract | Scenario switch (Trace page's Scenario tab) */
  only?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(only ?? "contract");
  const [panel, setPanel] = useState<Panel>(null);
  const [card, setCard] = useState<string | null>(null);
  const [selWire, setSelWire] = useState<string | null>(null);
  const [snap, setSnap] = useState(true);
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>(
    {},
  );
  const [run, setRun] = useState<{
    res: RunResult;
    at: number;
    id: string;
  } | null>(null);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);
  const store = useScenarios(model.contract, () =>
    templates(model).map((t) => t.build()),
  );
  const sc = store.current;
  // AI proposals not imported yet; invalid ones stay listed but disabled, with the reason
  const proposals = useMemo(
    () =>
      proposed
        .map((p) => {
          const s = p as Scenario;
          return { s, id: `ai-${s.id}`, errs: scenarioErrors(model, p) };
        })
        .filter((x) => !store.list.some((s) => s.id === x.id)),
    [proposed, model, store.list],
  );

  // ---- graph for the current mode ----
  const contract = useMemo(() => contractGraph(model), [model]);
  const graph = useMemo(() => {
    if (mode === "contract")
      return {
        nodes: contract.nodes.map((n) =>
          moved[n.id] ? { ...n, ...moved[n.id] } : n,
        ),
        wires: contract.wires,
      };
    return {
      nodes: (sc?.nodes ?? []).map((n) => scenarioCard(model, n)),
      wires: sc?.wires ?? [],
    };
  }, [mode, contract, moved, sc, model]);
  const hot = new Set(
    selected
      ? graph.nodes.filter((n) => n.piece === selected).map((n) => n.id)
      : [],
  );

  // ---- editing ----
  const edit = (f: (s: Scenario) => Scenario, keepRun = false) => {
    store.update(f);
    if (!keepRun) setRun(null);
  };
  const patch = (id: string, p: Partial<ScNode>) =>
    edit((s) => ({
      ...s,
      nodes: s.nodes.map((n) => (n.id === id ? ({ ...n, ...p } as ScNode) : n)),
    }));
  const grid = (v: number) => (snap ? Math.round(v / 12) * 12 : v);
  const move = (id: string, x: number, y: number) => {
    if (mode === "contract") return setMoved((m) => ({ ...m, [id]: { x, y } }));
    edit(
      (s) => ({
        ...s,
        nodes: s.nodes.map((n) =>
          n.id === id ? { ...n, x: grid(x), y: grid(y) } : n,
        ),
      }),
      true,
    );
  };
  const wire = (w: Wire) => {
    if (!sc) return "no scenario";
    const rest = sc.wires.filter(
      (x) => x.to.node !== w.to.node || x.to.port !== w.to.port,
    );
    const err = wireError(graph.nodes, rest, w);
    if (!err) edit((s) => ({ ...s, wires: connect(s.wires, w) }));
    return err;
  };
  const unwire = (w: Wire) =>
    edit((s) => ({
      ...s,
      wires: s.wires.filter((x) => wireKey(x) !== wireKey(w)),
    }));
  const remove = () => {
    if (card)
      edit((s) => ({
        ...s,
        nodes: s.nodes.filter((n) => n.id !== card),
        wires: s.wires.filter(
          (w) => w.from.node !== card && w.to.node !== card,
        ),
      }));
    else if (selWire)
      edit((s) => ({
        ...s,
        wires: s.wires.filter((w) => wireKey(w) !== selWire),
      }));
    setCard(null);
    setSelWire(null);
  };
  const add = (kind: ScNode["kind"], fn?: string) => {
    if (!sc) return;
    const xs = sc.nodes.map((n) => n.x);
    const n = paletteNode(
      model,
      kind,
      grid(xs.length ? Math.max(...xs) + 300 : 0),
      grid(Math.min(0, ...sc.nodes.map((q) => q.y))),
      fn,
    );
    edit((s) => ({ ...s, nodes: [...s.nodes, n] }));
    setCard(n.id);
    setPanel(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          "input, textarea, select, [contenteditable]",
        )
      )
        return;
      if (e.key === "Escape") {
        setCard(null);
        setSelWire(null);
        setPanel(null);
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        mode === "scenario" &&
        (card || selWire)
      ) {
        e.preventDefault();
        remove();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  // ---- run: symbolic replay, one card per tick ----
  const start = () => {
    if (!sc) return;
    setMode("scenario");
    setRun({ res: runScenario(model, sc, calls), at: 0, id: sc.id });
  };
  useEffect(() => {
    if (!run || run.at > run.res.order.length) return;
    const t = setTimeout(
      () => setRun((r) => r && { ...r, at: r.at + 1 }),
      run.at ? STEP_MS : 50,
    );
    return () => clearTimeout(t);
  }, [run]);
  const live = run && sc && run.id === sc.id ? run : null;
  const shown: Record<string, NodeRun> = {};
  if (live) {
    const done = new Set(live.res.order.slice(0, live.at));
    for (const [id, r] of Object.entries(live.res.runs)) {
      const from = sc?.wires.find(
        (w) => w.to.node === id && w.to.port === "call",
      )?.from.node;
      if (done.has(id) || (from && done.has(from))) shown[id] = r;
    }
  }
  const finished = live && live.at > live.res.order.length;
  const pulse = new Set(live && !finished ? [live.res.order[live.at - 1]] : []);

  const test = sc ? foundryTest(model, sc) : null;
  const exportTest = () => test && download(test.file, test.source);
  const share = async () => {
    if (!sc) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(sc, null, 1));
      setNote({ text: "Scenario JSON copied", ok: true });
    } catch {
      setNote({ text: "Clipboard blocked", ok: false });
    }
  };
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2000);
    return () => clearTimeout(t);
  }, [note]);

  const pick = (id: string | null) => {
    setCard(id);
    setSelWire(null);
    const n = graph.nodes.find((g) => g.id === id);
    if (n?.piece) onSelect(n.piece);
  };

  // ---- inline widgets ----
  const widgets = (g: GNode) => {
    const n = sc?.nodes.find((x) => x.id === g.id);
    if (!n) return null;
    if (n.kind === "actor")
      return (
        <>
          <label className="w">
            <span>name</span>
            <input
              value={n.label}
              onChange={(e) =>
                patch(n.id, { label: e.target.value.replace(/\s+/g, "_") })
              }
            />
          </label>
          <div className="w">
            <span>role</span>
            <Dropdown
              variant="card"
              ariaLabel="Actor role"
              value={n.role}
              onChange={(role) => patch(n.id, { role })}
              options={actorRoles(model).map((r) => ({ value: r, label: r }))}
            />
          </div>
          <label className="w">
            <span>USDC</span>
            <input
              inputMode="decimal"
              value={n.balance}
              onChange={(e) => patch(n.id, { balance: e.target.value })}
            />
          </label>
        </>
      );
    if (n.kind === "const")
      return (
        <label className="w">
          <span>value</span>
          <input
            inputMode="decimal"
            value={n.value}
            onChange={(e) => patch(n.id, { value: e.target.value })}
          />
        </label>
      );
    if (n.kind === "expect") {
      const reasons = [
        ...new Set(
          model.entry.flatMap((fn) =>
            revertsOf(model, fn).map((r) => r.reason),
          ),
        ),
      ];
      return (
        <div className="w">
          <span>reason</span>
          <Dropdown
            variant="card"
            ariaLabel="Expected revert reason"
            value={n.reason || "__wire"}
            onChange={(r) => patch(n.id, { reason: r === "__wire" ? "" : r })}
            options={[
              { value: "__wire", label: "from wire" },
              ...reasons.map((r) => ({ value: r, label: r })),
            ]}
          />
        </div>
      );
    }
    if (n.kind === "assert") {
      const opts = assertOptions(model);
      return (
        <div className="w">
          <span>check</span>
          <Dropdown
            variant="card"
            ariaLabel="Assert check"
            value={checkKey(n.check)}
            onChange={(key) => {
              const o = opts.find((x) => checkKey(x.check) === key);
              if (o)
                edit((s) => ({
                  ...s,
                  nodes: s.nodes.map((q) =>
                    q.id === n.id ? { ...q, check: o.check } : q,
                  ),
                  wires:
                    o.check.type === "cmp"
                      ? s.wires
                      : s.wires.filter(
                          (w) => w.to.node !== n.id || w.to.port === "flow",
                        ),
                }));
            }}
            options={opts.map((o) => ({
              value: checkKey(o.check),
              label: o.label,
            }))}
          />
        </div>
      );
    }
    if (n.kind === "snapshot")
      return (
        <div className="w">
          <span>read</span>
          <Dropdown
            variant="card"
            ariaLabel="Value to read"
            value={n.of}
            onChange={(of) => patch(n.id, { of })}
            options={[
              { value: "balance", label: "USDC balance" },
              ...publicSlots(model).map((p) => ({
                value: p.id,
                label: p.name.split("· ").pop() ?? p.name,
              })),
            ]}
          />
        </div>
      );
    return null;
  };

  const tool = (k: string, title: string, on: () => void, active = false) => (
    <IconButton label={title} active={active} onClick={on}>
      <Icon d={ICONS[k]} />
    </IconButton>
  );
  const toggle = (p: Panel) => setPanel(panel === p ? null : p);
  const res = live?.res;

  return (
    <div className="lab-main">
      <div
        data-no-pan
        className="lab-chrome absolute top-4 left-4 z-[4] flex flex-col items-start gap-4"
      >
        {!only && (
          <Toolbar>
            <SegmentedControl
              value={mode}
              onChange={(m) => {
                setMode(m);
                setCard(null);
              }}
              options={[
                {
                  value: "contract",
                  label: "Contract",
                  title: "Read-only graph of the contract",
                },
                {
                  value: "scenario",
                  label: "Scenario",
                  title: "Build a test of intended behaviour",
                },
              ]}
            />
          </Toolbar>
        )}
        {/* only the tools that work here (docs/ux/atlas.md D2): the read-only graph keeps
            settings and help; the scenario editor gets add, code, export and share too */}
        <nav aria-label="Lab tools">
          <Toolbar vertical>
            {mode === "scenario" &&
              tool("add", "Add node", () => toggle("add"), panel === "add")}
            {mode === "scenario" &&
              tool(
                "code",
                "Generated Foundry test",
                () => toggle("code"),
                panel === "code",
              )}
            {tool(
              "settings",
              "Settings",
              () => toggle("settings"),
              panel === "settings",
            )}
            {mode === "scenario" && tool("export", "Export .t.sol", exportTest)}
            {mode === "scenario" && tool("share", "Copy scenario JSON", share)}
            {tool("help", "Help", () => toggle("help"), panel === "help")}
          </Toolbar>
        </nav>
      </div>

      <LabCanvas
        nodes={graph.nodes}
        wires={graph.wires}
        editable={mode === "scenario"}
        selected={card}
        selWire={selWire}
        hot={hot}
        onSelect={pick}
        onSelectWire={setSelWire}
        onMove={move}
        onConnect={mode === "scenario" ? wire : undefined}
        onDisconnect={unwire}
        runs={mode === "scenario" ? shown : undefined}
        pulse={pulse}
        widgets={widgets}
        fitKey={`${mode}:${mode === "scenario" ? sc?.id : model.contract}`}
      />
      <p className="lab-status">
        {mode === "contract"
          ? "Read-only · drag cards, drag the background to pan, scroll to zoom"
          : "Drag from a port to wire it · Delete removes the selection"}
      </p>

      {mode === "scenario" && sc && (
        <div
          data-no-pan
          className="absolute bottom-[44px] left-1/2 z-[4] w-max max-w-[calc(100%-140px)] -translate-x-1/2"
        >
          <FloatingDock>
            <div className="flex flex-wrap items-center gap-1.5">
              <Dropdown
                className="w-[200px]"
                ariaLabel="Scenario"
                value={sc.id}
                onChange={(id) => {
                  const p = proposals.find((x) => x.id === id);
                  if (!p) return store.select(id);
                  const { name, nodes, wires } = p.s;
                  store.add({ id: p.id, name, nodes, wires, proposed: true });
                  setRun(null);
                }}
                options={[
                  ...store.list.map((s) => ({
                    value: s.id,
                    label: s.proposed ? `AI · ${s.name}` : s.name,
                  })),
                  ...proposals.map((p) => ({
                    value: p.id,
                    label: `${p.errs.length ? "Invalid · " : "AI · "}${p.s.name}`,
                    disabled: p.errs.length > 0,
                    title: p.errs.join("\n") || undefined,
                    group: "Proposed by your AI client",
                  })),
                ]}
              />
              {sc.proposed && (
                <span title="Proposed by your AI client over MCP: review it before you rely on it">
                  <Chip>AI proposal</Chip>
                </span>
              )}
              <Input
                className="w-[200px]"
                value={sc.name}
                aria-label="Scenario name"
                onChange={(e) =>
                  edit((s) => ({ ...s, name: e.target.value }), true)
                }
              />
              <Dropdown
                className="w-[150px]"
                ariaLabel="New from template"
                placeholder="New…"
                value=""
                onChange={(v) => {
                  const t = templates(model).find((x) => x.name === v);
                  if (v === "blank")
                    store.add({
                      id: newId("sc"),
                      name: "New scenario",
                      nodes: [],
                      wires: [],
                    });
                  else if (t) store.add(t.build());
                  setRun(null);
                }}
                options={[
                  { value: "blank", label: "Blank scenario" },
                  ...templates(model).map((t) => ({
                    value: t.name,
                    label: `Template · ${t.name}`,
                  })),
                ]}
              />
              <Button
                variant="accent"
                onClick={start}
                disabled={!sc.nodes.length}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="size-3.5 fill-current"
                >
                  <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
                </svg>
                Run
              </Button>
              <Button onClick={exportTest}>Export .t.sol ↓</Button>
            </div>
          </FloatingDock>
        </div>
      )}

      {panel === "add" && (
        <div className="lab-float lab-pop add" data-no-pan>
          <h4>Add node</h4>
          {(
            [
              ["actor", "Actor"],
              ["const", "Constant amount"],
            ] as const
          ).map(([k, label]) => (
            <button type="button" key={k} onClick={() => add(k)}>
              <KindIco kind={k} /> {label}
            </button>
          ))}
          {model.entry.map((fn) => (
            <button type="button" key={fn} onClick={() => add("call", fn)}>
              <KindIco kind="call" /> Call {fnName(model.byId[fn])}
              <em>{model.byId[fn]?.caller ?? "anyone"}</em>
            </button>
          ))}
          {(
            [
              ["expect", "Expect revert"],
              ["assert", "Assert"],
              ["snapshot", "Snapshot"],
            ] as const
          ).map(([k, label]) => (
            <button type="button" key={k} onClick={() => add(k)}>
              <KindIco kind={k} /> {label}
            </button>
          ))}
        </div>
      )}
      {panel === "settings" && (
        <div className="lab-float lab-pop" data-no-pan>
          <h4>Settings</h4>
          {mode === "scenario" ? (
            <label className="chk">
              <input
                type="checkbox"
                checked={snap}
                onChange={() => setSnap(!snap)}
              />{" "}
              Snap cards to grid
            </label>
          ) : (
            <button type="button" onClick={() => setMoved({})}>
              Reset contract layout
            </button>
          )}
          {sc && (
            <button
              type="button"
              className="bad"
              onClick={() => store.remove(sc.id)}
            >
              Delete scenario “{sc.name}”
            </button>
          )}
        </div>
      )}
      {panel === "code" && test && (
        <div className="lab-float lab-pop code" data-no-pan>
          <h4>
            {test.file}
            <Button size="sm" onClick={exportTest}>
              Download ↓
            </Button>
          </h4>
          <p>
            Run it: <code>node luora-scenario.mjs ~/Downloads/{test.file}</code>{" "}
            in foundry/
          </p>
          <pre>{test.source}</pre>
        </div>
      )}
      {panel === "help" && (
        <div className="lab-float lab-pop help" data-no-pan>
          <h4>{mode === "contract" ? "Graph" : "Scenarios"}</h4>
          <p>
            {mode === "contract"
              ? "Each function on the left, wired to the storage it writes, the contracts it calls and the events it emits. Select a card or a piece below: its cards and their neighbours stay, the rest fades."
              : "Scenarios test intended behaviour: access control holds, accounting stays consistent, pause works, funds round-trip. A failing assert is a finding."}
          </p>
          <ul className="legend">
            {(Object.keys(PORT_COLOR) as PortType[]).map((t) => (
              <li key={t}>
                <i style={{ background: PORT_COLOR[t] }} />
                {t === "actor"
                  ? "actor / address"
                  : t === "amount"
                    ? "amount / uint"
                    : t === "slot"
                      ? "state slot"
                      : t === "bool"
                        ? "bool / assert"
                        : t === "flow"
                          ? "then (execution order)"
                          : t}
              </li>
            ))}
          </ul>
          <p className="dim">
            / or ⌘K search · Esc clears · Delete removes · drag a wired input to
            rewire it
          </p>
        </div>
      )}

      {res && mode === "scenario" && (
        <aside className="lab-float lab-run" data-no-pan>
          <h4>
            Run · {sc?.name}
            <span>
              {finished
                ? "done"
                : `${Math.min(live?.at ?? 0, res.order.length)}/${res.order.length}`}
              <IconButton
                size="sm"
                label="Close run"
                onClick={() => setRun(null)}
              >
                ✕
              </IconButton>
            </span>
          </h4>
          <ol>
            {res.order.map((id, i) => {
              const n = sc?.nodes.find((x) => x.id === id);
              const r = shown[id];
              const title =
                n?.kind === "call"
                  ? `Call ${fnName(model.byId[n.fn] ?? ({ name: n.fn } as never))}`
                  : n?.kind === "snapshot"
                    ? "Snapshot"
                    : "Assert";
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={r ? r.status : "wait"}
                    onClick={() => pick(id)}
                  >
                    <i />
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <b>{title}</b>
                    <em>{r ? r.head : "…"}</em>
                  </button>
                </li>
              );
            })}
          </ol>
          {finished && (
            <>
              <p>
                {res.findings.length
                  ? `${res.findings.length} finding${res.findings.length > 1 ? "s" : ""}`
                  : Object.values(res.runs).some((r) => r.status === "unknown")
                    ? "No failures · some checks need forge (symbolic values)"
                    : "All checks hold"}
              </p>
              {res.findings.map((f) => (
                <div key={f.node + f.title} className="finding">
                  <b>{f.title}</b>
                  <span>{f.detail}</span>
                  <span className="fix">Fix: {f.fix}</span>
                </div>
              ))}
              <Button size="sm" className="w-full" onClick={exportTest}>
                Export {test?.file} ↓
              </Button>
            </>
          )}
        </aside>
      )}
      {note && (
        <div className={`lab-float lab-toast ${note.ok ? "info" : ""}`}>
          {note.text}
        </div>
      )}
    </div>
  );
}
