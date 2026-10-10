"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  Chevron,
  Dropdown,
  EASE,
  PH,
  PhIcon,
  SegmentedControl,
  Tabs,
} from "@/components/ui";
import type { Piece } from "@/features/atlas";
import {
  contractOf,
  type ExploreTarget,
  flowSequence,
  type Protocol,
  sourceLabel,
} from "@/features/explore";
import { useAiThread } from "../ai/AiChat";
import { AboutPanel } from "./AboutPanel";
import { Architecture } from "./Architecture";
import { ContractLab } from "./ContractLab";
import { ExploreAsk } from "./ExploreAsk";
import { ProtocolLogo } from "./ProtocolLogo";
import { SequenceDiagram } from "./SequenceDiagram";

/*
 * One protocol as a report (docs/ux/explore.md, report pass), the same frame as an Exploits case
 * so the two read alike:
 *  - PH Phalcon's page of stacked, titled sections, here Overview, Architecture, Flows, Contract,
 *    Checks and About; the switch in the header jumps to a section and follows the scroll (1–5)
 *  - C1 pin/590112357470554424: a summary row of stat cards, then the sections
 *  - Architecture: A1 pin/317574211247610337 and A2 pin/442126888432329740, the layers and one
 *    contract's tree (Architecture.tsx), replacing the map of every wire at once
 *  - Flows: the sequence diagram the Exploits use, each step's caller written in the spec
 *  - Ask AI and the selection's details stay in the side panel (Esc closes it)
 */

type SectionId = "overview" | "architecture" | "flows" | "contract" | "checks";
const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: PH.compass },
  { id: "architecture", label: "Architecture", icon: PH.mapTrifold },
  { id: "flows", label: "Flows", icon: PH.path },
  { id: "contract", label: "Contract", icon: PH.graph },
  { id: "checks", label: "Checks", icon: PH.check },
];
type Side = "about" | "ask" | null;

