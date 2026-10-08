import { Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";
import { Reveal } from "./motion";
import { type PillarData, pillarData } from "./stats";

/**
 * R12 (QClay, Pinterest 852728510751497559): tall flat dark panels on a lighter band, a bold mono
 * '+WORD+WORD' title, a tiny dot compass top-right with a red centre, a dot-matrix visual made of
 * small square pixels (grey / white, blue and red accents only), and two columns of mono key-values
 * at the bottom. Every pixel and every number below comes from the sample vault run.
 */

/** R5: one italic serif accent phrase in the heading, loaded for that phrase only. */
const serif = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
});

const RED = "#ef4444";
const BLUE = "#3b82f6";
const GREY = "rgba(255,255,255,.38)";
const FAINT = "rgba(255,255,255,.07)";
const W = 280;
const H = 210;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Tiny compass of five dots, centre red (R12 top-right). */
function Compass() {
  return (
    <svg viewBox="0 0 22 22" className="size-[22px]" aria-hidden="true">
      {[
        [11, 3],
        [3, 11],
        [19, 11],
        [11, 19],
      ].map(([x, y]) => (
        <rect
          key={`${x}${y}`}
          x={x - 1}
          y={y - 1}
          width="2"
          height="2"
          fill={GREY}
        />
      ))}
      <rect x="9.5" y="9.5" width="3" height="3" fill={RED} />
    </svg>
  );
}

/** Corner brackets around a reverted frame, like R12's target locks. */
function Lock({ x, y, s = 7 }: { x: number; y: number; s?: number }) {
  const d = `M${x - s} ${y - s + 3}V${y - s}H${x - s + 3}M${x + s - 3} ${y - s}H${x + s}V${y - s + 3}M${x + s} ${y + s - 3}V${y + s}H${x + s - 3}M${x - s + 3} ${y + s}H${x - s}V${y + s - 3}`;
  return <path d={d} stroke={RED} strokeWidth="1" fill="none" />;
}

