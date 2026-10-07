import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Piece } from "../types";
import type { AtlasModel } from "../utils/model";
import { unitStatus } from "../utils/units";
import { factoryGeometry } from "./factory";

/**
 * Industrial-base look for the City, after the AIC plots in Arknights: Endfield:
 * pieces are machines on a walled plot, data moves on conveyor belts, access control is a power grid.
 *
 *   entry → intake machine (hopper on top)     storage → tank (mapping: 2×2 tank farm)
 *   logic → processor (stacked unit + vents)   access  → gate frame
 *   events → relay mast                         deps / calls → factory (outside the wall)
 *   belts: seq steps; one USDC token travels them in execution order (see create-city-scene)
 *   power lines: Protocol Core (the contract) → role slot (owner / keeper) → relay pylon →
 *                each entry gated on that role
 *   calls leave the plot only through the wall gates and cross the river on the bridges
 */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const STILL =
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Plot inside the pipeline wall (contract boundary); gates on the east side lead to the bridges. */
export const BASE = { x0: -24.4, x1: 5.2, z0: -18.2, z1: 12.8 };
const GATES_Z = [-6, 6];
const GATE_HALF = 1.3;
/** Protocol Core: free corner of the plot between the state district and the gates. */
const CORE = { x: 1.6, z: -11.4, top: 6.6 };

// ---- machine geometry -------------------------------------------------------

const ni = (g: THREE.BufferGeometry) => {
  const n = g.index ? g.toNonIndexed() : g;
  if (n !== g) g.dispose();
  n.clearGroups();
  return n;
};
const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) =>
  new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
const cyl = (
  r: number,
  h: number,
  x = 0,
  y = 0,
  z = 0,
  rBottom = r,
  seg = 16,
) => new THREE.CylinderGeometry(r, rBottom, h, seg).translate(x, y + h / 2, z);
function merged(parts: THREE.BufferGeometry[], h: number) {
  const flat = parts.map(ni);
  const g = mergeGeometries(flat) as THREE.BufferGeometry;
  for (const p of flat) p.dispose();
  return g.translate(0, -h / 2, 0); // centred like BoxGeometry(w, h, d)
}

/** Building geometry for a piece, centred like BoxGeometry(w, h, d); `h` is the full height. */
export function machineGeometry(
  p: Piece,
  w: number,
  h: number,
  d: number,
): THREE.BufferGeometry {
  const plinth = 0.18;
  switch (p.sys) {
    case "deps":
    case "calls":
      return factoryGeometry(w, h, d, p.sys === "deps" ? 2 : 1);
    case "entry": {
      const body = h - plinth - 0.7;
      return merged(
        [
          box(w, plinth, d),
          box(w * 0.86, body, d * 0.8, 0, plinth),
          cyl(w * 0.3, 0.7, -w * 0.12, plinth + body, 0, w * 0.16),
          box(w * 0.22, 0.3, d * 0.3, w * 0.28, plinth + body, 0),
        ],
        h,
      );
    }
    case "logic": {
      const lo = (h - plinth) * 0.55;
      const hi = h - plinth - lo;
      return merged(
        [
          box(w, plinth, d),
          box(w * 0.9, lo, d * 0.9, 0, plinth),
          box(w * 0.55, hi, d * 0.6, -w * 0.12, plinth + lo),
          cyl(0.12, hi * 0.7, w * 0.3, plinth + lo, -d * 0.22, 0.12, 8),
          cyl(0.12, hi * 0.7, w * 0.3, plinth + lo, d * 0.22, 0.12, 8),
        ],
        h,
      );
    }
    case "storage": {
      const parts: THREE.BufferGeometry[] = [box(w, plinth, d)];
      const tank = (r: number, x: number, z: number) => {
        const t = h - plinth - 0.12;
        parts.push(
          cyl(r, t, x, plinth, z),
          cyl(r * 1.08, 0.12, x, plinth + t, z),
          cyl(r * 0.45, 0.12, x, plinth + t, z),
        );
      };
      if (p.mapping)
        for (const [x, z] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ])
          tank(w * 0.2, (x * w) / 4.4, (z * d) / 4.4);
      else tank(Math.min(w, d) * 0.4, 0, 0);
      return merged(parts, h);
    }
    case "access": {
      const post = Math.min(0.3, d);
      return merged(
        [
          box(post, h, d, -w / 2 + post / 2),
          box(post, h, d, w / 2 - post / 2),
          box(w, h * 0.22, d * 0.8, 0, h * 0.78),
        ],
        h,
      );
    }
    case "events":
      return merged(
        [
          box(w, plinth, d),
          cyl(0.08, h - 0.5, 0, plinth, 0, 0.12, 8),
          box(0.4, 0.22, 0.4, 0, h - 0.5),
          cyl(0.32, 0.06, 0, h - 0.1, 0, 0.32, 16),
        ],
        h,
      );
    default:
      return new THREE.BoxGeometry(w, h, d);
  }
}

