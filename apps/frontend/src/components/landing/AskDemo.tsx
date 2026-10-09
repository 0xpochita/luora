"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { AiQuestion, AtlasData, Piece } from "@/features/atlas/types";
import { aiAnswer, CHECKLIST } from "@/features/atlas/utils/ai";
import {
  type AtlasModel,
  createAtlasModel,
} from "@/features/atlas/utils/model";
import "./ask.css";

/**
 * Genie 'Prompts in. Magic out.' (geniestudio.app, studied 2026-10-09): a row of cards where the
 * centre one is larger, lifted and fully opaque while the sides shrink and fade toward the edges,
 * over one big rounded prompt box (prompt in large type, a meta line bottom-left, a round sparkle
 * button and a white '+ Create' pill bottom-right) that always shows the centre card's prompt.
 * Here every card is one piece of the sample contract (its lines, red ▲ on flagged lines), the
 * prompt is the question about it, the pills are the three questions and the answer opens in an
 * inner card below, built from the app's own aiAnswer / CHECKLIST / findings.
 * Motion: one rAF driver eases the row (transform + opacity only) and stops when it settles;
 * the question types in word by word, the answer rises block by block (ask.css). Click a side
 * card, drag / swipe, or ←/→ on the focused row; auto-advance pauses on hover, focus, off screen
 * and under reduced motion (where the row jumps instead of easing).
 */

const QUESTIONS: { q: AiQuestion; label: string }[] = [
  { q: "explain", label: "Explain" },
  { q: "risks", label: "What to check" },
  { q: "test", label: "Write a test" },
];
const KIND: Partial<Record<Piece["sys"], string>> = {
  entry: "Function",
  storage: "Storage slot",
  calls: "External call",
};
const SEV = { high: "High", med: "Medium", low: "Low", info: "Info" } as const;
const AUTO_MS = 5000;

function findingsOf(model: AtlasModel, p: Piece) {
  return p.sys === "vulns"
    ? [p]
    : model.findings.filter((f) => (f.links ?? []).includes(p.id));
}

function question(q: AiQuestion, name: string, line: number) {
  if (q === "explain") return `Explain ${name} on line ${line}.`;
  if (q === "risks") return `What should I check in ${name} on line ${line}?`;
  return `Write a Foundry test that pins ${name}.`;
}

type Card = {
  p: Piece;
  /** the line the question is about: the first flagged line of the piece, else its anchor */
  at: number;
  found: number;
  lines: { n: number; t: string; d: number }[];
};

/** Five entry points, the busiest storage slot and external call, in source order. */
function cardsOf(model: AtlasModel): Card[] {
  /** finding count per line (anchor + marked offsets) */
  const diag = new Map<number, number>();
  for (const f of model.findings)
    for (const o of f.mark ?? [0]) {
      const n = model.lineOf(f) + o;
      diag.set(n, (diag.get(n) ?? 0) + 1);
    }
  const score = (p: Piece) =>
    findingsOf(model, p).length * 100 + model.neighbours(p.id).size;
  const top = (sys: Piece["sys"], k: number) =>
    model.pieces
      .filter((p) => p.sys === sys)
      .sort((a, b) => score(b) - score(a))
      .slice(0, k);
  return [...top("entry", 5), ...top("storage", 1), ...top("calls", 1)]
    .sort((a, b) => model.lineOf(a) - model.lineOf(b))
    .map((p) => {
      const start = model.lineOf(p);
      const len = Math.max(1, p.n ?? 1);
      const at =
        Array.from({ length: len }, (_, i) => start + i).find(
          (n) => diag.has(n) && /[A-Za-z]/.test(model.lines[n] ?? ""),
        ) ?? start;
      const size = Math.min(Math.max(len, 3), 6);
      const from = Math.max(start, at - size + 2);
      const raw = model.lines.slice(from, from + size);
      const indent = Math.min(
        ...raw
          .filter((t) => t.trim())
          .map((t) => /^\s*/.exec(t)?.[0].length ?? 0),
      );
      return {
        p,
        at,
        found: findingsOf(model, p).length,
        lines: raw.map((t, i) => ({
          n: from + i,
          t: t.slice(indent),
          d: diag.get(from + i) ?? 0,
        })),
      };
    });
}

