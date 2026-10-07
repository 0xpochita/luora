import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/addons/renderers/CSS2DRenderer.js";
import type { Piece, Step } from "../types";
import { ICON_PATH, type IconKey, iconOf } from "../utils/icons";
import type { AtlasModel } from "../utils/model";
import { unitCode } from "../utils/units";

export type CityZoom = "city" | "district" | "street";
/** Simulation frame: steps 0..step of `entry`'s sequence are drawn, `step` is current. */
export type CitySimFrame = {
  entry: string;
  steps: Step[];
  step: number;
  late: boolean[];
};
export type CityScene = {
  select: (id: string | null) => void;
  setSim: (sim: CitySimFrame | null) => void;
  setZoom: (z: CityZoom) => void;
  dispose: () => void;
};

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const LOT = 3.2; // lot pitch: building footprint + street
const SVG = "http://www.w3.org/2000/svg";
/** Monochrome inline-SVG glyph for a marker (stroke = currentColor). */
function iconEl(key: IconKey) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", ICON_PATH[key]);
  svg.append(path);
  return svg;
}
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

/** Districts on the XZ plane. `ext` is an island across the river. */
type DistrictKey = "entry" | "logic" | "state" | "ext";
const DISTRICTS: Record<
  DistrictKey,
  { x: number; z: number; cols: number; rows: number; name: string }
> = {
  entry: { x: -15.5, z: 3, cols: 4, rows: 4, name: "ENTRY DISTRICT" },
  logic: { x: -2, z: 3, cols: 3, rows: 4, name: "LOGIC QUARTER" },
  state: { x: -9, z: -11, cols: 5, rows: 3, name: "STATE · VAULT CORE" },
  ext: { x: 14, z: -3, cols: 3, rows: 5, name: "EXTERNAL ISLAND" },
};
const districtOf = (p: Piece): DistrictKey =>
  p.sys === "storage"
    ? "state"
    : p.sys === "logic"
      ? "logic"
      : p.sys === "deps" || p.sys === "calls"
        ? "ext"
        : "entry";

/** Small deterministic PRNG so filler buildings look the same on every render. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

type Bld = {
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  el?: HTMLDivElement;
  top: number;
  piece?: Piece;
};

/**
 * "City" view of a contract: every piece is a building in its district, height = how much it does.
 * Dark massing + light edges + square code markers, after the SurveilTrack map reference.
 */
