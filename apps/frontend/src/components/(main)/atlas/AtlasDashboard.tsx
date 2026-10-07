import { FINDINGS, LAYERS, layerOf, PIECES, riskScore } from "@/features/atlas";

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
          <stop offset="0" stopColor={color} stopOpacity=".35" />
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
          stroke="#2a2e35"
          strokeDasharray="2 3"
        />
      ))}
      <path d={`${d}L${x(8)} ${H}L${x(0)} ${H}Z`} fill={`url(#spark${seed})`} />
      <path d={d} fill="none" stroke="#e7eaee" strokeWidth="1.6" />
      {[0, 2, 4, 6, 8].map((i) => (
        <text
          key={i}
          x={x(i)}
          y={H + 7}
          fontSize="9"
          fill="#5a6069"
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
      <defs>
        <linearGradient id="gauge" x1="0" x2="1">
          <stop offset="0" stopColor="#ff7a1a" stopOpacity=".25" />
          <stop offset="1" stopColor="#ffb02e" />
        </linearGradient>
      </defs>
      <path
        d={arc(70, a0, a1)}
        fill="none"
        stroke="#24282e"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d={arc(70, a0, aV)}
        fill="none"
        stroke="url(#gauge)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const [x, y] = A(52, a0 + ((a1 - a0) * i) / 5);
        return (
          <text
            key={i}
            x={x}
            y={y + 3}
            fontSize="9"
            fill="#5a6069"
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
        fill="#eef0f3"
      >
        {value.toFixed(1)}
      </text>
      <text x="95" y="128" textAnchor="middle" fontSize="11" fill="#8a9099">
        risk score / 10
      </text>
    </svg>
  );
}

export function AtlasDashboard() {
  return (
    <>
      <div className="box">
        <h3>
          Audit risk <small>SAMPLE</small>
        </h3>
        <div className="gauge">
          <Gauge value={riskScore()} />
          <div className="tot">
            <div>
              <span>Pieces mapped</span>
              <b>{PIECES.filter((p) => p.sys !== "vulns").length}</b>
            </div>
            <div>
              <span>Open findings</span>
              <b style={{ color: "var(--a-vulns)" }}>{FINDINGS.length}</b>
            </div>
          </div>
        </div>
      </div>
      <div className="box">
        <h3>
          Layers <small>CALLS PER TEST · SAMPLE</small>
        </h3>
        {LAYERS.map((L, i) => {
          const n = PIECES.filter(
            (p) => p.sys !== "vulns" && layerOf(p) === L,
          ).length;
          const f = FINDINGS.filter((x) => layerOf(x) === L).length;
          return (
            <div
              key={L.key}
              className="lcard"
              style={{ "--c": L.color } as React.CSSProperties}
            >
              <div className="k">
                <div className="hx" />
                <b>{n}</b>
                <span>{L.name} pieces</span>
                <em>{f ? `▲ ${f} finding${f > 1 ? "s" : ""}` : ""}</em>
              </div>
              <Spark seed={i + 1} color={L.color} />
            </div>
          );
        })}
      </div>
    </>
  );
}
