import type { GNode, Wire } from "@/features/atlas/utils/lab-graph";
import { portPos } from "@/features/atlas/utils/lab-graph";
import type { Frame } from "@/features/trace";
import type { PillarData } from "./stats";

/*
 * R22 (pin 774124931585644, Valley Engine): an exploded stack of slab plates floating apart over
 * dashed vertical guides; the active plate is lit (glowing top edge, gradient side) and lifts, the
 * rest stay wireframe; a dashed leader with a small square terminal runs from the lit plate out to
 * its annotation. R23 (pin 246501779599303620, Dante): rounded iso tiles with a white dot on each
 * corner of the top and vents on the side faces. R24 (pin 152207662382464793): every layer carries
 * its own texture, and the idle layers keep a short line out to a bullet label.
 *
 * Plate tops are drawn flat in "plane" units (0..S) and projected with one isometric matrix, so
 * every texture is plain rects made from the real sample run. Every computed coordinate is rounded
 * so the server and client markup match.
 */

export const STACK_W = 500;
export const STACK_H = 830;
const S = 190; // plate side, plane units
const T = 20; // plate thickness, px
const GAP = 170; // distance between plate tops
const CX = 220; // stack centre x
const Y0 = 70; // first plate top
const R = 16; // top corner radius, plane units
const ISO = "matrix(.866 .5 -.866 .5 0 0)";
const round = (n: number) => Math.round(n);
/** screen point of a plane point, relative to the plate's top vertex */
const at = (u: number, v: number) => [
  round(0.866 * (u - v)),
  round(0.5 * (u + v)),
];
/** silhouette extremes of the rounded top (left / right corner, front corner) */
const SIDE_X = round(0.866 * (S - 2 * R) + 1.2247 * R);
const FRONT_Y = round(S - R + Math.SQRT1_2 * R);
const MID_Y = round(S / 2);

export const plateTop = (i: number) => Y0 + i * GAP;
/** where the leader leaves the lit plate (screen units of the stack's viewBox) */
const leaderY = (i: number) => plateTop(i) + MID_Y + round(T / 2);

export type StackData = {
  ran: PillarData["ran"];
  frames: Frame[];
  lab: { nodes: GNode[]; wires: Wire[] } | null;
  findings: PillarData["findings"];
  fns: PillarData["fns"];
};

/**
 * Many small marks in one stroked path per colour / opacity / pen, instead of one element each:
 * `M x y h0` with a round cap is a dot as wide as the pen, a round-capped line a pill, and a 2×2
 * square stroked with a pen of 2 (round joins) a 4×4 cell with corners rounded by 1.
 */
