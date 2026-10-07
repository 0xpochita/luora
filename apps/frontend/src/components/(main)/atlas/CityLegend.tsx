import { ICON_PATH, type IconKey } from "@/features/atlas";

const SHAPES: [IconKey, string, string][] = [
  ["in", "Entry tower", "external / public function"],
  ["cylinder", "Storage tank", "state slot · 2×2 farm = mapping"],
  ["gear", "Logic unit", "internal helper"],
  ["lock", "Gate", "modifier / access check · wireframe = missing"],
  ["antenna", "Relay mast", "event"],
  ["plug", "Factory", "external contract / call (across the river)"],
];
const LINES: [string, string, string][] = [
  ["lamp ok", "Green lamp", "no finding on this piece"],
  ["lamp bad", "Red lamp", "finding on this piece"],
  ["lamp", "White lamp", "privileged (owner / keeper only)"],
  ["belt", "Belt", "entry → what it reads, writes, calls, emits"],
  ["power", "Power line", "role slot → entry gated on that role"],
  ["mark", "▲n marker", "n findings · filled HIGH · outline MED · grey LOW"],
];
const TOKEN: [string, string][] = [
  ["READ", "ring sweeps up the tank"],
  ["WRITE", "token pressed into the tank"],
  ["CALL", "token spins inside the factory"],
  ["EMIT", "ripple from the relay mast"],
  ["RED", "write after an external call (CEI)"],
];

/** Compact, collapsible key for the City: shapes, lamps, belts, power, the USDC token, red = finding. */
export function CityLegend() {
  return (
    <details className="clegend">
      <summary className="hud-label">Legend</summary>
      <div className="grid gap-2.5 p-3 pt-1">
        <ul>
          {SHAPES.map(([icon, name, what]) => (
            <li key={name}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={ICON_PATH[icon]} />
              </svg>
              <b>{name}</b>
              <span>{what}</span>
            </li>
          ))}
        </ul>
        <ul>
          {LINES.map(([cls, name, what]) => (
            <li key={name}>
              <i className={cls} />
              <b>{name}</b>
              <span>{what}</span>
            </li>
          ))}
        </ul>
        <ul>
          {TOKEN.map(([k, what]) => (
            <li key={k}>
              <i className={`token ${k === "RED" ? "bad" : ""}`} />
              <b>{k === "RED" ? "Red step" : `USDC · ${k}`}</b>
              <span>{what}</span>
            </li>
          ))}
        </ul>
        <p className="text-bad hud-label">Red always = finding</p>
      </div>
    </details>
  );
}