/** Status lamp on the machine's front (+z) face: green clear, red finding, white privileged. */
export function addStatusLamp(
  mesh: THREE.Mesh,
  model: AtlasModel,
  p: Piece,
  w: number,
  h: number,
  d: number,
) {
  if (p.ghost || p.sys === "access" || p.sys === "events") return;
  const st = unitStatus(model, p.id);
  const color =
    st === "finding" ? "#ff4545" : st === "privileged" ? "#ffffff" : "#3ddc84";
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(Math.min(0.5, w * 0.3), 0.12, 0.04),
    mat,
  );
  // fade with the machine when the city dims it around a selection
  lamp.onBeforeRender = () => {
    mat.opacity = (mesh.material as THREE.Material).opacity;
  };
  const front = { entry: 0.41, logic: 0.46, storage: 0.46 }[p.sys as string];
  const low = p.sys === "storage"; // tanks: lamp sits on the plinth
  lamp.position.set(0, -h / 2 + (low ? 0.24 : 0.45), d * (front ?? 0.51));
  mesh.add(lamp);
}

// ---- plot, belts, power -----------------------------------------------------

export type BaseNode = { pos: THREE.Vector3; top: number };
export type Base = {
  update: (t: number) => void;
  /** belt from an entry to a target, always oriented entry → target */
  leg: (
    entry: string,
    target: string,
  ) => THREE.CurvePath<THREE.Vector3> | undefined;
};

/**
 * Adds the base around the inner districts: pipeline wall with gates, conveyor belts per
 * execution step, power lines for access control. Everything goes into one group in `scene`,
 * so the scene-wide dispose traversal frees it.
 */
