import { Instrument_Serif } from "next/font/google";
import type { ReactNode } from "react";
import { CountUp, Reveal } from "./motion";
import { sampleRun } from "./stats";

/** R5: one italic serif accent phrase, loaded for that phrase only. */
const serif = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
});

// ---------- R5: monochrome isometric wireframes, drawn from 3D boxes ----------
type P3 = [number, number, number];
const COS = Math.cos(Math.PI / 6);
const iso = ([x, y, z]: P3) =>
  `${((x - y) * COS).toFixed(1)},${((x + y) / 2 - z).toFixed(1)}`;
const poly = (pts: P3[]) => pts.map(iso).join(" ");

/** One box: right face, left face, top face (back faces are hidden, so draw order = depth). */
function Box({
  at: [x, y, z],
  size: [w, d, h],
  top = "#1d1d20",
  children,
}: {
  at: P3;
  size: P3;
  top?: string;
  children?: ReactNode;
}) {
  const t = z + h;
  return (
    <g stroke="rgba(255,255,255,.42)" strokeWidth="1" strokeLinejoin="round">
      <polygon
        fill="#0b0b0c"
        points={poly([
          [x + w, y, z],
          [x + w, y + d, z],
          [x + w, y + d, t],
          [x + w, y, t],
        ])}
      />
      <polygon
        fill="#111113"
        points={poly([
          [x, y + d, z],
          [x + w, y + d, z],
          [x + w, y + d, t],
          [x, y + d, t],
        ])}
      />
      <polygon
        fill={top}
        points={poly([
          [x, y, t],
          [x + w, y, t],
          [x + w, y + d, t],
          [x, y + d, t],
        ])}
      />
      {children}
    </g>
  );
}

/** Dots on a top face at height z; `lit` cells glow white (written slots, covered lines). */
function Dots({
  at: [x, y, z],
  n,
  step,
  lit,
}: {
  at: P3;
  n: number;
  step: number;
  lit: number[];
}) {
  return Array.from({ length: n * n }, (_, i) => {
    const [cx, cy] = iso([x + (i % n) * step, y + Math.floor(i / n) * step, z])
      .split(",")
      .map(Number);
    const on = lit.includes(i);
    return (
      <circle
        key={`${cx},${cy}`}
        cx={cx}
        cy={cy}
        r={on ? 1.8 : 1.1}
        fill={on ? "#fff" : "rgba(255,255,255,.28)"}
        stroke="none"
      />
    );
  });
}

/** Stacked plates = storage layout, one plate per slot group, written slots lit. */
function Plates() {
  return (
    <svg
      viewBox="-130 -112 260 252"
      className="h-full w-full"
      aria-hidden="true"
    >
      {[0, 40, 80].map((z, k) => (
        <Box key={z} at={[0, 0, z]} size={[120, 120, 12]}>
          {k === 2 && (
            <Dots
              at={[18, 18, z + 12]}
              n={6}
              step={17}
              lit={[7, 9, 14, 20, 27, 28]}
            />
          )}
        </Box>
      ))}
      <path
        d={`M${iso([0, 120, 12])}L${iso([0, 120, 40])}M${iso([120, 120, 12])}L${iso([120, 120, 40])}M${iso([120, 0, 12])}L${iso([120, 0, 40])}M${iso([0, 120, 52])}L${iso([0, 120, 80])}M${iso([120, 120, 52])}L${iso([120, 120, 80])}M${iso([120, 0, 52])}L${iso([120, 0, 80])}`}
        stroke="rgba(255,255,255,.22)"
        strokeDasharray="2 3"
      />
    </svg>
  );
}

/** Bars = coverage per function, rising, on a stepped base. */
function Bars() {
  return (
    <svg
      viewBox="-78 -118 260 252"
      className="h-full w-full"
      aria-hidden="true"
    >
      <Box at={[-10, -10, 0]} size={[190, 70, 6]} top="#141416" />
      {[
        [0, 46],
        [60, 92],
        [120, 150],
      ].map(([x, h]) => (
        <Box key={x} at={[x, 0, 6]} size={[50, 50, h]} />
      ))}
    </svg>
  );
}