/** +KNOW+WHAT+RAN: one row per forge test, one pixel per frame; reverts get target locks. */
function Ran({ d }: { d: PillarData }) {
  const cols = 22;
  const rows = d.ran.length;
  const gx = W / (cols + 1);
  const gy = Math.min(22, (H - 20) / Math.max(1, rows));
  const top = (H - gy * (rows - 1)) / 2;
  const cells: ReactNode[] = [];
  const locks: ReactNode[] = [];
  d.ran.forEach((row, r) => {
    for (let c = 0; c < cols; c++) {
      const x = r1(gx * (c + 1));
      const y = r1(top + gy * r);
      const k = row[c];
      const fill = !k
        ? FAINT
        : k === "revert"
          ? RED
          : k === "ext"
            ? BLUE
            : k === "src"
              ? "#fff"
              : GREY;
      const s = k ? 3 : 2;
      cells.push(
        <rect
          key={`${r}-${c}`}
          className={k ? "lp-px" : undefined}
          style={k ? { animationDelay: `${(r * cols + c) * 11}ms` } : undefined}
          x={x - s / 2}
          y={y - s / 2}
          width={s}
          height={s}
          fill={fill}
        />,
      );
      if (k === "revert") locks.push(<Lock key={`l${r}-${c}`} x={x} y={y} />);
    }
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden="true">
      {cells}
      {locks}
    </svg>
  );
}

/** +MEASURE+TESTED: a pixel column per function (grey = covered lines, red = missed, blue = branches
 *  taken) under a dashed line of how often the tests entered it. */
function Tested({ d }: { d: PillarData }) {
  const n = Math.max(1, d.fns.length);
  const px = 4;
  const gap = 2;
  const colW = 3;
  const slot = W / n;
  const base = H - 12;
  const maxCalls = Math.max(1, ...d.fns.map((f) => f.calls));
  const cells: ReactNode[] = [];
  const dash: ReactNode[] = [];
  d.fns.forEach((f, i) => {
    const x0 = slot * i + (slot - colW * (px + gap)) / 2;
    const stack: string[] = [
      ...Array(f.lines[0]).fill(GREY),
      ...Array(f.lines[1] - f.lines[0]).fill(RED),
      ...Array(f.branches[0]).fill(BLUE),
      ...Array(f.branches[1] - f.branches[0]).fill(RED),
    ];
    stack.forEach((fill, j) => {
      for (let c = 0; c < colW; c++)
        cells.push(
          <rect
            key={`${i}-${j}-${c}`}
            className="lp-px"
            style={{ animationDelay: `${(i * 6 + j) * 28}ms` }}
            x={r1(x0 + c * (px + gap))}
            y={r1(base - (j + 1) * (px + gap))}
            width={px}
            height={px}
            fill={fill}
          />,
        );
    });
    // dashed 'entered' line: log scale, drawn as short white dashes like R12's plot
    const y = r1(
      24 + (1 - Math.log10(f.calls + 1) / Math.log10(maxCalls + 1)) * 60,
    );
    dash.push(
      <rect
        key={`d-${f.name}`}
        x={r1(slot * i + slot / 2 - 5)}
        y={y}
        width="10"
        height="1.6"
        fill="#fff"
      />,
    );
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden="true">
      {dash}
      {cells}
    </svg>
  );
}

/** +DECIDE+EVIDENCE: findings as pixels on a tilted orbit around the contract (red = high,
 *  white = medium, blue = low / info), a red chord through the high ones. */
function Evidence({ d }: { d: PillarData }) {
  const cx = W / 2;
  const cy = H / 2;
  const a = 108;
  const b = 46;
  const tilt = -0.5;
  const at = (t: number): [number, number] => {
    const x = a * Math.cos(t);
    const y = b * Math.sin(t);
    return [
      r1(cx + x * Math.cos(tilt) - y * Math.sin(tilt)),
      r1(cy + x * Math.sin(tilt) + y * Math.cos(tilt)),
    ];
  };
  const ring = 64;
  const colour = { high: RED, med: "#fff", low: BLUE, info: BLUE } as const;
  const highs = d.findings.filter((f) => f === "high").length;
  const chord = Math.max(3, highs * 3);
  const [hx1, hy1] = at(Math.PI * 0.82);
  const [hx2, hy2] = at(Math.PI * 1.82);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden="true">
      <g className="lp-orbit" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {Array.from({ length: ring }, (_, i) => {
          const [x, y] = at((i / ring) * Math.PI * 2);
          return (
            <rect
              key={`r${x},${y}`}
              x={x - 1}
              y={y - 1}
              width="2"
              height="2"
              fill={FAINT}
            />
          );
        })}
        {d.findings.map((f, i) => {
          const [x, y] = at(
            Math.PI * 0.55 +
              (i / Math.max(1, d.findings.length)) * Math.PI * 1.6,
          );
          return (
            <rect
              key={`f${x},${y}`}
              className="lp-px"
              style={{ animationDelay: `${i * 60}ms` }}
              x={x - 2}
              y={y - 2}
              width="4"
              height="4"
              fill={colour[f]}
            />
          );
        })}
      </g>
      {Array.from({ length: chord }, (_, i) => {
        const t = (i + 0.5) / chord;
        const x = r1(hx1 + (hx2 - hx1) * t);
        const y = r1(hy1 + (hy2 - hy1) * t);
        return (
          <rect
            key={`c${x},${y}`}
            x={x - 1.5}
            y={y - 1.5}
            width="3"
            height="3"
            fill={RED}
            opacity=".85"
          />
        );
      })}
      <rect x={cx - 3} y={cy - 3} width="6" height="6" fill="#fff" />
    </svg>
  );
}

function Panel({
  title,
  art,
  left,
  right,
}: {
  title: string;
  art: ReactNode;
  left: string[];
  right: string[];
}) {
  return (
    <div className="flex min-h-[460px] flex-col bg-[#111113] p-6">
      <div className="flex items-start justify-between">
        <h3 className="font-bold font-mono text-[15px] text-fg tracking-[0.02em]">
          {title}
        </h3>
        <Compass />
      </div>
      <div className="my-auto h-[230px] w-full py-4">{art}</div>
      <div className="grid grid-cols-2 gap-x-4 font-mono text-[9.5px] text-white/30 uppercase leading-[1.9] tracking-[0.04em]">
        <div>
          {left.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
        <div className="text-right">
          {right.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** R5 heading + R12 panels: what ran, what is tested, what the findings rest on. */
export async function Pillars() {
  const d = await pillarData();
  const sev = (k: string) => d.findings.filter((f) => f === k).length;
  return (
    <section id="how" className="mx-auto max-w-[1240px] px-4 pb-32 md:px-6">
      <h2 className="font-medium text-[clamp(32px,4.4vw,54px)] text-fg leading-[1.04] tracking-[-0.03em]">
        Every claim in the report,
        <br />
        <span
          className={`${serif.className} font-normal text-white/60 tracking-[-0.01em]`}
        >
          — traced to a line.
        </span>
      </h2>
      <p className="mt-5 max-w-[460px] text-[16px] text-muted leading-relaxed">
        Luora keeps the run, the coverage and the findings on the same contract,
        so a note in your report points at code that actually executed.
      </p>
      <Reveal className="mt-14">
        <div className="grid gap-3 rounded-[20px] bg-[linear-gradient(180deg,#2a2b30,#1d1e22)] p-3 md:grid-cols-3 md:gap-4 md:p-5">
          <Panel
            title="+KNOW+WHAT+RAN"
            art={<Ran d={d} />}
            left={[
              `01: frames decoded: ${d.frames}`,
              `02: tests traced: ${d.tests}`,
              `03: reverts: ${d.reverts}`,
            ]}
            right={[
              `source map ++ ${d.mapped} frames`,
              `external ++ ${d.external} calls`,
              `contract: ${d.contract}`,
            ]}
          />
          <Panel
            title="+MEASURE+TESTED"
            art={<Tested d={d} />}
            left={[
              `01: lines: ${d.lines[0]}/${d.lines[1]}`,
              `02: branches: ${d.branches[0]}/${d.branches[1]}`,
              `03: functions: ${d.functions[0]}/${d.functions[1]}`,
            ]}
            right={[
              "source: forge coverage",
              d.untested.length
                ? `untested ++ ${d.untested.join(", ")}`
                : "untested ++ none",
              `focus: ${d.untested.length} entry`,
            ]}
          />
          <Panel
            title="+DECIDE+EVIDENCE"
            art={<Evidence d={d} />}
            left={[
              `01: findings: ${d.findings.length}`,
              `02: high ${sev("high")} · med ${sev("med")}`,
              `03: low ${sev("low")} · info ${sev("info")}`,
            ]}
            right={[
              `tools: ${d.analyzers.join("+") || "manual"}`,
              "dedupe ++ by line",
              "triage ++ report.md",
            ]}
          />
        </div>
      </Reveal>
    </section>
  );
}