export function createCityScene(
  stage: HTMLElement,
  model: AtlasModel,
  onPick: (id: string | null) => void,
): CityScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.style.display = "block";
  stage.prepend(renderer.domElement);
  const css2 = new CSS2DRenderer();
  Object.assign(css2.domElement.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "1",
  });
  stage.appendChild(css2.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#0b0c0e", 55, 110);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  const HOME = { pos: V(30, 46, 54), target: V(-3, 0, -4) };
  camera.position.copy(HOME.pos);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(HOME.target);
  controls.enableDamping = true;
  controls.maxPolarAngle = 1.25;
  controls.minDistance = 8;
  controls.maxDistance = 110;
  scene.add(new THREE.HemisphereLight("#c7ccd4", "#050607", 0.9));
  const sun = new THREE.DirectionalLight("#ffffff", 1.3);
  sun.position.set(-20, 40, 18);
  scene.add(sun);

  // ---- ground, river, streets ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshStandardMaterial({ color: "#131417", roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const river = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 160),
    new THREE.MeshStandardMaterial({
      color: "#08090a",
      roughness: 0.4,
      metalness: 0.2,
    }),
  );
  river.rotation.x = -Math.PI / 2;
  river.position.set(8.2, 0.01, 0);
  scene.add(river);
  const street = new THREE.LineBasicMaterial({ color: "#2e3136" });
  const avenue = new THREE.LineBasicMaterial({ color: "#5c6067" });
  const segs: number[] = [];
  const avs: number[] = [];
  for (let k = -60; k <= 60; k += LOT) {
    segs.push(k, 0.02, -60, k, 0.02, 60, -60, 0.02, k, 60, 0.02, k);
  }
  for (const d of Object.values(DISTRICTS)) {
    const w = d.cols * LOT;
    const h = d.rows * LOT;
    const x0 = d.x - w / 2 - 0.4;
    const z0 = d.z - h / 2 - 0.4;
    const x1 = x0 + w + 0.8;
    const z1 = z0 + h + 0.8;
    avs.push(
      x0,
      0.03,
      z0,
      x1,
      0.03,
      z0,
      x1,
      0.03,
      z0,
      x1,
      0.03,
      z1,
      x1,
      0.03,
      z1,
      x0,
      0.03,
      z1,
      x0,
      0.03,
      z1,
      x0,
      0.03,
      z0,
    );
  }
  avs.push(6, 0.03, -60, 6, 0.03, 60, 10.4, 0.03, -60, 10.4, 0.03, 60); // embankments
  for (const z of [-6, 6])
    avs.push(6, 0.05, z, 10.4, 0.05, z, 6, 0.05, z + 0.6, 10.4, 0.05, z + 0.6); // bridges
  const lines = (pts: number[], m: THREE.LineBasicMaterial) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(g, m);
  };
  scene.add(lines(segs, street), lines(avs, avenue));

  // district name plates
  for (const [k, d] of Object.entries(DISTRICTS)) {
    const el = document.createElement("div");
    el.className = "cdist";
    el.textContent = d.name;
    const o = new CSS2DObject(el);
    o.position.set(
      d.x - (d.cols * LOT) / 2,
      0.1,
      d.z + (d.rows * LOT) / 2 + 1.2,
    );
    o.center.set(0, 0);
    o.userData.k = k;
    scene.add(o);
  }

  // ---- buildings ----
  const bodyMat = () =>
    new THREE.MeshStandardMaterial({
      color: "#26282c",
      roughness: 0.92,
      metalness: 0.05,
      transparent: true,
    });
  const edgeMat = () =>
    new THREE.LineBasicMaterial({ color: "#5a5e65", transparent: true });
  const blds = new Map<string, Bld>();
  const fillers: Bld[] = [];
  const pickables: THREE.Mesh[] = [];

  const heightOf = (p: Piece) => {
    if (p.sys === "entry") return 3 + (model.seq[p.id]?.length ?? 2) * 0.9;
    if (p.sys === "logic") return 2.4 + model.neighbours(p.id).size * 0.45;
    if (p.sys === "storage") return p.mapping ? 3.2 : 1.4;
    if (p.sys === "deps") return 6 + model.neighbours(p.id).size * 0.6;
    if (p.sys === "calls") return 1.1;
    if (p.sys === "events") return 4.2;
    return 1; // access gates
  };
  const footprint = (p: Piece): [number, number] => {
    if (p.sys === "storage") return [2.4, 2.4];
    if (p.sys === "events") return [0.5, 0.5];
    if (p.sys === "access") return [2.3, 0.7];
    if (p.sys === "calls") return [1.4, 1.4];
    return [1.9, 1.9];
  };

  function addBuilding(
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    piece?: Piece,
  ): Bld {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = bodyMat();
    if (piece?.ghost) {
      mat.opacity = 0.08;
      mat.depthWrite = false;
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      edgeMat(),
    );
    edges.position.copy(mesh.position);
    if (piece?.ghost)
      (edges.material as THREE.LineBasicMaterial).color.set("#8a8f96");
    scene.add(mesh, edges);
    const b: Bld = { mesh, edges, top: h, piece };
    if (piece) {
      mesh.userData.id = piece.id;
      pickables.push(mesh);
    }
    return b;
  }

  /**
   * Building for a piece on the External Island (dependencies + the calls into them).
   * Kept separate so the external look can be swapped without touching the rest of the city.
   */
  function externalBuilding(x: number, z: number, p: Piece): Bld {
    const [w, d] = footprint(p);
    return addBuilding(x, z, w, d, heightOf(p), p);
  }

  const lots: Record<DistrictKey, [number, number][]> = {
    entry: [],
    logic: [],
    state: [],
    ext: [],
  };
  for (const [k, d] of Object.entries(DISTRICTS) as [
    DistrictKey,
    (typeof DISTRICTS)[DistrictKey],
  ][]) {
    for (let r = 0; r < d.rows; r++)
      for (let c = 0; c < d.cols; c++)
        lots[k].push([
          d.x - ((d.cols - 1) * LOT) / 2 + c * LOT,
          d.z - ((d.rows - 1) * LOT) / 2 + r * LOT,
        ]);
  }
  const used: Record<DistrictKey, number> = {
    entry: 0,
    logic: 0,
    state: 0,
    ext: 0,
  };
  const overflow = (k: DistrictKey, i: number): [number, number] => {
    const d = DISTRICTS[k];
    return [
      d.x - ((d.cols - 1) * LOT) / 2 + (i % d.cols) * LOT,
      d.z + ((d.rows + 1) / 2) * LOT + Math.floor(i / d.cols) * LOT,
    ];
  };
  const pieces = model.pieces.filter((p) => p.sys !== "vulns");
  for (const p of pieces) {
    const k = districtOf(p);
    const i = used[k]++;
    const [x, z] = lots[k][i] ?? overflow(k, i - lots[k].length);
    const [w, d] = footprint(p);
    const b =
      k === "ext"
        ? externalBuilding(x, z, p)
        : addBuilding(x, z, w, d, heightOf(p), p);
    const el = document.createElement("div");
    el.className = `cmark ${p.sys}`;
    const sq = document.createElement("i");
    sq.append(iconEl(iconOf(p)));
    const code = document.createElement("span");
    code.textContent = unitCode(model, p.id);
    const name = document.createElement("b");
    name.textContent = p.name;
    el.append(sq, code, name);
    const lo = new CSS2DObject(el);
    lo.position.set(x, b.top + 1.4, z);
    scene.add(lo);
    b.el = el;
    blds.set(p.id, b);
  }
  // finding markers ride on their host building
  const findingEls = new Map<string, HTMLDivElement>();
  for (const f of model.findings) {
    const host = blds.get(model.lesion[f.id]);
    if (!host) continue;
    const stack = [...findingEls.keys()].filter(
      (id) => model.lesion[id] === model.lesion[f.id],
    ).length;
    const el = document.createElement("div");
    el.className = "cmark vulns show";
    const sq = document.createElement("i");
    sq.append(iconEl("warn"));
    const code = document.createElement("span");
    code.textContent = f.name.slice(0, 4);
    el.append(sq, code);
    const lo = new CSS2DObject(el);
    lo.position.set(
      host.mesh.position.x,
      host.top + 2.6 + stack * 1.1,
      host.mesh.position.z,
    );
    scene.add(lo);
    findingEls.set(f.id, el);
    (host.edges.material as THREE.LineBasicMaterial).color.set("#a8433f");
  }
  // filler city: dim massing in the free lots and the blocks around districts
  const rand = rng(7);
  for (const k of Object.keys(lots) as DistrictKey[])
    for (const [x, z] of lots[k].slice(used[k]))
      fillers.push(
        addBuilding(
          x,
          z,
          1.4 + rand() * 0.8,
          1.4 + rand() * 0.8,
          0.8 + rand() * 2.2,
        ),
      );
  for (let gx = -42; gx <= 36; gx += LOT)
    for (let gz = -40; gz <= 34; gz += LOT) {
      if (gx > 5 && gx < 11.5) continue; // river
      const inside = Object.values(DISTRICTS).some(
        (d) =>
          Math.abs(gx - d.x) < (d.cols * LOT) / 2 + 2.2 &&
          Math.abs(gz - d.z) < (d.rows * LOT) / 2 + 3.6,
      );
      if (inside || rand() < 0.35) continue;
      const h = 0.6 + rand() ** 2 * 6;
      fillers.push(
        addBuilding(gx, gz, 1.3 + rand() * 1.2, 1.3 + rand() * 1.2, h),
      );
    }
  for (const f of fillers) {
    (f.mesh.material as THREE.MeshStandardMaterial).color.set("#1b1d20");
    (f.edges.material as THREE.LineBasicMaterial).color.set("#2c2f34");
  }

  // ---- routes between connected buildings, along the street grid ----
  const routeG = new THREE.Group();
  scene.add(routeG);
  let pulses: { curve: THREE.CurvePath<THREE.Vector3>; dot: THREE.Mesh }[] = [];
  function route(a: THREE.Vector3, b: THREE.Vector3) {
    const y = 0.08;
    const pts = [V(a.x, y, a.z), V(a.x, y, b.z), V(b.x, y, b.z)];
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < pts.length - 1; i++)
      path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    return path;
  }
  function drawRoutes(sel: string | null) {
    clearGroup(routeG);
    pulses = [];
    if (!sel || !blds.has(sel)) return;
    const a = (blds.get(sel) as Bld).mesh.position;
    // leader line from rooftop to marker
    const top = (blds.get(sel) as Bld).top;
    routeG.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          V(a.x, top, a.z),
          V(a.x, top + 1.2, a.z),
        ]),
        new THREE.LineBasicMaterial({ color: "#ffffff" }),
      ),
    );
    for (const id of model.neighbours(sel)) {
      if (id === sel || !blds.has(id)) continue;
      const path = route(a, (blds.get(id) as Bld).mesh.position);
      const red =
        model.byId[id]?.sys === "vulns" ||
        model.findings.some(
          (f) => (f.links ?? []).includes(id) && (f.links ?? []).includes(sel),
        );
      const col = red ? "#ff4545" : "#ffffff";
      routeG.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(path.getPoints(24)),
          new THREE.LineBasicMaterial({ color: col }),
        ),
      );
      const dot = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.28, 0.28),
        new THREE.MeshBasicMaterial({ color: col }),
      );
      routeG.add(dot);
      pulses.push({ curve: path, dot });
    }
  }

  // ---- simulation: one route per executed step, a pulse on the current one ----
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const simG = new THREE.Group();
  scene.add(simG);
  let simPulse: {
    curve: THREE.CurvePath<THREE.Vector3>;
    dot: THREE.Mesh;
    t0: number;
  } | null = null;
  let simTarget: { id: string; late: boolean } | null = null;
  /** read = dashed grey, write = solid white, call = solid grey, event = fine dashes; late write = red */
  const STEP_STYLE: Record<
    Step[0],
    { color: string; dash?: [number, number]; dot: () => THREE.BufferGeometry }
  > = {
    r: {
      color: "#9ca0a6",
      dash: [0.45, 0.3],
      dot: () => new THREE.SphereGeometry(0.2, 10, 8),
    },
    w: { color: "#ffffff", dot: () => new THREE.BoxGeometry(0.34, 0.34, 0.34) },
    c: { color: "#c3c6ca", dot: () => new THREE.OctahedronGeometry(0.3) },
    e: {
      color: "#dfe1e3",
      dash: [0.12, 0.22],
      dot: () => new THREE.TorusGeometry(0.22, 0.06, 6, 16),
    },
  };
  function clearGroup(g: THREE.Group) {
    for (const c of [...g.children]) {
      g.remove(c);
      if (c instanceof THREE.Line || c instanceof THREE.Mesh) {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      }
    }
  }
  function drawSim(sim: CitySimFrame | null) {
    clearGroup(simG);
    simPulse = null;
    simTarget = null;
    const from = sim && blds.get(sim.entry);
    routeG.visible = !from || sim.step < 0;
    if (!from || sim.step < 0) return;
    sim.steps.slice(0, sim.step + 1).forEach(([k, t], i) => {
      const to = blds.get(t);
      if (!to) return;
      const st = STEP_STYLE[k];
      const color = sim.late[i] ? "#ff4545" : st.color;
      const cur = i === sim.step;
      const curve = route(from.mesh.position, to.mesh.position);
      const mat = st.dash
        ? new THREE.LineDashedMaterial({
            color,
            dashSize: st.dash[0],
            gapSize: st.dash[1],
          })
        : new THREE.LineBasicMaterial({ color });
      mat.transparent = true;
      mat.opacity = cur ? 1 : 0.3;
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)),
        mat,
      );
      line.computeLineDistances();
      simG.add(line);
      if (!cur) return;
      const dot = new THREE.Mesh(
        st.dot(),
        new THREE.MeshBasicMaterial({ color }),
      );
      simG.add(dot);
      simPulse = { curve, dot, t0: performance.now() };
      simTarget = { id: t, late: sim.late[i] };
    });
  }

  // ---- state / highlight ----
  let selected: string | null = null;
  let hovered: string | null = null;
  const ALWAYS = new Set(["entry", "deps"]);
  function refresh() {
    const near = selected ? model.neighbours(selected) : null;
    for (const [id, b] of blds) {
      const p = b.piece as Piece;
      const target = simTarget?.id === id;
      const focus = id === selected || id === hovered || target;
      const lit = !!near?.has(id);
      const dim = !!near && !lit;
      const body = b.mesh.material as THREE.MeshStandardMaterial;
      const edge = b.edges.material as THREE.LineBasicMaterial;
      if (!p.ghost) {
        body.color.set(focus ? "#4a4e55" : lit ? "#34373c" : "#26282c");
        body.opacity = dim ? 0.35 : 1;
      }
      edge.opacity = dim ? 0.25 : 1;
      if (target && simTarget?.late) edge.color.set("#ff4545");
      else if (!model.isLesionHost(id))
        edge.color.set(
          focus ? "#ffffff" : lit ? "#c9ccd1" : p.ghost ? "#8a8f96" : "#5a5e65",
        );
      else edge.color.set("#a8433f");
      if (target && !p.ghost) body.color.set("#5d626a");
      b.el?.classList.toggle(
        "show",
        focus || lit || (!near && ALWAYS.has(p.sys)),
      );
      b.el?.classList.toggle("focus", focus);
    }
    for (const f of fillers)
      (f.edges.material as THREE.LineBasicMaterial).opacity = near ? 0.35 : 1;
    for (const [fid, el] of findingEls)
      el.classList.toggle(
        "dim",
        !!near && !near.has(fid) && !near.has(model.lesion[fid]),
      );
    renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
  }

  // ---- picking ----
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pick = (ev: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(
      ((ev.clientX - r.left) / r.width) * 2 - 1,
      -((ev.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(ndc, camera);
    return (
      (ray.intersectObjects(pickables, false)[0]?.object.userData
        .id as string) ?? null
    );
  };
  let down: [number, number] | null = null;
  const onMove = (ev: PointerEvent) => {
    const h = pick(ev);
    if (h !== hovered) {
      hovered = h;
      refresh();
    }
  };
  const onDown = (ev: PointerEvent) => {
    down = [ev.clientX, ev.clientY];
  };
  const onUp = (ev: PointerEvent) => {
    if (down && Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) < 5)
      onPick(pick(ev));
    down = null;
  };
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);

  // ---- camera ----
  type Anim = {
    fp: THREE.Vector3;
    tp: THREE.Vector3;
    ft: THREE.Vector3;
    tt: THREE.Vector3;
    t0: number;
  };
  let anim: Anim | null = null;
  let zoom: CityZoom = "city";
  const fly = (pos: THREE.Vector3, target: THREE.Vector3) => {
    anim = {
      fp: camera.position.clone(),
      tp: pos,
      ft: controls.target.clone(),
      tt: target,
      t0: performance.now(),
    };
  };
  function frame() {
    const focus =
      selected && blds.has(selected)
        ? (blds.get(selected) as Bld).mesh.position.clone().setY(0)
        : null;
    if (zoom === "city" || !focus) {
      if (zoom === "city" && focus) {
        const dir = camera.position
          .clone()
          .sub(controls.target)
          .setLength(HOME.pos.distanceTo(HOME.target));
        fly(focus.clone().add(dir), focus);
      } else fly(HOME.pos.clone(), HOME.target.clone());
      return;
    }
    const dist = zoom === "district" ? 26 : 12;
    const dir = camera.position.clone().sub(controls.target).normalize();
    dir.y = Math.max(dir.y, zoom === "street" ? 0.35 : 0.6);
    fly(focus.clone().add(dir.normalize().multiplyScalar(dist)), focus);
  }

  const fit = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    css2.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(fit);
  ro.observe(stage);
  fit();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    if (anim) {
      const k = Math.min(1, (performance.now() - anim.t0) / 900);
      const s = ease(k);
      camera.position.lerpVectors(anim.fp, anim.tp, s);
      controls.target.lerpVectors(anim.ft, anim.tt, s);
      if (k === 1) anim = null;
    }
    pulses.forEach((p, i) => {
      p.dot.position.copy(
        p.curve.getPoint(still ? 0.5 : (t * 0.35 + i * 0.19) % 1),
      );
    });
    if (simPulse) {
      const k = still
        ? 1
        : Math.min(1, (performance.now() - simPulse.t0) / 900);
      simPulse.dot.position.copy(simPulse.curve.getPoint(ease(k)));
      simPulse.dot.rotation.y = t * 2;
    }
    controls.update();
    renderer.render(scene, camera);
    css2.render(scene, camera);
  });
  refresh();

  return {
    select(id) {
      selected =
        id && blds.has(id)
          ? id
          : id && model.lesion[id]
            ? model.lesion[id]
            : id;
      drawRoutes(selected);
      refresh();
      frame();
    },
    setSim(sim) {
      drawSim(sim);
      refresh();
    },
    setZoom(z) {
      zoom = z;
      frame();
    },
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
          o.geometry.dispose();
          for (const m of [o.material].flat()) (m as THREE.Material).dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      css2.domElement.remove();
    },
  };
}
