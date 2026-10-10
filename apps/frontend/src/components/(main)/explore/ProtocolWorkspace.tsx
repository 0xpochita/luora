"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Chevron,
  Dropdown,
  EASE,
  ENTER,
  PH,
  PhIcon,
  SegmentedControl,
} from "@/components/ui";
import type { Piece } from "@/features/atlas";
import {
  contractOf,
  type ExploreTarget,
  type Protocol,
  sourceLabel,
} from "@/features/explore";
import { useAiThread } from "../ai/AiChat";
import { AboutPanel } from "./AboutPanel";
import { ContractLab } from "./ContractLab";
import { ExploreAsk } from "./ExploreAsk";
import { FlowLanes } from "./FlowLanes";
import { ProtocolLogo } from "./ProtocolLogo";
import { ProtocolMap } from "./ProtocolMap";

/*
 * One protocol, minimal like the Atlas (docs/ux/explore.md; docs/ux/atlas.md minimal pass):
 *  - one switch, keys 1–3: Map (P2 / P1 / L2BEAT Disco), Flows (P4 lanes), Contract (the Atlas Lab)
 *  - the protocol in one quiet line of numbers that opens About; Ask AI next to it
 *  - no panels until asked: About opens on a selection or the numbers, Ask AI on its button;
 *    Esc closes (Figma UI3's properties panel, NN/g heuristic 8)
 */

type View = "map" | "flows" | "contract";
type Side = "about" | "ask" | null;
const VIEWS: { value: View; label: string; title: string; icon: string }[] = [
  {
    value: "map",
    label: "Map",
    title: "Contracts and how they connect  1",
    icon: PH.mapTrifold,
  },
  {
    value: "flows",
    label: "Flows",
    title: "Each business action step by step  2",
    icon: PH.path,
  },
  {
    value: "contract",
    label: "Contract",
    title: "One contract in the Lab  3",
    icon: PH.graph,
  },
];