export function ProtocolWorkspace({ protocol: p }: { protocol: Protocol }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<SectionId>("overview");
  const [sel, setSel] = useState(p.contracts[0].name);
  const [flow, setFlow] = useState(p.flows[0].id);
  const [step, setStep] = useState(0);
  const [piece, setPiece] = useState<string | null>(null);
  const [side, setSide] = useState<Side>(null);
  const [focus, setFocus] = useState(0);
  const thread = useAiThread();
  const keys = useRef({ active, side, stepBy: (_: number) => {} });

  const f = p.flows.find((x) => x.id === flow) ?? p.flows[0];
  const seq = flowSequence(p, f);
  const c = contractOf(p, sel) ?? null;
  const lab = c ?? p.contracts[0];
  // what About and Ask AI are about: the step in Flows, else the selected contract, else the protocol
  const target: ExploreTarget =
    active === "flows"
      ? { kind: "flow", flow: f.id, step }
      : active === "architecture" || active === "contract"
        ? { kind: "contract", name: lab.name }
        : { kind: "protocol" };
  const labPiece = piece
    ? ((lab.atlas.pieces.find((x) => x.id === piece) as Piece | undefined) ??
      null)
    : null;

  const go = (id: SectionId, smooth = true) => {
    setActive(id);
    document.getElementById(`p-${id}`)?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "start",
    });
  };

  // the switch follows the section in view
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (top) setActive(top.target.id.slice(2) as SectionId);
      },
      { root, rootMargin: "0px 0px -65% 0px" },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(`p-${s.id}`);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  // the contract, flow and step live in the URL (?contract=Pool, ?flow=borrow&step=3); the old
  // ?view= links open the matching section
  // biome-ignore lint/correctness/useExhaustiveDependencies: read once per protocol
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const fl = p.flows.find((x) => x.id === q.get("flow"));
    if (fl) setFlow(fl.id);
    const st = Number(q.get("step"));
    if (fl && st >= 1 && st <= fl.steps.length) setStep(st - 1);
    const ct = q.get("contract");
    if (ct && (contractOf(p, ct) || p.externals.some((x) => x.name === ct)))
      setSel(ct);
    const v = q.get("view");
    const to: SectionId | null =
      v === "flows" || fl
        ? "flows"
        : v === "contract"
          ? "contract"
          : v === "map" || ct
            ? "architecture"
            : null;
    // a link straight to a section: jump once the sections have their height
    if (to) setTimeout(() => go(to, false), 80);
  }, [p]);
  useEffect(() => {
    const url = new URL(location.href);
    url.search = "";
    if (sel !== p.contracts[0].name) url.searchParams.set("contract", sel);
    if (flow !== p.flows[0].id || step > 0) {
      url.searchParams.set("flow", flow);
      url.searchParams.set("step", String(step + 1));
    }
    history.replaceState(history.state, "", url);
  }, [sel, flow, step, p]);

  const stepBy = (d: number) =>
    setStep((s) => Math.min(f.steps.length - 1, Math.max(0, s + d)));
  keys.current = { active, side, stepBy };

  // registered once: it reads the current state through `keys`, and `go` only scrolls
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
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
        else setPiece(null);
        return;
      }
      if (k.active === "flows") {
        if (e.key === "ArrowRight" || e.key === "j") return k.stepBy(1);
        if (e.key === "ArrowLeft" || e.key === "k") return k.stepBy(-1);
      }
      const s = SECTIONS[Number(e.key) - 1];
      if (s) go(s.id);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  /** a question's label or a contract named in an answer: select that again */
  const goTo = (t: ExploreTarget) => {
    if (t.kind === "flow") {
      setFlow(t.flow);
      setStep(t.step ?? 0);
      go("flows");
    } else if (t.kind === "contract") {
      setSel(t.name);
      go("architecture");
    } else go("overview");
  };
  const libraries = p.contracts.filter((x) => x.kind === "library").length;
  const excerpts = p.contracts.filter((x) => x.excerpts).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* a row of its own under the app's nav, not pressed against it */}
      <header className="flex flex-none items-center gap-3 px-3 pt-2.5 pb-3">
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
          value={active}
          onChange={go}
          options={SECTIONS.map((s, i) => ({
            value: s.id,
            label: s.label,
            title: `${s.label}  ${i + 1}`,
            icon: <PhIcon d={s.icon} className="size-[15px]" />,
          }))}
        />
        <span className="ml-auto hidden h-8 items-center gap-3 px-3 text-[12.5px] text-muted xl:inline-flex">
          <span>
            <span className="font-mono text-fg">{p.contracts.length}</span>{" "}
            contracts
          </span>
          <span>
            <span className="font-mono text-fg">{p.flows.length}</span> flows
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`size-1.5 rounded-full ${excerpts ? "bg-green" : "bg-dim"}`}
            />
            {sourceLabel({ contracts: p.contracts.length, excerpts })}
          </span>
        </span>
        <button
          type="button"
          className="hdr-pill sm"
          aria-pressed={side === "ask"}
          title="Ask your AI about the section in view"
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
        <div ref={scroller} className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-3 pb-24">
            <Section id="overview" icon={PH.compass} title="Overview">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat
                  label="Contracts"
                  value={p.contracts.length}
                  sub={`${p.contracts.length - libraries} contracts · ${libraries} libraries · ${p.externals.length} outside`}
                />
                <Stat
                  label="Flows"
                  value={p.flows.length}
                  sub={p.flows.map((x) => x.title).join(" · ")}
                />
                <Stat
                  label="Source"
                  value={`${excerpts}/${p.contracts.length}`}
                  sub={`${sourceLabel({ contracts: p.contracts.length, excerpts })} · ${[...new Set(p.repos.map((r) => r.license))].join(", ")}`}
                />
                <Stat
                  label="Pinned"
                  value={p.repos[0]?.tag ?? "–"}
                  sub={`${p.repos.length} ${p.repos.length === 1 ? "repo" : "repos"} · commit ${p.repos[0]?.commit.slice(0, 7) ?? ""}`}
                  mono
                />
              </div>
              <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
                <div>
                  <h3 className="text-[12.5px] text-muted">What it is</h3>
                  <p className="mt-1.5 text-[14px] text-fg leading-relaxed">
                    {p.purpose}
                  </p>
                  <p className="mt-2 text-[13.5px] text-body leading-relaxed">
                    {p.about}
                  </p>
                  <p className="mt-3 flex flex-wrap gap-1.5">
                    {[p.category, p.chain].map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-border bg-raised px-2.5 py-0.5 text-[12px] text-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </p>
                </div>
                <div>
                  <h3 className="text-[12.5px] text-muted">Code, pinned</h3>
                  <ul className="mt-2 space-y-2">
                    {p.repos.map((r) => (
                      <li key={r.id}>
                        <a
                          href={`${r.url}/tree/${r.commit}`}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-center gap-3 rounded-inner border border-border bg-inner-grad px-3 py-2 transition-colors hover:border-border-strong"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] text-fg">
                              {r.url.replace("https://github.com/", "")}{" "}
                              <span className="text-muted">@ {r.tag}</span>
                            </span>
                            <span className="font-mono text-[11.5px] text-dim">
                              {r.commit.slice(0, 10)} · {r.license}
                            </span>
                          </span>
                          <Chevron className="-rotate-45 text-dim group-hover:text-fg" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Section>

            <Section
              id="architecture"
              icon={PH.mapTrifold}
              title="Architecture"
              meta="Pick a contract: what it reaches, what reaches it, who may call it"
            >
              <Architecture
                p={p}
                selected={sel}
                onSelect={(n) => {
                  setSel(n);
                  setPiece(null);
                }}
                onOpenLab={(n) => {
                  setSel(n);
                  setPiece(null);
                  go("contract");
                }}
              />
            </Section>

            <Section
              id="flows"
              icon={PH.path}
              title="Flows"
              meta={
                <>
                  Each business action, call by call ·{" "}
                  <span className="kbd">←</span> <span className="kbd">→</span>{" "}
                  step
                </>
              }
              flush
            >
              <div className="flex flex-wrap items-center gap-3 px-4 pt-3 pb-3">
                <Tabs
                  size="sm"
                  value={f.id}
                  onChange={(id) => {
                    setFlow(id);
                    setStep(0);
                  }}
                  options={p.flows.map((x) => ({
                    value: x.id,
                    label: x.title,
                    title: x.summary,
                  }))}
                />
                <p className="min-w-0 flex-1 text-[13px] text-muted">
                  {f.summary}
                </p>
              </div>
              <div className="border-border border-t">
                <SequenceDiagram
                  key={f.id}
                  parties={seq.parties}
                  steps={seq.steps}
                  selected={step}
                  onSelect={setStep}
                />
              </div>
              <div className="border-border border-t px-4 py-3.5">
                <h3 className="text-[12.5px] text-muted">
                  What an auditor checks in {f.title.toLowerCase()}
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {f.checks.map((x) => (
                    <li
                      key={x}
                      className="flex gap-2.5 text-[13.5px] text-body leading-normal"
                    >
                      <span className="mt-[7px] size-1.5 flex-none rounded-full bg-yellow" />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            </Section>

            <Section
              id="contract"
              icon={PH.graph}
              title="Contract"
              meta={
                <Dropdown
                  ariaLabel="Contract"
                  variant="pill"
                  value={lab.name}
                  onChange={(n) => {
                    setSel(n);
                    setPiece(null);
                  }}
                  options={p.contracts.map((x) => ({
                    value: x.name,
                    label: x.name,
                    text: x.name,
                    group: x.group,
                    title: x.role,
                  }))}
                />
              }
              flush
            >
              <div className="relative h-[640px]">
                <ContractLab
                  contract={lab}
                  selected={piece}
                  onSelect={(id) => {
                    setPiece(id);
                    if (id) setSide((s) => s ?? "about");
                  }}
                />
              </div>
            </Section>

            <Section id="checks" icon={PH.check} title="Checks">
              <Checklist
                groups={[
                  { title: `Across ${p.name}`, items: p.checks },
                  ...p.flows.map((x) => ({ title: x.title, items: x.checks })),
                ]}
              />
            </Section>

            <Section id="about" icon={PH.list} title="About this map">
              <p className="max-w-[860px] text-[13.5px] text-body leading-relaxed">
                {p.notes}
              </p>
              <p className="mt-2 font-mono text-[11.5px] text-dim">
                {p.generatedWith}
              </p>
            </Section>
          </div>
        </div>

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
                      {active === "flows" ? f.title : lab.name}
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
                        contract={c}
                        piece={labPiece}
                        onContract={(n) => {
                          if (contractOf(p, n)) setSel(n);
                        }}
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

function Section({
  id,
  icon,
  title,
  meta,
  flush,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  meta?: ReactNode;
  /** no inner padding: the content draws to the card's edges */
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={`p-${id}`}
      className="scroll-mt-2 overflow-hidden rounded-card border border-border bg-card-grad shadow-soft"
    >
      <header className="flex items-center gap-2.5 border-border border-b px-4 py-3">
        <PhIcon d={icon} className="size-[15px] text-muted" />
        <h2 className="font-medium text-[14px] text-fg">{title}</h2>
        {meta && (
          <span className="ml-auto flex min-w-0 items-center gap-1 truncate text-right text-[12px] text-dim">
            {meta}
          </span>
        )}
      </header>
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  mono,
}: {
  label: string;
  value: ReactNode;
  sub: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-inner border border-border bg-inner-grad px-3.5 py-3">
      <p className="text-[11.5px] text-dim">{label}</p>
      <p
        className={`mt-1 truncate text-fg leading-none ${mono ? "font-mono text-[18px]" : "font-mono text-[24px]"}`}
      >
        {value}
      </p>
      <p className="mt-2 line-clamp-2 text-[12px] text-muted" title={sub}>
        {sub}
      </p>
    </div>
  );
}

function Checklist({
  groups,
}: {
  groups: { title: string; items: string[] }[];
}) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <div>
      <p className="text-right font-mono text-[11.5px] text-dim">
        {done.size}/{total} checked
      </p>
      <div className="mt-1 grid gap-x-6 gap-y-4 lg:grid-cols-2">
        {groups.map((g) => (
          <section key={g.title}>
            <h3 className="px-2 text-[12.5px] text-muted">{g.title}</h3>
            <ul className="mt-1">
              {g.items.map((x) => {
                const k = `${g.title}:${x}`;
                return (
                  <li key={k}>
                    <label className="flex cursor-pointer gap-2.5 rounded-inner px-2 py-1.5 text-[13px] text-body leading-normal transition-colors hover:bg-raised">
                      <input
                        type="checkbox"
                        checked={done.has(k)}
                        onChange={() =>
                          setDone((d) => {
                            const n = new Set(d);
                            if (!n.delete(k)) n.add(k);
                            return n;
                          })
                        }
                        className="mt-1 size-3.5 flex-none accent-[#4ade80]"
                      />
                      <span
                        className={done.has(k) ? "text-muted line-through" : ""}
                      >
                        {x}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