type Block =
  | { k: "h"; t: string }
  | { k: "p"; t: string }
  | { k: "li"; t: string }
  | { k: "c"; t: string }
  | { k: "f"; t: string; risk: Piece["risk"] }
  | { k: "code"; t: string };

/** The answer as blocks, built from the same data and text as the app's aiAnswer. */
function blocks(model: AtlasModel, p: Piece, q: AiQuestion): Block[] {
  const out: Block[] = [];
  if (q === "explain") {
    const [lead, ...rest] = aiAnswer(model, p, q)
      .split("\n\n")
      .filter((t) => t.trim());
    out.push({ k: "p", t: lead });
    for (const r of rest)
      if (r.startsWith("Connected to: ")) {
        out.push({ k: "h", t: "Connected to" });
        for (const c of r.slice(14).replace(/\.$/, "").split(", "))
          out.push({ k: "c", t: c });
      } else out.push({ k: "p", t: r });
  } else if (q === "risks") {
    out.push({ k: "h", t: "Checklist" });
    for (const c of CHECKLIST[p.sys]) out.push({ k: "li", t: c });
    const fs = findingsOf(model, p);
    out.push({
      k: "h",
      t: fs.length ? "Open findings here" : "No open findings here",
    });
    for (const f of fs.slice(0, 4))
      out.push({ k: "f", t: f.name.replace(/^F-\d+\s*/, ""), risk: f.risk });
  } else {
    const text = aiAnswer(model, p, q);
    const at = text.search(/\n(?=\/\/|function )/);
    out.push({ k: "p", t: at > 0 ? text.slice(0, at).trim() : text });
    if (at > 0) out.push({ k: "code", t: text.slice(at + 1) });
  }
  return out;
}

/** signed distance folded into [-n/2, n/2), so the row loops */
const wrap = (d: number, n: number) => (((d % n) + n + n / 2) % n) - n / 2;

/** a card `d` slots from the centre: shrinks, drops and fades with the distance */
function place(d: number, gap: number) {
  const a = Math.abs(d);
  return {
    transform: `translate3d(calc(-50% + ${(d * gap).toFixed(1)}px), ${(Math.min(a, 1) * 18).toFixed(1)}px, 0) scale(${(1 - 0.17 * Math.min(a, 2)).toFixed(3)})`,
    opacity: (a <= 1 ? 1 - 0.3 * a : Math.max(0, 0.7 - 0.35 * (a - 1))).toFixed(
      3,
    ),
    zIndex: String(10 - Math.round(a * 2)),
    visibility: a > 2.95 ? "hidden" : "visible",
  } as const;
}

