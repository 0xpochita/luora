import { Chip, KV, Meter, Panel } from "@/components/ui";
import { type AtlasModel, LAYERS } from "@/features/atlas";

/** round so server and client render identical SVG attributes */
const r2 = (n: number) => Math.round(n * 100) / 100;

function Spark({ seed, color }: { seed: number; color: string }) {
  // deterministic sample curve — placeholder until per-layer test metrics exist
  const pts = Array.from(
    { length: 9 },
    (_, i) =>
      40 + Math.sin(i * 1.1 + seed) * 22 + Math.cos(i * 0.6 + seed * 2) * 12,
  );
  const W = 230;
  const H = 70;
  const x = (i: number) => r2(22 + (i * (W - 28)) / 8);
  const y = (v: number) => r2(H - 8 - v * 0.7);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H + 8}`} aria-hidden="true">
      <defs>
        <linearGradient id={`spark${seed}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".18" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[10, 32, 54].map((gy) => (
        <line
          key={gy}
          x1="22"
          x2={W}
          y1={gy}
          y2={gy}
          stroke="var(--line)"
          strokeDasharray="2 3"
        />
      ))}
      <path d={`${d}L${x(8)} ${H}L${x(0)} ${H}Z`} fill={`url(#spark${seed})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.2" />
      {[0, 2, 4, 6, 8].map((i) => (
        <text
          key={i}
          x={x(i)}
          y={H + 7}
          fontSize="9"
          fill="var(--dim)"
          textAnchor="middle"
        >
          t{i}
        </text>
      ))}
    </svg>
  );
}

function Gauge({ value }: { value: number }) {
  const A = (r: number, a: number): [number, number] => [
    r2(95 + r * Math.cos(a)),
    r2(100 + r * Math.sin(a)),
  ];
  const a0 = Math.PI * 0.8;
  const a1 = Math.PI * 2.2;
  const aV = a0 + (a1 - a0) * (value / 10);
  const arc = (r: number, from: number, to: number) => {
    const [x0, y0] = A(r, from);
    const [x1, y1] = A(r, to);
    return `M${x0} ${y0}A${r} ${r} 0 ${to - from > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
  };
  return (
    <svg
      viewBox="0 0 190 150"
      role="img"
      aria-label={`Risk score ${value.toFixed(1)} of 10`}
    >
      <path
        d={arc(70, a0, a1)}
        fill="none"
        stroke="var(--line)"
        strokeWidth="10"
        strokeDasharray="2 2"
      />
      <path
        d={arc(70, a0, aV)}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="10"
        strokeDasharray="2 2"
      />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const [x, y] = A(52, a0 + ((a1 - a0) * i) / 5);
        return (
          <text
            key={i}
            x={x}
            y={y + 3}
            fontSize="9"
            fill="var(--dim)"
            textAnchor="middle"
          >
            {i * 2}
          </text>
        );
      })}
      <text
        x="95"
        y="108"
        textAnchor="middle"
        fontSize="38"
        fontWeight="300"
        fill="var(--ink)"
        fontFamily="var(--font-geist-mono)"
      >
        {value.toFixed(1)}
      </text>
      <text
        x="95"
        y="128"
        textAnchor="middle"
        fontSize="11"
        fill="var(--muted)"
        letterSpacing="1.5"
      >
        RISK / 10
      </text>
    </svg>
  );
}

export function AtlasDashboard({
  model,
  origin,
}: {
  model: AtlasModel;
  origin: "local" | "sample";
}) {
  const { findings: FINDINGS, layerOf, pieces: PIECES, riskScore } = model;
  const mapped = PIECES.filter((p) => p.sys !== "vulns");
  return (
    <>
      <Panel
        label="Audit risk"
        aside={<Chip>{origin === "sample" ? "Sample" : "Static"}</Chip>}
      >
        <div className="grid grid-cols-[170px_1fr] items-center gap-3 p-3">
          <Gauge value={riskScore()} />
          <div>
            <KV k="Pieces mapped">{mapped.length}</KV>
            <KV k="Open findings">
              <span className="text-bad">{FINDINGS.length}</span>
            </KV>
            <KV k="Layers">{LAYERS.length}</KV>
          </div>
        </div>
      </Panel>
      <Panel label="Layers" aside="Calls per test · sample">
        {LAYERS.map((L, i) => {
          const n = mapped.filter((p) => layerOf(p) === L).length;
          const f = FINDINGS.filter((x) => layerOf(x) === L).length;
          return (
            <div
              key={L.key}
              className="grid grid-cols-[130px_1fr] items-center gap-3 border-line border-b px-3 py-2.5 last:border-b-0"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2" style={{ background: L.color }} />
                  <span className="text-muted hud-label">{L.name}</span>
                </div>
                <b className="mt-1 block font-light font-mono text-[22px]">
                  {String(n).padStart(2, "0")}
                </b>
                <Meter value={n / mapped.length} className="w-full" />
                <span
                  className={`mt-1.5 block hud-label ${f ? "text-bad" : "text-dim"}`}
                >
                  {f ? `▲ ${f} finding${f > 1 ? "s" : ""}` : "Clear"}
                </span>
              </div>
              <Spark seed={i + 1} color={L.color} />
            </div>
          );
        })}
      </Panel>
    </>
  );
}