export function ProtocolWorkspace({ protocol: p }: { protocol: Protocol }) {
  const [view, setView] = useState<View>("map");
  const [contract, setContract] = useState<string | null>(null);
  const [flow, setFlow] = useState(p.flows[0].id);
  const [step, setStep] = useState(0);
  const [piece, setPiece] = useState<string | null>(null);
  const [side, setSide] = useState<Side>(null);
  const [focus, setFocus] = useState(0);
  const thread = useAiThread();
  const keys = useRef({ view, side, setStepBy: (_: number) => {} });

  const c = contract ? (contractOf(p, contract) ?? null) : null;
  const f = p.flows.find((x) => x.id === flow) ?? p.flows[0];
  // what About and Ask AI are about: the step in Flows, else the selected contract, else the protocol
  const target: ExploreTarget =
    view === "flows"
      ? { kind: "flow", flow: f.id, step }
      : c
        ? { kind: "contract", name: c.name }
        : { kind: "protocol" };
  const lab = c ?? p.contracts[0];
  const labPiece =
    view === "contract" && piece
      ? ((lab.atlas.pieces.find((x) => x.id === piece) as Piece | undefined) ??
        null)
      : null;

  // the view, flow, step and contract live in the URL (?view=flows&flow=borrow&step=3)
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const v = q.get("view") as View | null;
    if (v && VIEWS.some((x) => x.value === v)) setView(v);
    const fl = p.flows.find((x) => x.id === q.get("flow"));
    if (fl) setFlow(fl.id);
    const st = Number(q.get("step"));
    if (fl && st >= 1 && st <= fl.steps.length) setStep(st - 1);
    const ct = q.get("contract");
    if (ct && contractOf(p, ct)) setContract(ct);
  }, [p]);
  useEffect(() => {
    const url = new URL(location.href);
    url.search = "";
    if (view !== "map") url.searchParams.set("view", view);
    if (view === "flows") {
      url.searchParams.set("flow", flow);
      url.searchParams.set("step", String(step + 1));
    } else if (contract) url.searchParams.set("contract", contract);
    history.replaceState(history.state, "", url);
  }, [view, flow, step, contract]);

  const pickContract = (name: string | null) => {
    setContract(name);
    setPiece(null);
    if (name) setSide((s) => s ?? "about");
  };
  const openContract = (name: string) => {
    pickContract(name);
    setView("contract");
  };
  /** a question's label or a contract named in an answer: select that again */
  const goTo = (t: ExploreTarget) => {
    if (t.kind === "flow") {
      setView("flows");
      setFlow(t.flow);
      setStep(t.step ?? 0);
    } else {
      if (view === "flows") setView("map");
      pickContract(t.kind === "contract" ? t.name : null);
    }
  };
  const stepBy = (d: number) =>
    setStep((s) => Math.min(f.steps.length - 1, Math.max(0, s + d)));
  keys.current = { view, side, setStepBy: stepBy };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (
        t instanceof Element &&
        t.closest("input, textarea, select, [contenteditable='true'], dialog")
      )
        return;
      const k = keys.current;
      if (e.key === "Escape") {
        if (k.side) setSide(null);
        else {
          setContract(null);
          setPiece(null);
        }
        return;
      }
      if (k.view === "flows") {
        if (e.key === "ArrowRight" || e.key === "j") return k.setStepBy(1);
        if (e.key === "ArrowLeft" || e.key === "k") return k.setStepBy(-1);
      }
      const n = Number(e.key);
      if (n >= 1 && n <= VIEWS.length) setView(VIEWS[n - 1].value);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-none items-center gap-3 px-3 pb-2">
        <Link href="/explore" className="hdr-pill sm" title="All protocols">
          <Chevron className="rotate-180" />
          Explore
        </Link>
        <span className="flex min-w-0 items-center gap-2">
          <ProtocolLogo name={p.name} logo={p.logo} size={28} />
          <span className="truncate font-medium text-[14px] text-fg">
            {p.name}
          </span>
          <span className="truncate text-[13px] text-muted">{p.version}</span>
        </span>
        <SegmentedControl
          size="md"
          value={view}
          onChange={setView}
          options={VIEWS.map((v) => ({
            value: v.value,
            label: v.label,
            title: v.title,
            icon: <PhIcon d={v.icon} className="size-[15px]" />,
          }))}
        />
        {view === "contract" && (
          <Dropdown
            ariaLabel="Contract"
            variant="pill"
            value={lab.name}
            onChange={(n) => pickContract(n)}
            options={p.contracts.map((x) => ({
              value: x.name,
              label: x.name,
              text: x.name,
              group: x.group,
              title: x.role,
            }))}
          />
        )}
        {/* the protocol's numbers as one quiet line; it opens About */}
        <button
          type="button"
          aria-pressed={side === "about"}
          title="What this protocol is, its pinned code and what to check"
          onClick={() => setSide((s) => (s === "about" ? null : "about"))}
          className="ml-auto inline-flex h-8 items-center gap-3 rounded-full px-3 text-[12.5px] text-muted transition-colors hover:bg-raised hover:text-fg aria-pressed:bg-raised"
        >
          <span>
            <span className="font-mono text-fg">{p.contracts.length}</span>{" "}
            contracts
          </span>
          <span>
            <span className="font-mono text-fg">{p.flows.length}</span> flows
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`size-1.5 rounded-full ${p.contracts.some((x) => x.excerpts) ? "bg-green" : "bg-dim"}`}
            />
            {sourceLabel({
              contracts: p.contracts.length,
              excerpts: p.contracts.filter((x) => x.excerpts).length,
            })}
          </span>
        </button>
        <button
          type="button"
          className="hdr-pill sm"
          aria-pressed={side === "ask"}
          title="Ask your AI about the selection"
          onClick={() => {
            setSide((s) => (s === "ask" ? null : "ask"));
            setFocus((n) => n + 1);
          }}
        >
          <PhIcon d={PH.sparkle} className="size-[15px]" />
          Ask AI
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <motion.section
          key={view}
          {...ENTER}
          className="relative min-w-0 flex-1 overflow-hidden"
        >
          {view === "map" ? (
            <ProtocolMap
              protocol={p}
              selected={contract}
              onSelect={pickContract}
              onOpen={openContract}
            />
          ) : view === "flows" ? (
            <FlowLanes
              protocol={p}
              flow={f.id}
              step={step}
              onFlow={(id) => {
                setFlow(id);
                setStep(0);
              }}
              onStep={setStep}
            />
          ) : (
            <ContractLab
              contract={lab}
              selected={piece}
              onSelect={(id) => {
                setPiece(id);
                if (!contract) setContract(lab.name);
                if (id) setSide((s) => s ?? "about");
              }}
            />
          )}
        </motion.section>

        <AnimatePresence initial={false}>
          {side && (
            <motion.div
              key="side"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 412, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: EASE }}
              className="flex flex-none overflow-hidden"
            >
              <aside className="flex w-[412px] flex-none flex-col pr-3 pb-3">
                <div className="flex min-h-0 flex-1 flex-col rounded-card border border-border bg-card-grad shadow-soft">
                  <div className="flex flex-none items-center gap-2 px-3 pt-3 pb-3">
                    <SegmentedControl
                      value={side}
                      onChange={(v) => setSide(v)}
                      options={[
                        { value: "about", label: "About" },
                        { value: "ask", label: "Ask AI" },
                      ]}
                    />
                    <span className="min-w-0 truncate text-[13px] text-muted">
                      {view === "flows" ? f.title : (c?.name ?? p.name)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSide(null)}
                      aria-label="Close the panel (Esc)"
                      className="ml-auto grid size-7 flex-none place-items-center rounded-tile text-muted hover:bg-hover hover:text-fg"
                    >
                      ✕
                    </button>
                  </div>
                  {side === "ask" ? (
                    <ExploreAsk
                      protocol={p}
                      target={target}
                      thread={thread}
                      focus={focus}
                      onTarget={goTo}
                    />
                  ) : (
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      <AboutPanel
                        protocol={p}
                        contract={view === "flows" ? null : c}
                        piece={labPiece}
                        onContract={(n) =>
                          pickContract(contractOf(p, n) ? n : null)
                        }
                      />
                    </div>
                  )}
                </div>
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