export function AskDemo({ atlas }: { atlas: AtlasData }) {
  const model = createAtlasModel(atlas);
  const cards = cardsOf(model);
  const n = cards.length;
  const most = Math.max(...cards.map((c) => c.found));
  const first = Math.max(
    0,
    cards.findIndex((c) => c.found === most),
  );

  const [at, setAt] = useState(first);
  const [q, setQ] = useState<AiQuestion>("risks");
  /** the server HTML carries the centre card and its two neighbours, the rest mount right after */
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLElement>(null);
  const els = useRef<(HTMLButtonElement | null)[]>([]);
  const drive = useRef<{ go: (i: number) => void; step: (d: number) => void }>(
    null,
  );

  // the one driver: pos eases toward target on rAF, every card is placed from pos
  useEffect(() => {
    const el = root.current;
    const row = track.current;
    if (!live || !el || !row) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let pos = first;
    let target = first;
    let gap = 330;
    let raf = 0;
    let last = 0;
    let idle = 0;
    let seen = false;
    const paint = () => {
      els.current.forEach((c, i) => {
        if (c) Object.assign(c.style, place(wrap(i - pos, n), gap));
      });
    };
    const tick = (t: number) => {
      const dt = Math.min(64, t - (last || t - 16));
      last = t;
      pos += (target - pos) * (1 - Math.exp(-dt / 120));
      if (Math.abs(target - pos) < 0.001) {
        pos = target;
        raf = 0;
        last = 0;
      } else raf = requestAnimationFrame(tick);
      paint();
    };
    const go = (i: number) => {
      target = Math.round(target + wrap(i - target, n));
      idle = performance.now();
      setAt(((target % n) + n) % n);
      if (reduce.matches) {
        pos = target;
        paint();
      } else if (!raf) raf = requestAnimationFrame(tick);
    };
    drive.current = { go, step: (d) => go(Math.round(target) + d) };

    const measure = () => {
      // cards are sized in em off the viewport height (ask.css), the slot follows the card
      // on phones the neighbours peek in from both edges
      gap =
        (els.current.find(Boolean)?.offsetWidth ?? 314) *
        (row.clientWidth < 640 ? 0.9 : 1.05);
      paint();
    };
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
    });
    io.observe(el);

    // drag / swipe: past 6px the row follows the pointer, release snaps (a short flick moves one)
    let x0 = 0;
    let p0 = 0;
    let down = false;
    let drag = false;
    const onDown = (e: PointerEvent) => {
      down = true;
      drag = false;
      x0 = e.clientX;
      p0 = pos;
      if (e.pointerType === "mouse") e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - x0;
      if (!drag && Math.abs(dx) > 6) {
        drag = true;
        // throws when the pointer is already gone; the drag still follows the moves we get
        try {
          row.setPointerCapture(e.pointerId);
        } catch {}
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      }
      if (!drag) return;
      pos = target = p0 - dx / gap;
      paint();
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      if (!drag) return;
      const moved = pos - p0;
      go(
        Math.abs(moved) > 0.15 && Math.round(pos) === Math.round(p0)
          ? Math.round(p0) + Math.sign(moved)
          : Math.round(pos),
      );
    };
    // a drag ends in a click on the row: swallow it so no card gets picked by accident
    const onClick = (e: MouseEvent) => {
      if (!drag) return;
      drag = false;
      e.stopPropagation();
    };
    row.addEventListener("pointerdown", onDown);
    row.addEventListener("pointermove", onMove);
    row.addEventListener("pointerup", onUp);
    row.addEventListener("pointercancel", onUp);
    row.addEventListener("click", onClick, true);

    const auto = window.setInterval(() => {
      if (
        reduce.matches ||
        !seen ||
        down ||
        document.hidden ||
        el.matches(":hover, :focus-within") ||
        performance.now() - idle < AUTO_MS - 500
      )
        return;
      go(Math.round(target) + 1);
    }, AUTO_MS);

    measure();
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(auto);
      ro.disconnect();
      io.disconnect();
      row.removeEventListener("pointerdown", onDown);
      row.removeEventListener("pointermove", onMove);
      row.removeEventListener("pointerup", onUp);
      row.removeEventListener("pointercancel", onUp);
      row.removeEventListener("click", onClick, true);
      drive.current = null;
    };
  }, [first, n, live]);

  const card = cards[at];
  const line = card.at + 1;
  const text = question(q, card.p.name, line);
  const answer = blocks(model, card.p, q);
  /** where the second column starts: the second heading, or the test's code */
  const split = answer.findIndex(
    (b, i) => i > 0 && (b.k === "h" || b.k === "code"),
  );

  return (
    <div ref={root} className="relative flex h-full flex-col justify-center">
      {/* the row runs the full viewport width and fades out at both edges */}
      <section
        ref={track}
        aria-roledescription="carousel"
        aria-label="Pieces of the contract (use the arrow keys)"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the row itself takes ←/→
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          drive.current?.step(e.key === "ArrowLeft" ? -1 : 1);
        }}
        className="lp-ask-track relative mx-[calc(50%-50vw)] h-[21.5em] shrink-0 cursor-grab select-none rounded-card outline-none focus-visible:ring-1 focus-visible:ring-white/30 active:cursor-grabbing"
      >
        {cards.map((c, i) => {
          const on = i === at;
          if (!live && Math.abs(wrap(i - first, n)) > 1) return null;
          return (
            <button
              key={c.p.id}
              ref={(b) => {
                els.current[i] = b;
              }}
              type="button"
              tabIndex={-1}
              aria-hidden={!on}
              onClick={() => drive.current?.go(i)}
              style={place(wrap(i - first, n), 330)}
              className={`lp-ask-card absolute top-[1em] left-1/2 w-[24em] cursor-pointer rounded-card border bg-card-grad p-[0.65em] text-left transition-[border-color,box-shadow] duration-500 md:w-[28em] ${
                on
                  ? "border-border-strong shadow-[0_40px_80px_-24px_rgba(0,0,0,.85),0_16px_32px_-16px_rgba(0,0,0,.7)]"
                  : "border-border shadow-[0_28px_56px_-24px_rgba(0,0,0,.8)]"
              }`}
            >
              <span className="flex items-center gap-2 px-[0.65em] pt-[0.3em] pb-[0.8em]">
                <span className="size-1.5 shrink-0 rounded-full bg-white/70" />
                <span className="min-w-0 truncate font-mono text-[1.08em] text-fg">
                  {c.p.name}
                </span>
                {c.found > 0 && (
                  <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-chip bg-raised px-[0.65em] text-[1em] text-text leading-[1.8]">
                    <span className="size-1.5 rounded-full bg-red" />▲ {c.found}
                  </span>
                )}
              </span>
              <span className="block h-[12.5em] overflow-hidden rounded-inner border border-border bg-[#0b0b0d] py-[0.65em] font-mono text-[1em] leading-[1.85]">
                {c.lines.map((l) => (
                  <span
                    key={l.n}
                    className={`flex items-center gap-[1em] px-[1em] ${l.n === c.at ? "bg-white/[.04]" : ""}`}
                  >
                    <span className="w-[2em] shrink-0 text-right text-white/25">
                      {l.n + 1}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate whitespace-pre ${l.n === c.at ? "text-white/90" : "text-white/50"}`}
                    >
                      {l.t || " "}
                    </span>
                    {l.d > 0 && (
                      <span className="shrink-0 rounded-md bg-red/[.12] px-[0.5em] font-sans text-[0.875em] text-red leading-[1.6]">
                        ▲ {l.d}
                      </span>
                    )}
                  </span>
                ))}
              </span>
              <span className="flex items-center justify-between px-[0.65em] pt-[0.8em] pb-[0.3em] text-[1.04em] text-dim">
                <span>{KIND[c.p.sys]}</span>
                <span className="font-mono">L{c.at + 1}</span>
              </span>
            </button>
          );
        })}
      </section>

      {/* Genie's prompt box: the question in big type, meta bottom-left, actions bottom-right; it
          takes the height left under the row and the answer fills what it does not use */}
      <div className="relative mx-auto mt-[clamp(6px,1.6svh,24px)] flex min-h-0 w-full max-w-[920px] flex-1 flex-col rounded-card md:flex-initial border border-border bg-card-grad p-2 shadow-[0_48px_96px_-32px_rgba(0,0,0,.9),0_20px_40px_-20px_rgba(0,0,0,.7)]">
        <div className="shrink-0 px-3 pt-[clamp(6px,1.2svh,16px)] pb-1.5 md:px-4">
          <p
            key={`${at}:${q}`}
            aria-live="polite"
            className="text-[clamp(17px,min(2.4vw,2.9svh),28px)] text-fg leading-[1.25] tracking-[-0.02em]"
          >
            {text.split(" ").map((w, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: words of one fixed sentence
              <span key={i}>
                <span
                  className="lp-ask-in inline-block"
                  style={{ "--i": i } as CSSProperties}
                >
                  {w}
                </span>{" "}
              </span>
            ))}
          </p>
          <div className="mt-[clamp(6px,1.4svh,16px)] flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="hidden min-w-0 items-center gap-2 text-[13px] text-dim md:flex">
              <span
                className={`size-1.5 shrink-0 rounded-full ${card.found ? "bg-red" : "bg-white/40"}`}
              />
              <span className="truncate">
                L{line} · <span className="font-mono">{card.p.name}</span> ·{" "}
                {card.found} finding{card.found === 1 ? "" : "s"}
              </span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5 md:ml-auto">
              {QUESTIONS.map((x) =>
                x.q === q ? (
                  <button
                    key={x.q}
                    type="button"
                    aria-pressed="true"
                    className="flex h-[clamp(32px,4.4svh,40px)] cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-[14px] text-primary-fg"
                  >
                    <span aria-hidden="true">✦</span>
                    {x.label}
                  </button>
                ) : (
                  <button
                    key={x.q}
                    type="button"
                    aria-pressed="false"
                    onClick={() => setQ(x.q)}
                    className="h-[clamp(30px,4svh,36px)] cursor-pointer rounded-full bg-raised px-3.5 text-[13px] text-muted transition-colors hover:bg-hover hover:text-fg"
                  >
                    {x.label}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {/* the answer: an inner card 8px in, every block rendered at once, revealed by CSS. Wide
            screens split it in two columns at its second part (findings, connections, the test),
            so it fits the box; it scrolls only when the screen is too short for it */}
        <div
          key={`a:${at}:${q}`}
          className={`lp-scroll grid min-h-0 flex-1 content-start md:h-[clamp(200px,30svh,340px)] md:flex-initial gap-x-6 gap-y-2 overflow-y-auto rounded-inner border border-border bg-inner-grad p-2.5 text-[12px] text-body leading-normal md:text-[clamp(12px,1.55svh,13.5px)] md:p-[clamp(10px,1.6svh,16px)] md:leading-[1.55] ${split > 0 ? "md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]" : ""}`}
        >
          {[
            answer.slice(0, split > 0 ? split : undefined),
            split > 0 ? answer.slice(split) : [],
          ]
            .filter((col) => col.length)
            .map((col, c) => (
              <div
                key={col[0].t}
                className={
                  col.some((b) => b.k === "c")
                    ? "flex min-w-0 flex-wrap content-start gap-1.5"
                    : "min-w-0 space-y-1.5 md:space-y-2"
                }
              >
                {col.map((b, j) => {
                  const i = j + (c ? split : 0);
                  const key = `${i}:${b.t.slice(0, 24)}`;
                  const a = { style: { "--i": i + 4 } as CSSProperties };
                  if (b.k === "h")
                    return (
                      <p
                        key={key}
                        {...a}
                        className="lp-ask-in w-full pt-1 font-medium text-[12.5px] text-fg"
                      >
                        {b.t}
                      </p>
                    );
                  if (b.k === "li")
                    return (
                      <p
                        key={key}
                        {...a}
                        className="lp-ask-in flex gap-2 text-white/70"
                      >
                        <span className="mt-[0.7em] size-1 shrink-0 rounded-full bg-white/30" />
                        {b.t}
                      </p>
                    );
                  if (b.k === "c")
                    return (
                      <span
                        key={key}
                        {...a}
                        className="lp-ask-in inline-block rounded-full border border-white/[.06] bg-white/[.04] px-2.5 font-mono text-[0.9em] text-white/75 leading-[1.75]"
                      >
                        {b.t}
                      </span>
                    );
                  if (b.k === "f")
                    return (
                      <p
                        key={key}
                        {...a}
                        className="lp-ask-in flex items-start gap-2 rounded-lg border border-white/[.05] bg-white/[.03] px-2.5 py-1.5 text-white/80"
                      >
                        <span
                          className={`mt-[3px] shrink-0 rounded px-1.5 text-[10.5px] leading-[16px] ${b.risk === "high" || b.risk === "med" ? "bg-red/[.14] text-red" : "bg-white/[.08] text-muted"}`}
                        >
                          {SEV[b.risk ?? "low"]}
                        </span>
                        {b.t}
                      </p>
                    );
                  if (b.k === "code")
                    return (
                      <pre
                        key={key}
                        {...a}
                        className="lp-ask-in whitespace-pre-wrap break-words rounded-lg border border-white/[.06] bg-black/50 p-[clamp(8px,1.2svh,12px)] font-mono text-[10px] md:text-[clamp(10.5px,1.35svh,11.5px)] text-white/75 leading-[1.5]"
                      >
                        {b.t}
                      </pre>
                    );
                  return (
                    <p
                      key={key}
                      {...a}
                      className="lp-ask-in whitespace-pre-wrap break-words"
                    >
                      {b.t}
                    </p>
                  );
                })}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