type Mark = [color: string, opacity: number, pen: number, d: string];
function Ink({ marks }: { marks: Mark[] }) {
  const by = new Map<string, string>();
  for (const [c, o, w, d] of marks) {
    const k = `${c}|${o}|${w}`;
    by.set(k, (by.get(k) ?? "") + d);
  }
  return [...by].map(([k, d]) => {
    const [c, o, w] = k.split("|");
    return (
      <path
        key={k}
        d={d}
        fill="none"
        stroke={c}
        strokeOpacity={o}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  });
}
const RED = "var(--red)";
/** a dot at (x, y), as wide as its pen */
const dot = (x: number, y: number) => `M${x} ${y}h0`;
/** a pill of height h from (x, y), w wide */
const pill = (x: number, y: number, w: number, h: number) =>
  `M${x + h / 2} ${y + h / 2}h${Math.max(0, w - h)}`;

/** 01 Run: one row per forge test, a dot then one cell per decoded frame (red = reverted). */
function RunTexture({ ran }: { ran: StackData["ran"] }) {
  const marks: Mark[] = [];
  ran.slice(0, 7).forEach((row, i) => {
    const y = 32 + i * 19;
    const rev = row.includes("revert");
    marks.push([rev ? RED : "#fff", rev ? 1 : 0.85, 6, dot(32, y + 2)]);
    row.slice(0, 20).forEach((c, j) => {
      marks.push([
        c === "revert" ? RED : "#fff",
        c === "revert" ? 1 : c === "src" ? 0.6 : c === "ext" ? 0.32 : 0.16,
        2,
        `M${45 + j * 6} ${y + 1}h2v2h-2z`,
      ]);
    });
  });
  return <Ink marks={marks} />;
}

/** 02 Trace: decoded frame lines, indented by call depth, length from the call's name. */
function TraceTexture({ frames }: { frames: Frame[] }) {
  const top = Math.min(...frames.map((f) => f.d));
  const marks: Mark[] = [];
  frames.slice(0, 11).forEach((f, i) => {
    const x = 30 + (f.d - top) * 14;
    marks.push(["#fff", 0.5, 3.2, dot(x, 33 + i * 12)]);
    marks.push([
      f.ok ? "#fff" : RED,
      f.ok ? (f.kind === "EVENT" ? 0.25 : 0.55) : 1,
      3,
      pill(x + 6, 32 + i * 12, Math.min(160 - x - 6, 18 + f.fn.length * 5), 3),
    ]);
  });
  return <Ink marks={marks} />;
}

/** 03 Lab: the Lab widget's three cards scaled onto the plate, with its first wire. */
function LabTexture({ lab }: { lab: NonNullable<StackData["lab"]> }) {
  const minX = Math.min(...lab.nodes.map((n) => n.x));
  const minY = Math.min(...lab.nodes.map((n) => n.y));
  const W = Math.max(...lab.nodes.map((n) => n.x + n.w)) - minX;
  const k = 130 / W;
  const p = (x: number, y: number) => [
    round(30 + (x - minX) * k),
    round(34 + (y - minY) * k),
  ];
  const wire = lab.wires[0];
  const byId = new Map(lab.nodes.map((n) => [n.id, n]));
  const a = wire && byId.get(wire.from.node);
  const b = wire && byId.get(wire.to.node);
  let d = "";
  if (wire && a && b) {
    const [x1, y1] = (({ x, y }) => p(x, y))(portPos(a, wire.from.port, "out"));
    const [x2, y2] = (({ x, y }) => p(x, y))(portPos(b, wire.to.port, "in"));
    const m = round((x1 + x2) / 2);
    d = `M${x1} ${y1}C${m} ${y1} ${m} ${y2} ${x2} ${y2}`;
  }
  return (
    <>
      {lab.nodes.map((n) => {
        const [x, y] = p(n.x, n.y + 32);
        const [x2] = p(n.x + n.w, 0);
        const h = round((n.inputs.length + n.outputs.length + 2) * 7);
        return (
          <g key={n.id}>
            <rect
              x={x}
              y={y}
              width={x2 - x}
              height={h}
              rx="5"
              fill="#fff"
              fillOpacity="0.07"
              stroke="#fff"
              strokeOpacity="0.5"
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={x + 5}
              y={y + 5}
              width={round((x2 - x) * 0.45)}
              height="3"
              rx="1.5"
              fill="#fff"
              fillOpacity="0.6"
            />
          </g>
        );
      })}
      {d && (
        <path
          d={d}
          fill="none"
          stroke="#fff"
          strokeOpacity="0.8"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </>
  );
}

/** 04 Findings & coverage: one red dot per finding (high / med), a coverage bar per function. */
function FindingsTexture({
  findings,
  fns,
}: Pick<StackData, "findings" | "fns">) {
  const marks: Mark[] = [];
  findings.slice(0, 12).forEach((f, i) => {
    const bad = f === "high" || f === "med";
    marks.push([bad ? RED : "#fff", bad ? 1 : 0.35, 6.4, dot(32 + i * 11, 34)]);
  });
  fns.slice(0, 8).forEach((f, i) => {
    const y = 50 + i * 14;
    const w = round(128 * (f.lines[1] ? f.lines[0] / f.lines[1] : 0));
    marks.push(["#fff", 0.1, 4, pill(30, y, 128, 4)]);
    if (w) marks.push(["#fff", 0.6, 4, pill(30, y, w, 4)]);
  });
  return <Ink marks={marks} />;
}

function Plate({
  i,
  on,
  idle,
  children,
}: {
  i: number;
  /** the lit plate */
  on: boolean;
  /** nothing is lit (mobile): every plate drawn half-lit */
  idle: boolean;
  children: React.ReactNode;
}) {
  const lit = on || idle;
  const edge = on ? 0.85 : idle ? 0.3 : 0.16;
  const [lx, ly] = [-SIDE_X, MID_Y];
  const side = `M${lx} ${ly}L0 ${FRONT_Y}L${SIDE_X} ${ly}V${ly + T}L0 ${FRONT_Y + T}L${lx} ${ly + T}Z`;
  const vents = [
    ...[30, 36, 42, 48, 54, 60].map((u) => at(u, S)),
    ...[24, 30, 36, 42].map((v) => at(S, v)),
  ];
  return (
    <g transform={`translate(${CX} ${plateTop(i)})`}>
      <g className="lp-plate" data-on={on || undefined}>
        {/* side: the bottom outline, the swept faces, the two vertical silhouette edges */}
        <g transform={`translate(0 ${T})`}>
          <rect
            transform={ISO}
            width={S}
            height={S}
            rx={R}
            fill={on ? "url(#iso-side)" : "#0b0b0c"}
            stroke="#fff"
            strokeOpacity={edge * 0.6}
            vectorEffect="non-scaling-stroke"
          />
        </g>
        <path d={side} fill={on ? "url(#iso-side)" : "#0b0b0c"} />
        <path
          d={`M${lx} ${ly}v${T}M${SIDE_X} ${ly}v${T}M0 ${FRONT_Y}v${T}`}
          stroke="#fff"
          strokeOpacity={edge * 0.5}
        />
        <path
          stroke="#fff"
          strokeOpacity={lit ? 0.3 : 0.12}
          d={vents.map(([x, y]) => `M${x} ${y + 5}v${T - 9}`).join("")}
        />
        {/* lit top edge glow (R22) */}
        {on && (
          <rect
            transform={ISO}
            width={S}
            height={S}
            rx={R}
            fill="none"
            stroke="#fff"
            strokeWidth="6"
            strokeOpacity="0.5"
            filter="url(#iso-glow)"
          />
        )}
        <g transform={ISO}>
          <rect
            width={S}
            height={S}
            rx={R}
            fill={lit ? "url(#iso-top)" : "#0b0b0c"}
            stroke="#fff"
            strokeOpacity={edge}
            vectorEffect="non-scaling-stroke"
          />
          <rect
            x="16"
            y="16"
            width={S - 32}
            height={S - 32}
            rx="10"
            fill="none"
            stroke="#fff"
            strokeOpacity={lit ? 0.14 : 0.07}
            vectorEffect="non-scaling-stroke"
          />
          {/* R23: a dot on each corner of the top */}
          <Ink
            marks={[
              [9, 9],
              [S - 9, 9],
              [9, S - 9],
              [S - 9, S - 9],
            ].map(([u, v]) => ["#fff", lit ? 0.9 : 0.3, 4.8, dot(u, v)])}
          />
          <g opacity={on ? 1 : idle ? 0.75 : 0.28}>{children}</g>
        </g>
        {/* R22: dashed leader out of the lit plate, a small square terminal at the plate end */}
        {on && (
          <g
            className="lp-fadein"
            transform={`translate(0 ${MID_Y + round(T / 2)})`}
          >
            <rect
              x={SIDE_X + 8}
              y="-3"
              width="6"
              height="6"
              fill="#fff"
              fillOpacity="0.9"
            />
            <path
              d={`M${SIDE_X + 14} 0H${STACK_W - CX}`}
              stroke="#fff"
              strokeOpacity="0.55"
              strokeDasharray="4 4"
            />
          </g>
        )}
      </g>
    </g>
  );
}

/** The four-plate stack. `active` = lit plate, or -1 for none lit (mobile, shown once). */
export function IsoStack({
  data,
  active,
}: {
  data: StackData;
  active: number;
}) {
  const textures = [
    <RunTexture key="run" ran={data.ran} />,
    <TraceTexture key="trace" frames={data.frames} />,
    data.lab ? <LabTexture key="lab" lab={data.lab} /> : null,
    <FindingsTexture key="find" findings={data.findings} fns={data.fns} />,
  ];
  const guideX = [CX - SIDE_X + 6, CX, CX + SIDE_X - 6];
  return (
    <svg
      viewBox={`0 0 ${STACK_W} ${STACK_H}`}
      className="block h-full w-full overflow-visible"
      role="img"
      aria-label="Luora as four layers: run, trace, lab, findings and coverage"
    >
      <defs>
        <linearGradient id="iso-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--card-top)" />
          <stop offset="1" stopColor="var(--card-bot)" />
        </linearGradient>
        {/* R22's gradient side, monochrome: soft white fading into graphite */}
        <linearGradient id="iso-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.04" />
        </linearGradient>
        <filter id="iso-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      {/* R22: dashed vertical guides running through the gaps */}
      <g
        data-lp="guides"
        stroke="#fff"
        strokeOpacity="0.16"
        strokeDasharray="3 5"
        fill="none"
      >
        {guideX.map((x) => (
          <path
            key={x}
            d={`M${x} ${plateTop(0) + MID_Y}V${plateTop(3) + FRONT_Y}`}
          />
        ))}
      </g>
      {/* back to front so the nearer plate covers the guides of the one behind; each plate travels
          with its label (HowItWorks scrubs the data-lp="plate" groups apart and together) */}
      {textures.map((t, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: four fixed plates
        <g key={i} data-lp="plate">
          <Plate i={i} on={i === active} idle={active < 0}>
            {t}
          </Plate>
          {/* R24: idle plates keep a short line out to a bullet label */}
          {i === active || active < 0 ? null : (
            <g
              className="lp-fadein"
              transform={`translate(${CX + SIDE_X + 14} ${leaderY(i)})`}
            >
              <path d="M0 0h22" stroke="#fff" strokeOpacity="0.2" />
              <circle cx="30" r="2.5" fill="#fff" fillOpacity="0.4" />
              <text
                x="40"
                y="4"
                fill="var(--dim)"
                fontSize="12.5"
                fontFamily="var(--font-geist-mono)"
              >
                {`0${i + 1}`}
              </text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}