export function addBase(
  scene: THREE.Scene,
  model: AtlasModel,
  nodes: Map<string, BaseNode>,
  lot: number,
): Base {
  const g = new THREE.Group();
  scene.add(g);
  const pipeMat = new THREE.MeshStandardMaterial({
    color: "#4a4e55",
    roughness: 0.6,
    metalness: 0.3,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: "#26282c",
    roughness: 0.9,
  });

  // pipeline wall: runs of pipe on low supports, joint rings, gate towers
  const R = 0.42;
  const pipe = (a: THREE.Vector3, b: THREE.Vector3) => {
    const len = a.distanceTo(b);
    if (len < 0.1) return;
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(R, R, len, 16),
      pipeMat,
    );
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
    g.add(m);
    for (let s = 0; s <= len; s += 4) {
      const at = a.clone().lerp(b, s / len);
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(R * 1.18, R * 1.18, 0.22, 16),
        darkMat,
      );
      ring.position.copy(at);
      ring.quaternion.copy(m.quaternion);
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, at.y, 0.6),
        darkMat,
      );
      leg.position.set(at.x, at.y / 2, at.z);
      g.add(ring, leg);
    }
  };
  const y = 0.75;
  const { x0, x1, z0, z1 } = BASE;
  pipe(V(x0, y, z0), V(x1, y, z0));
  pipe(V(x0, y, z1), V(x1, y, z1));
  pipe(V(x0, y, z0), V(x0, y, z1));
  const east = [
    z0,
    ...GATES_Z.flatMap((z) => [z - GATE_HALF, z + GATE_HALF]),
    z1,
  ];
  for (let i = 0; i < east.length; i += 2)
    pipe(V(x1, y, east[i]), V(x1, y, east[i + 1]));
  for (const z of GATES_Z)
    for (const s of [-1, 1]) {
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 2.2, 0.9),
        pipeMat,
      );
      tower.position.set(x1, 1.1, z + s * (GATE_HALF + 0.2));
      g.add(tower);
    }

  // conveyor belts: one per (entry, target) along the street grid
  const beltMat = new THREE.MeshStandardMaterial({
    color: "#1f2124",
    roughness: 0.8,
  });
  const railMat = new THREE.LineBasicMaterial({ color: "#3a3e44" });
  const legs = new Map<string, THREE.CurvePath<THREE.Vector3>>();
  let lane = 0;
  const isExt = (id: string) =>
    model.byId[id]?.sys === "calls" || model.byId[id]?.sys === "deps";
  // west edge of the External Island: belts land there after the bridge
  const islandX =
    Math.min(
      ...[...nodes].filter(([id]) => isExt(id)).map(([, n]) => n.pos.x),
    ) -
    lot / 2;
  for (const [entry, steps] of Object.entries(model.seq)) {
    const from = nodes.get(entry);
    if (!from) continue;
    const targets = new Set(
      steps.map(([, id]) => id).filter((id) => id !== entry),
    );
    for (const id of targets) {
      const to = nodes.get(id);
      if (!to) continue;
      const off = ((lane++ % 5) - 2) * 0.16;
      const a = from.pos;
      const b = to.pos;
      const zs = a.z + lot / 2 + off;
      const xs = b.x + lot / 2 + off;
      const pts = [V(a.x, 0.06, a.z), V(a.x, 0.06, zs)];
      if (isExt(id)) {
        // inner lane along the wall → nearest gate → bridge → island edge road → street
        const gz = GATES_Z.reduce((best, z) =>
          Math.abs(z - b.z) < Math.abs(best - b.z) ? z : best,
        );
        const gx = x1 - 0.9 + off;
        const ex = islandX + off;
        const sz = b.z - lot / 2 + off;
        pts.push(
          V(gx, 0.06, zs),
          V(gx, 0.06, gz + off),
          V(ex, 0.06, gz + off),
          V(ex, 0.06, sz),
          V(xs, 0.06, sz),
        );
      } else pts.push(V(xs, 0.06, zs));
      pts.push(V(xs, 0.06, b.z), V(b.x, 0.06, b.z));
      const path = new THREE.CurvePath<THREE.Vector3>();
      for (let i = 0; i < pts.length - 1; i++) {
        const [p, q] = [pts[i], pts[i + 1]];
        const len = p.distanceTo(q);
        if (len < 0.01) continue;
        path.add(new THREE.LineCurve3(p, q));
        const flat = new THREE.Mesh(
          new THREE.BoxGeometry(
            Math.abs(q.x - p.x) + 0.26,
            0.05,
            Math.abs(q.z - p.z) + 0.26,
          ),
          beltMat,
        );
        flat.position.set((p.x + q.x) / 2, 0.035, (p.z + q.z) / 2);
        g.add(flat);
      }
      const rail = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(path.getPoints(4)),
        railMat,
      );
      rail.position.y = 0.04;
      g.add(rail);
      legs.set(`${entry}>${id}`, path);
    }
  }
  // Protocol Core: the contract itself, source of the power grid
  const coreGeo = merged(
    [
      cyl(2.3, 0.4, 0, 0, 0, 2.3, 6),
      cyl(1.15, 3, 0, 0.4, 0, 1.45, 8),
      cyl(1.7, 0.22, 0, 3.4, 0, 1.7, 8),
      cyl(0.9, 1, 0, 3.62, 0, 1.1, 8),
      cyl(0.08, 1.98, 0, 4.62, 0, 0.26, 8),
    ],
    CORE.top,
  );
  const core = new THREE.Mesh(
    coreGeo,
    new THREE.MeshStandardMaterial({
      color: "#3a3d42",
      roughness: 0.55,
      metalness: 0.35,
    }),
  );
  core.position.set(CORE.x, CORE.top / 2, CORE.z);
  const coreEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(coreGeo, 25),
    new THREE.LineBasicMaterial({ color: "#8a8f96" }),
  );
  coreEdges.position.copy(core.position);
  const coreLightMat = new THREE.MeshBasicMaterial({
    color: "#ffffff",
    transparent: true,
  });
  const coreLight = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.24),
    coreLightMat,
  );
  coreLight.position.set(CORE.x, CORE.top + 0.3, CORE.z);
  g.add(core, coreEdges, coreLight);
  const el = document.createElement("div");
  el.className = "cmark core show";
  const sq = document.createElement("i");
  const code = document.createElement("span");
  code.textContent = "CORE";
  const name = document.createElement("b");
  name.textContent = `${model.contract} · solc ${model.compiler}`;
  el.append(sq, code, name);
  const label = new CSS2DObject(el);
  label.position.set(CORE.x, CORE.top + 1.6, CORE.z);
  g.add(label);

  // power grid: core → role slot (owner / keeper) → relay pylon → each entry gated on that role
  const powerMat = new THREE.LineBasicMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.55,
  });
  const nodeMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const roles = new Set(
    model.entry
      .map((id) => model.byId[id]?.caller)
      .filter((c): c is string => !!c && c !== "anyone"),
  );
  for (const role of roles) {
    const slot = nodes.get(role);
    if (!slot) continue;
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          V(CORE.x, CORE.top - 1.2, CORE.z),
          V(slot.pos.x, slot.top, slot.pos.z),
        ]),
        powerMat,
      ),
    );
  }
  for (const id of model.entry) {
    const p = model.byId[id];
    const src = p?.caller && p.caller !== "anyone" ? nodes.get(p.caller) : null;
    const dst = nodes.get(id);
    if (!src || !dst) continue;
    const mid = src.pos.clone().lerp(dst.pos, 0.5);
    mid.x += lot / 2;
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.14, 5, 0.14), darkMat);
    mast.position.set(mid.x, 2.5, mid.z);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), darkMat);
    arm.position.set(mid.x, 4.8, mid.z);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.22, 0.22),
      nodeMat,
    );
    head.position.set(mid.x, 5.1, mid.z);
    g.add(mast, arm, head);
    g.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          V(src.pos.x, src.top, src.pos.z),
          head.position.clone(),
          V(dst.pos.x, dst.top, dst.pos.z),
        ]),
        powerMat,
      ),
    );
  }

  return {
    leg: (entry, target) => legs.get(`${entry}>${target}`),
    update: (t) => {
      if (STILL) return;
      coreLightMat.opacity = 0.45 + 0.55 * Math.max(0, Math.sin(t * 1.6)) ** 3;
      coreLight.rotation.y = t * 0.8;
    },
  };
}
