/**
 * R13 (ZERO by Freede, user ref): a full-bleed closing scene where a curved horizon at the bottom
 * glows from behind, with hairlines and '+' markers framing the headline.
 * R14 (SurveilTrack 'Unit map', user ref): the horizon is a dark city. Graphite blocks, sparse lit
 * windows, square map markers. Drawn as one deterministic SVG, so it is identical on every render.
 */

const W = 1600;
const H = 760;
const CX = W / 2;
/** horizon: a shallow planet-like arc, highest in the middle */
const horizon = (x: number) => 430 + ((x - CX) / CX) ** 2 * 130;
/** only the city band is drawn; the copy above sits on plain black */
const TOP = 230;
const r1 = (n: number) => Math.round(n * 10) / 10;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Bld = { x: number; w: number; y: number; h: number; mast: boolean };

/** One skyline layer standing on the arc; `lift` raises it (far layer), `scale` sets height. */
function skyline(seed: number, scale: number, lift: number, minW: number) {
  const rand = rng(seed);
  const out: Bld[] = [];
  let x = -20;
  while (x < W + 20) {
    const w = minW + rand() * minW * 2.2;
    const near = 1 - Math.min(1, Math.abs(x + w / 2 - CX) / CX); // downtown in the middle
    const h = (14 + rand() * 34 + near ** 1.6 * 120 * rand()) * scale;
    const ground = horizon(x + w / 2) - lift;
    out.push({ x, w, y: ground - h, h, mast: near > 0.55 && rand() > 0.72 });
    x += w + 1.5 + rand() * 3;
  }
  return out;
}

const FAR = skyline(11, 0.7, 26, 10);
const NEAR = skyline(7, 1, 0, 14);
/** lit windows: a few per near building, more downtown */
const WINDOWS = (() => {
  const rand = rng(3);
  const out: { x: number; y: number; o: number }[] = [];
  for (const b of NEAR) {
    const n = Math.floor((b.h / 40) * rand() * 2);
    for (let i = 0; i < n; i++)
      out.push({
        x: r1(b.x + 3 + rand() * (b.w - 6)),
        y: r1(b.y + 6 + rand() * Math.max(4, b.h - 12)),
        o: 0.25 + rand() * 0.5,
      });
  }
  return out;
})();
/** SurveilTrack-style square markers on a few rooftops */
const MARKERS = [0.33, 0.47, 0.61, 0.74].map((f) => {
  const b = NEAR.reduce((best, c) =>
    Math.abs(c.x - W * f) < Math.abs(best.x - W * f) ? c : best,
  );
  return { x: r1(b.x + b.w / 2), y: r1(b.y - 26) };
});

const block = (b: Bld) => `M${r1(b.x)} ${r1(b.y)}h${r1(b.w)}V${H}H${r1(b.x)}Z`;
/** only the roof edge catches the rim light, brighter towards the centre */
const roof = (b: Bld) => `M${r1(b.x)} ${r1(b.y)}h${r1(b.w)}`;
const rimAlpha = (b: Bld) =>
  r1((0.12 + (1 - Math.abs(b.x + b.w / 2 - CX) / CX) * 0.5) * 100) / 100;

export function CityHorizon() {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 ${TOP} ${W} ${H - TOP}`}
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[clamp(420px,42vw,640px)] w-full"
    >
      <defs>
        <radialGradient id="lp-dawn" cx="50%" cy="34%" r="58%">
          <stop offset="0" stopColor="#eef0f5" stopOpacity=".5" />
          <stop offset=".22" stopColor="#b4b9c6" stopOpacity=".22" />
          <stop offset=".55" stopColor="#5b6070" stopOpacity=".06" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lp-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#09090b" />
          <stop offset="1" stopColor="#020203" />
        </linearGradient>
        <linearGradient id="lp-fadein" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="1" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* R13: dawn glow behind the curved horizon, so the skyline reads backlit */}
      <rect y={TOP} width={W} height={H - TOP} fill="url(#lp-dawn)" />
      <rect y={TOP} width={W} height="150" fill="url(#lp-fadein)" />

      {/* R14: far layer, then the near city with lit roofs and windows */}
      <g fill="#0b0b0d">
        {FAR.map((b) => (
          <path key={`f${b.x}`} d={block(b)} />
        ))}
      </g>
      <g fill="url(#lp-ground)">
        {NEAR.map((b) => (
          <path key={`n${b.x}`} d={block(b)} />
        ))}
      </g>
      <g strokeWidth="1">
        {NEAR.map((b) => (
          <path
            key={`r${b.x}`}
            d={roof(b)}
            stroke={`rgba(255,255,255,${rimAlpha(b)})`}
          />
        ))}
        {NEAR.filter((b) => b.mast).map((b) => (
          <path
            key={`m${b.x}`}
            d={`M${r1(b.x + b.w / 2)} ${r1(b.y)}v-18`}
            stroke="rgba(255,255,255,.35)"
          />
        ))}
      </g>
      <g fill="#fff">
        {WINDOWS.map((w) => (
          <rect
            key={`w${w.x},${w.y}`}
            x={w.x}
            y={w.y}
            width="1.6"
            height="1.6"
            opacity={w.o}
          />
        ))}
      </g>
      <g>
        {MARKERS.map((m) => (
          <g key={`k${m.x}`}>
            <path
              d={`M${m.x} ${m.y + 6}V${m.y + 26}`}
              stroke="rgba(255,255,255,.35)"
            />
            <rect
              x={m.x - 5}
              y={m.y - 5}
              width="10"
              height="10"
              fill="#000"
              stroke="#fff"
              strokeWidth="1"
            />
            <rect x={m.x - 2} y={m.y - 2} width="4" height="4" fill="#fff" />
          </g>
        ))}
      </g>
      {/* fade the city into the footer so its text stays readable */}
      <rect
        y={H - 220}
        width={W}
        height="220"
        fill="url(#lp-ground)"
        opacity=".85"
      />
    </svg>
  );
}
