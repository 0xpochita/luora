"use client";

import { ICON_PATH } from "@/features/atlas/utils/icons";
import {
  type GNode,
  KIND_META,
  nodeHeight,
  PORT_COLOR,
  type Port,
  portOf,
  portPos,
  type Wire,
  wirePath,
} from "@/features/atlas/utils/lab-graph";
import type { Status } from "@/features/atlas/utils/lab-scenario";
import type { LabDemo } from "./stats";
import "@/components/(main)/atlas/lab/lab.css";

/* LabGraph on its own: the Run sentence renders it in the first screens, the other widgets
   (FeatureWidgets.tsx) load later as their own chunk. */

const STATUS_LABEL = {
  pass: "Pass",
  revert: "Revert",
  fail: "Fail",
  unknown: "?",
} as const;

/**
 * The Lab canvas's card + wire markup (LabCanvas.tsx) without pan / zoom / editing, at 1:1 from the
 * graph's top-left. Used by the Lab widget and the hero's Lab close-up (the app's contractGraph).
 */
export function LabGraph({
  nodes,
  wires,
  runs = {},
  fields = {},
}: {
  nodes: GNode[];
  wires: Wire[];
  runs?: Partial<Record<string, { status: Status; head: string }>>;
  fields?: LabDemo["fields"];
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const left = Math.min(...nodes.map((n) => n.x));
  const top = Math.min(...nodes.map((n) => n.y));
  const wired = (n: string, p: string, side: "in" | "out") =>
    wires.some((w) =>
      side === "in"
        ? w.to.node === n && w.to.port === p
        : w.from.node === n && w.from.port === p,
    );
  const sock = (n: GNode, p: Port, side: "in" | "out") => (
    <i
      key={`${side}${p.id}`}
      className={`sock ${side} ${p.type} ${wired(n.id, p.id, side) ? "on" : ""}`}
      style={{ "--c": PORT_COLOR[p.type] } as React.CSSProperties}
      title={`${p.label} · ${p.type}`}
    />
  );
  return (
    <div
      className="absolute top-0 left-0"
      style={{ transform: `translate(${-left}px, ${-top}px)` }}
    >
      <svg aria-hidden="true" className="lab-wires">
        {wires.map((w) => {
          const a = byId.get(w.from.node);
          const b = byId.get(w.to.node);
          if (!a || !b) return null;
          const type = portOf(a, w.from.port, "out")?.type ?? "flow";
          return (
            <g
              key={`${w.from.node}${w.from.port}${w.to.node}${w.to.port}`}
              className={`wire ${type}`}
            >
              <path
                className="vis"
                d={wirePath(
                  portPos(a, w.from.port, "out"),
                  portPos(b, w.to.port, "in"),
                )}
              />
            </g>
          );
        })}
      </svg>
      {nodes.map((n) => {
        const r = runs[n.id];
        const rows = Math.max(n.inputs.length, n.outputs.length);
        return (
          <div
            key={n.id}
            className={`lab-card ${n.kind} ${n.inputs.length && n.outputs.length ? "" : "solo"} ${r ? `run-${r.status}` : ""}`}
            style={{
              left: n.x,
              top: n.y,
              width: n.w,
              height: nodeHeight(n),
            }}
          >
            <header className="!cursor-default">
              {n.flow &&
                sock(n, { id: "then", label: "then", type: "flow" }, "in")}
              <span className="kdot" />
              {n.logo && (
                <span
                  className="logo"
                  style={{ backgroundImage: `url(${n.logo})` }}
                />
              )}
              <b title={n.title}>{n.title}</b>
              {n.badges?.map((b) => (
                <span
                  key={b.label}
                  className={`badge ${b.tone}`}
                  title={b.title}
                >
                  <i />
                  {b.label}
                </span>
              ))}
              {r && (
                <span className={`badge st ${r.status}`} title={r.head}>
                  <i />
                  {STATUS_LABEL[r.status]}
                </span>
              )}
              {n.flow &&
                sock(n, { id: "then", label: "then", type: "flow" }, "out")}
            </header>
            <div className="lab-body">
              <div className="lab-inner">
                <div className="kind">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d={ICON_PATH[KIND_META[n.kind].icon]} />
                  </svg>
                  {KIND_META[n.kind].label}
                </div>
                {!!n.widgets && (
                  <div>
                    {fields[n.id]?.map((f) => (
                      <div className="w" key={f.label}>
                        <span>{f.label}</span>
                        {f.select ? (
                          <select
                            defaultValue={f.value}
                            tabIndex={-1}
                            aria-label={f.label}
                          >
                            <option>{f.value}</option>
                          </select>
                        ) : (
                          <input
                            defaultValue={f.value}
                            readOnly
                            tabIndex={-1}
                            aria-label={f.label}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {Array.from({ length: rows }, (_, i) => {
                  const pi = n.inputs[i];
                  const po = n.outputs[i];
                  return (
                    <div className="prow" key={`${pi?.id ?? ""}${po?.id ?? i}`}>
                      {pi && (
                        <span className="pin">
                          {sock(n, pi, "in")}
                          <em title={pi.label}>{pi.label}</em>
                        </span>
                      )}
                      {po && (
                        <span className="pout">
                          <em title={po.label}>{po.label}</em>
                          {sock(n, po, "out")}
                        </span>
                      )}
                    </div>
                  );
                })}
                {n.rows?.map((t) => (
                  <div className="trow" key={t} title={t}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