/** Cube = the contract boundary, floating over its source plate, lit from below. */
function Cube() {
  const s = 70;
  const z0 = 92;
  const v: P3[] = [
    [0, 0, z0],
    [s, 0, z0],
    [s, s, z0],
    [0, s, z0],
    [0, 0, z0 + s],
    [s, 0, z0 + s],
    [s, s, z0 + s],
    [0, s, z0 + s],
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  return (
    <svg
      viewBox="-135 -178 270 286"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lp-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <Box at={[-25, -25, 0]} size={[120, 120, 12]}>
        <Dots at={[-10, -10, 12]} n={6} step={18} lit={[14, 15, 20, 21]} />
      </Box>
      <polygon
        fill="url(#lp-cone)"
        points={poly([
          [0, s, z0],
          [s, s, z0],
          [s, 0, z0],
          [95, -25, 12],
          [95, 95, 12],
          [-25, 95, 12],
        ])}
      />
      <polygon
        fill="rgba(255,255,255,.04)"
        points={poly([v[4], v[5], v[6], v[7]])}
      />
      <g stroke="rgba(255,255,255,.55)" fill="none">
        {edges.map(([a, b]) => (
          <path key={`${a}${b}`} d={`M${iso(v[a])}L${iso(v[b])}`} />
        ))}
      </g>
      {v.map((p) => {
        const [cx, cy] = iso(p).split(",").map(Number);
        return <circle key={p.join()} cx={cx} cy={cy} r="2.2" fill="#fff" />;
      })}
    </svg>
  );
}

const PILLARS = [
  {
    art: <Plates />,
    title: "Know what ran",
    text: "Every frame mapped to the source lines and storage slots it touched.",
  },
  {
    art: <Bars />,
    title: "Measure what is tested",
    text: "Coverage per function, so untested state changes come up first.",
  },
  {
    art: <Cube />,
    title: "Decide with evidence",
    text: "Each finding carries the detectors, lines and tests behind it.",
  },
];

/** R5: heading with one italic serif phrase, three cards with wireframe illustrations in one frame. */
export function Pillars() {
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
        <div className="grid gap-2 rounded-[24px] border border-white/[.07] p-2 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="flex flex-col rounded-card border border-white/[.06] bg-[#0c0c0d] bg-[radial-gradient(60%_50%_at_50%_42%,rgba(255,255,255,.07),transparent)] p-6"
            >
              <div className="mx-auto h-[280px] w-full max-w-[320px]">
                {p.art}
              </div>
              <h3 className="mt-6 font-medium text-[15px] text-fg">
                {p.title}
              </h3>
              <p className="mt-1.5 text-[13px] text-dim leading-relaxed">
                {p.text}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/**
 * R9 (Nrok: stats as cards, giant faint wordmark behind) + R10 (bento proof: two-tone heading card,
 * stat cards, chips card) + R4 (big number, tiny caption). Every value is read from the sample run.
 */
export async function Proof() {
  const { stats, tools, file } = await sampleRun();
  return (
    <section className="relative mx-auto max-w-[1240px] overflow-hidden px-4 pb-32 md:px-6">
      <p
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-6 select-none text-center font-medium text-[clamp(120px,26vw,360px)] text-white/[.025] leading-none tracking-[-0.06em]"
      >
        luora
      </p>
      <div className="relative grid grid-cols-2 gap-3 md:grid-cols-4">
        <Reveal className="col-span-2 md:row-span-2">
          <div className="dot-grid flex h-full min-h-[300px] flex-col justify-between rounded-[20px] border border-white/[.07] bg-[#0c0c0d] p-7">
            <h2 className="font-medium text-[clamp(30px,3.6vw,44px)] text-fg leading-[1.05] tracking-[-0.025em]">
              Measured, not claimed.
              <br />
              <span className="text-white/45">On the sample vault.</span>
            </h2>
            <p className="mt-10 max-w-[380px] text-[14px] text-muted leading-relaxed">
              One run of{" "}
              <span className="font-mono text-[13px] text-text">
                node luora-export.mjs
              </span>{" "}
              over{" "}
              <span className="font-mono text-[13px] text-text">{file}</span>.
              The page reads these numbers from that output when it is built.
            </p>
          </div>
        </Reveal>
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={(i % 2) * 0.08}>
            <div className="flex h-full min-h-[148px] flex-col justify-between rounded-[20px] border border-white/[.07] bg-[#0c0c0d] bg-[radial-gradient(120%_90%_at_100%_100%,rgba(255,255,255,.07),transparent_55%)] p-5 md:p-6">
              <p className="text-[clamp(34px,3.6vw,46px)] text-fg leading-none tracking-[-0.04em]">
                <CountUp value={s.value} />
              </p>
              <p className="mt-4 text-[13px] text-muted leading-snug">
                {s.label}
                <span className="block text-dim">on the sample vault</span>
              </p>
            </div>
          </Reveal>
        ))}
        <Reveal
          className={stats.length % 2 ? "md:col-span-1" : "md:col-span-2"}
        >
          <div className="flex h-full flex-col justify-between gap-6 rounded-[20px] border border-white/[.07] bg-[#0c0c0d] p-6">
            <ul className="flex flex-wrap gap-2">
              {tools.map((t) => (
                <li
                  key={t}
                  className="rounded-chip border border-white/[.08] px-2.5 py-1 font-mono text-[12px] text-body"
                >
                  {t}
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-dim">
              The toolchain behind these numbers.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
