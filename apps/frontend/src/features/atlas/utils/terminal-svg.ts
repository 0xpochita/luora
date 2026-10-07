import { BANKS, CALL_TARGET, ENTRY, INTERNAL, SEQ } from "../data/pieces";
import {
  byId,
  FINDINGS,
  gated,
  hasFinding,
  lateWrites,
  lineOf,
  neighbours,
} from "./model";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const spin = (cx: number, cy: number, dur: number, reverse = false) =>
  `<animateTransform attributeName="transform" type="rotate" from="${reverse ? 360 : 0} ${cx} ${cy}" to="${reverse ? 0 : 360} ${cx} ${cy}" dur="${dur}s" repeatCount="indefinite"/>`;

/**
 * HUD "Terminal I/O" diagram as an SVG string (internal data only, everything escaped).
 * Ports = entry points, teal band = internal logic, data banks = slots / externals / events,
 * wires carry animated packets in execution order for the selected entry point.
 */
export function buildTerminalSvg(sel: string | null): string {
  const cx = 330;
  const cy = 370;
  const TAU = Math.PI * 2;
  const pol = (r: number, a: number): [number, number] => [
    cx + r * Math.cos(a),
    cy + r * Math.sin(a),
  ];
  const near = sel ? neighbours(sel) : null;
  let s = "";

  s += `<rect x="262" y="58" width="9" height="14" fill="#2fd3f0"><animate attributeName="opacity" values="1;0;1" dur="1s" calcMode="discrete" repeatCount="indefinite"/></rect>`;
  s += `<text x="40" y="70" class="th">TERMINAL - LUORAVAULT</text><rect x="40" y="78" width="118" height="14" fill="#e9edf2"/><text x="46" y="89" class="tm" fill="#0a0b0d">CENTRAL VAULT</text>`;
  s += `<text x="560" y="64" class="tm">ENTRY ${ENTRY.length}   INTERNAL ${INTERNAL.length}   SLOTS 8   EXTERNAL ${BANKS[2].ids.length}   FINDINGS ${FINDINGS.length}</text>`;
  if (sel) {
    const p = byId[sel];
    s += `<text x="560" y="84" class="tm" fill="#2fd3f0">SELECTED  ${esc(p.name)}   L${lineOf(p.find) + 1}   ${p.caller ? `CALLER ${p.caller.toUpperCase()}` : ""}</text>`;
  }

  // rings
  s += `<g><circle cx="${cx}" cy="${cy}" r="300" class="dash"/>${spin(cx, cy, 120)}</g>`;
  s += `<g><circle cx="${cx}" cy="${cy}" r="272" class="dash2"/>${spin(cx, cy, 80, true)}</g><g>`;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU;
    const [x1, y1] = pol(292, a);
    const [x2, y2] = pol(i % 6 ? 297 : 286, a);
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#4a5058"/>`;
  }
  s += `${spin(cx, cy, 160)}</g><circle cx="${cx}" cy="${cy}" r="205" fill="none" stroke="#3a3f46"/>`;

  // teal band: internal logic
  INTERNAL.forEach((id, i) => {
    const a0 = (i / INTERNAL.length) * TAU + 0.04;
    const a1 = ((i + 1) / INTERNAL.length) * TAU - 0.04;
    const on = sel === id || near?.has(id);
    const [x0, y0] = pol(160, a0);
    const [x1, y1] = pol(160, a1);
    const [x2, y2] = pol(112, a1);
    const [x3, y3] = pol(112, a0);
    s += `<path class="seg ${on ? "on" : ""}" data-id="${id}" d="M${x0} ${y0}A160 160 0 0 1 ${x1} ${y1}L${x2} ${y2}A112 112 0 0 0 ${x3} ${y3}Z"/>`;
    const [lx, ly] = pol(136, (a0 + a1) / 2);
    s += `<text x="${lx}" y="${ly + 3}" class="tm seglab" text-anchor="middle">${esc(byId[id].name.replace("()", ""))}</text>`;
  });
  s += "<g>";
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * TAU;
    const [x1, y1] = pol(100, a);
    const [x2, y2] = pol(108, a);
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${i % 15 ? "#2c4f52" : "#2fd3f0"}" stroke-width=".8"/>`;
  }
  s += `${spin(cx, cy, 30, true)}</g>`;
  s += `<circle cx="${cx}" cy="${cy}" r="76" fill="none" stroke="#9aa0a8" stroke-width="14"/><circle cx="${cx}" cy="${cy}" r="62" fill="#050607"/>`;
  s += `<text x="${cx}" y="${cy - 2}" class="th" text-anchor="middle" style="font-size:12px">STATE</text><text x="${cx}" y="${cy + 14}" class="tm" text-anchor="middle">8 SLOTS</text>`;
  s += `<line x1="20" x2="${cx - 80}" y1="${cy}" y2="${cy}" stroke="#5a6069" stroke-dasharray="1 4"/>`;

  // data banks
  const rowPos: Record<string, [number, number]> = {};
  const bankX = [640, 760, 880, 1000];
  BANKS.forEach((b, bi) => {
    const x = bankX[bi];
    s += `<rect x="${x}" y="122" width="98" height="13" fill="#3a3f46"/><text x="${x + 4}" y="132" class="tm" fill="#e9edf2">${b.title}</text><text x="${x}" y="150" class="tm">${b.sub}</text>`;
    b.ids.forEach((id, ri) => {
      const y = 170 + ri * 26;
      rowPos[id] = [x, y + 8];
      const p = byId[id];
      const hot =
        !!sel &&
        (sel === id ||
          !!near?.has(id) ||
          (SEQ[sel] ?? []).some(([, t]) => t === id || CALL_TARGET[t] === id));
      const fill =
        hasFinding(id) && hot ? "#e2482f" : hot ? "#2fd3f0" : "#15181c";
      const label =
        (p.slot !== undefined ? `${p.slot} ` : "") +
        p.name.replace(/^slot \d+ · /, "");
      s += `<g class="row" data-id="${id}"><rect x="${x}" y="${y}" width="98" height="16" fill="${fill}" stroke="#5a6069"/><text x="${x + 4}" y="${y + 11.5}" class="tm" fill="${hot ? "#050607" : "#c9ced6"}">${esc(label)}</text></g>`;
    });
  });
  s += `<rect x="1110" y="122" width="62" height="13" fill="#e2482f"/><text x="1114" y="132" class="tm" fill="#050607">FINDINGS</text>`;
  FINDINGS.forEach((f, i) => {
    const y = 170 + i * 26;
    const hot = !!sel && (sel === f.id || (f.links ?? []).includes(sel));
    rowPos[f.id] = [1110, y + 8];
    s += `<g class="row" data-id="${f.id}"><rect x="1110" y="${y}" width="62" height="16" fill="${hot ? "#e2482f" : "#15181c"}" stroke="${hot ? "#e2482f" : "#5a6069"}"/><text x="1114" y="${y + 11.5}" class="tm" fill="${hot ? "#050607" : "#ff8f7a"}">${f.name.slice(0, 4)}</text></g>`;
  });

  // ports + wires + packets
  let wires = "";
  let packets = "";
  const flashes: {
    target: string;
    j: number;
    cyc: number;
    t1: number;
    t2: number;
    pc: string;
  }[] = [];
  ENTRY.forEach((id, i) => {
    const a =
      -Math.PI * 0.82 + i * ((Math.PI * 1.64) / (ENTRY.length - 1)) + Math.PI;
    const [px, py] = pol(232, a);
    const deg = (a * 180) / Math.PI + 90;
    const on = sel === id;
    const dot = hasFinding(id) ? "#e2482f" : gated(id) ? "#2fd3f0" : "#8a9099";
    const pulse = hasFinding(id)
      ? `<circle cx="20" cy="0" r="4.5" fill="none" stroke="#e2482f"><animate attributeName="r" values="4.5;13" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;0" dur="1.6s" repeatCount="indefinite"/></circle>`
      : "";
    s += `<g class="port" data-id="${id}" transform="translate(${px} ${py}) rotate(${deg})"><rect x="-30" y="-11" width="60" height="22" fill="${on ? "#2fd3f0" : "#3a3f46"}" stroke="#9aa0a8"/><rect x="-22" y="-4" width="34" height="8" fill="none" stroke="${on ? "#050607" : "#c9ced6"}"/><circle cx="20" cy="0" r="4.5" fill="${dot}"/>${pulse}</g>`;
    const [lx, ly] = pol(262, a);
    s += `<text x="${lx}" y="${ly + 3}" class="tm" text-anchor="middle" fill="${on ? "#2fd3f0" : "#8a9099"}">${esc(byId[id].name)}</text>`;
    const late = lateWrites(id);
    (SEQ[id] ?? []).forEach(([k, t], j) => {
      const target = k === "c" ? CALL_TARGET[t] : t;
      const end = rowPos[target];
      if (!end) return;
      const col = !sel
        ? "#3a3f46"
        : sel !== id
          ? "#1d2126"
          : late[j]
            ? "#e2482f"
            : k === "c"
              ? "#2fd3f0"
              : k === "w"
                ? "#e9edf2"
                : "#8a9099";
      const wid = `w-${id}-${j}`;
      wires += `<path id="${wid}" d="M${px} ${py}C${cx + 330} ${py} ${end[0] - 120} ${end[1]} ${end[0]} ${end[1]}" fill="none" stroke="${col}" stroke-width="${on ? 1.6 : 1}" class="flow ${on ? "fast" : ""}"/>`;
      if (on) {
        const n = (SEQ[id] ?? []).length;
        const cyc = n * 0.7 + 1.4;
        const t0 = (j * 0.7) / cyc;
        const t1 = (j * 0.7 + 1.2) / cyc;
        const t2 = Math.min(1, t1 + 0.06);
        const pc = late[j] ? "#e2482f" : k === "c" ? "#2fd3f0" : "#e9edf2";
        packets += `<circle r="4" fill="${pc}"><animateMotion dur="${cyc}s" repeatCount="indefinite" calcMode="linear" keyPoints="0;0;1;1" keyTimes="0;${t0};${t1};1"><mpath href="#${wid}"/></animateMotion><animate attributeName="opacity" dur="${cyc}s" repeatCount="indefinite" values="0;1;1;0;0" keyTimes="0;${t0};${t1};${t2};1"/></circle>`;
        flashes.push({ target, j, cyc, t1, t2, pc });
      } else if (!sel && j === 0) {
        packets += `<circle r="2.4" fill="#9aa0a8"><animateMotion dur="${5 + i}s" begin="-${i * 0.8}s" repeatCount="indefinite"><mpath href="#${wid}"/></animateMotion></circle>`;
      }
    });
  });
  s = wires + s + packets;
  for (const f of flashes) {
    const r = rowPos[f.target];
    if (!r) continue;
    const w = f.target.startsWith("f") ? 62 : 98;
    s += `<rect x="${r[0] - 2}" y="${r[1] - 10}" width="${w + 4}" height="20" fill="none" stroke="${f.pc}" stroke-width="2" opacity="0"><animate attributeName="opacity" dur="${f.cyc}s" repeatCount="indefinite" values="0;0;1;0;0" keyTimes="0;${f.t1};${f.t1 + 0.01};${Math.min(0.99, f.t2 + 0.08)};1"/></rect>`;
  }

  // execution-order timeline (CEI)
  const ty = 560;
  s += `<line y1="${ty - 8}" y2="${ty + ENTRY.length * 15 - 6}" stroke="#2fd3f0" stroke-width="1.5" opacity=".55"><animate attributeName="x1" values="640;1000;640" dur="6s" repeatCount="indefinite"/><animate attributeName="x2" values="640;1000;640" dur="6s" repeatCount="indefinite"/></line>`;
  if (sel)
    for (const f of flashes) {
      const y = ty + ENTRY.indexOf(sel) * 15;
      const x = 660 + f.j * 46;
      const kt = `0;${f.t1};${f.t1 + 0.01};${Math.min(0.99, f.t2 + 0.12)};1`;
      s += `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${f.pc}" stroke-width="1.5" opacity="0"><animate attributeName="opacity" dur="${f.cyc}s" repeatCount="indefinite" values="0;0;1;0;0" keyTimes="${kt}"/><animate attributeName="r" dur="${f.cyc}s" repeatCount="indefinite" values="5;5;5;11;11" keyTimes="${kt}"/></circle>`;
    }
  s += `<text x="640" y="${ty - 18}" class="tm" fill="#e9edf2">EXECUTION ORDER</text>`;
  const legend: [string, string, number][] = [
    [
      "read",
      `<circle cx="0" cy="-3" r="3.5" fill="#050607" stroke="#9aa0a8"/>`,
      0,
    ],
    ["call out", `<circle cx="0" cy="-3" r="3.5" fill="#2fd3f0"/>`, 52],
    [
      "write",
      `<rect x="-3.5" y="-6.5" width="7" height="7" fill="#e9edf2"/>`,
      124,
    ],
    [
      "write after call",
      `<rect x="-3.5" y="-6.5" width="7" height="7" fill="#e2482f"/>`,
      180,
    ],
    ["event", `<path d="M0 -7l4 4-4 4-4-4z" fill="#9fe7ff"/>`, 304],
  ];
  for (const [t, g, dx] of legend)
    s += `<g transform="translate(${760 + dx} ${ty - 15})">${g}<text x="8" y="0" class="tm">${t}</text></g>`;
  ENTRY.forEach((id, i) => {
    const y = ty + i * 15;
    const late = lateWrites(id);
    const on = sel === id;
    s += `<g class="row" data-id="${id}"><line x1="640" x2="1000" y1="${y}" y2="${y}" stroke="${on ? "#2fd3f0" : "#3a3f46"}"/>`;
    (SEQ[id] ?? []).forEach(([k], j) => {
      const x = 660 + j * 46;
      s +=
        k === "c"
          ? `<circle cx="${x}" cy="${y}" r="4" fill="#2fd3f0"/>`
          : k === "w"
            ? `<rect x="${x - 3.5}" y="${y - 3.5}" width="7" height="7" fill="${late[j] ? "#e2482f" : "#e9edf2"}"/>`
            : k === "e"
              ? `<path d="M${x} ${y - 4}l4 4-4 4-4-4z" fill="#9fe7ff"/>`
              : `<circle cx="${x}" cy="${y}" r="3.5" fill="#050607" stroke="#9aa0a8"/>`;
    });
    const cei = late.some(Boolean);
    s += `<text x="1010" y="${y + 3.5}" class="tm" fill="${cei ? "#ff8f7a" : on ? "#2fd3f0" : "#8a9099"}">${esc(byId[id].name)}${cei ? "  ⚠ CEI" : ""}</text></g>`;
  });
  return s;
}
