import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/addons/renderers/CSS2DRenderer.js";
import { LAYERS } from "../data/layers";
import type { CamView, LayerKey, Piece } from "../types";
import { type AtlasModel, colorOf } from "../utils/model";
import { CELL, placePieces, reach } from "../utils/place";

export type AtlasScene = {
  select: (id: string | null) => void;
  setSpread: (v: number) => void;
  setHiddenLayers: (keys: Set<LayerKey>) => void;
  setCamera: (v: CamView) => void;
  setAutoRotate: (on: boolean) => void;
  dispose: () => void;
};

const VIEW = 33;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TARGET = V(0, 6, 0);
const DIRS: Record<CamView, THREE.Vector3> = {
  iso: V(30, 22, 30),
  front: V(0, 14, 42),
  top: V(0.01, 46, 0.01),
};
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

type NodeData = { cap?: THREE.Mesh; ring?: THREE.LineLoop; el: HTMLDivElement };
type Mat = THREE.Material & { opacity: number; userData: { base?: number } };

/**
 * Imperative three.js "Contract Atlas": a pyramid of diamond plates (External → Entry → Logic → State)
 * with hex-prism nodes, dashed relation arcs and floating finding markers.
 */
export function createAtlasScene(
  stage: HTMLElement,
  model: AtlasModel,
  onPick: (id: string | null) => void,
): AtlasScene {
  const {
    pieces: PIECES,
    lesion: LESION,
    byId,
    isLesionHost,
    links: LINKS,
    layerOf,
    neighbours,
  } = model;
  const SPOT = placePieces(PIECES, layerOf);
  // findings sharing a host stack upwards
  const stackAt: Record<string, number> = {};
  const seenHost: Record<string, number> = {};
  for (const f of model.findings) {
    const h = LESION[f.id];
    stackAt[f.id] = seenHost[h] ?? 0;
    seenHost[h] = stackAt[f.id] + 1;
  }
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
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
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 400);
  camera.position.copy(TARGET).add(DIRS.iso);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enableDamping = true;
  controls.minZoom = 0.6;
  controls.maxZoom = 4;
  scene.add(new THREE.HemisphereLight("#d6d8db", "#0a0b0c", 1.2));
  const key = new THREE.DirectionalLight("#ffffff", 1.6);
  key.position.set(-10, 30, 14);
  scene.add(key);
  const grid = new THREE.GridHelper(120, 60, "#1a1d22", "#14171b");
  grid.position.y = -0.8;
  scene.add(grid);

  // ---- plates ----
  const plates = new Map<LayerKey, THREE.Group>();
  for (const L of LAYERS) {
    const s = L.half * 2;
    const g = new THREE.Group();
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(s, 0.28, s),
      new THREE.MeshStandardMaterial({
        color: "#1b1e23",
        roughness: 0.85,
        metalness: 0.1,
      }),
    );
    const inset = new THREE.Mesh(
      new THREE.BoxGeometry(s - 1.2, 0.02, s - 1.2),
      new THREE.MeshStandardMaterial({ color: "#15181c", roughness: 1 }),
    );
    inset.position.y = 0.15;
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(s, 0.28, s)),
      new THREE.LineBasicMaterial({
        color: new THREE.Color(L.color).multiplyScalar(0.55),
      }),
    );
    g.add(slab, inset, edge);
    const lab = document.createElement("div");
    lab.className = "laylab";
    lab.style.setProperty("--c", L.color);
    lab.textContent = `${L.name.toUpperCase()} · ${L.sub}`;
    const lo = new CSS2DObject(lab);
    lo.position.set(L.half - 0.2, 0.2, L.half + 0.3);
    g.add(lo);
    const used = new Set(
      PIECES.filter((p) => SPOT[p.id] && layerOf(p) === L).map((p) =>
        SPOT[p.id].join(),
      ),
    );
    const n = reach(L.half);
    for (let i = -n; i <= n; i++)
      for (let j = -n; j <= n; j++)
        if (!used.has(`${i},${j}`)) {
          const sk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.42, 0.32, 6),
            new THREE.MeshStandardMaterial({
              color: "#3a3f46",
              roughness: 0.6,
              metalness: 0.3,
              transparent: true,
              opacity: 0.55,
            }),
          );
          sk.position.set(i * CELL, 0.32, j * CELL);
          g.add(sk);
        }
    g.position.y = L.y;
    g.userData.L = L;
    scene.add(g);
    plates.set(L.key, g);
  }

  // ---- nodes ----
  const group = new Map<string, THREE.Group>();
  const data = new Map<string, NodeData>();
  const pickables: THREE.Mesh[] = [];
  const hexBody = new THREE.CylinderGeometry(0.46, 0.46, 0.62, 6);
  const hexCap = new THREE.CylinderGeometry(0.47, 0.47, 0.1, 6);
  for (const p of PIECES) {
    const g = new THREE.Group();
    const cc = new THREE.Color(colorOf(p));
    const nd: Partial<NodeData> = {};
    if (p.sys === "vulns") {
      g.add(
        new THREE.Mesh(
          new THREE.OctahedronGeometry(0.3),
          new THREE.MeshStandardMaterial({
            color: cc,
            emissive: cc,
            emissiveIntensity: 1.4,
          }),
        ),
      );
    } else {
      const ghost = !!p.ghost;
      const body = new THREE.Mesh(
        hexBody,
        ghost
          ? new THREE.MeshBasicMaterial({
              color: cc,
              wireframe: true,
              transparent: true,
              opacity: 0.7,
            })
          : new THREE.MeshStandardMaterial({
              color: "#6b7179",
              roughness: 0.35,
              metalness: 0.55,
              transparent: true,
            }),
      );
      body.position.y = 0.31;
      g.add(body);
      if (!ghost) {
        const cap = new THREE.Mesh(
          hexCap,
          new THREE.MeshStandardMaterial({
            color: cc,
            emissive: cc,
            emissiveIntensity: 0.9,
            transparent: true,
          }),
        );
        cap.position.y = 0.66;
        g.add(cap);
        nd.cap = cap;
      }
      if (p.mapping && nd.cap)
        for (let k = 1; k < 3; k++) {
          const b = body.clone();
          b.material = (body.material as THREE.MeshStandardMaterial).clone();
          b.position.y = 0.31 + k * 0.64;
          g.add(b);
          nd.cap.position.y = 0.66 + k * 0.64;
        }
      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints([
          V(0, 0, -0.95),
          V(0.95, 0, 0),
          V(0, 0, 0.95),
          V(-0.95, 0, 0),
        ]),
        new THREE.LineBasicMaterial({
          color: cc,
          transparent: true,
          opacity: 0,
        }),
      );
      ring.position.y = 0.03;
      g.add(ring);
      nd.ring = ring;
    }
    scene.add(g);
    group.set(p.id, g);
    g.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.userData.id = p.id;
      pickables.push(o);
      const m = o.material as Mat;
      if (m.transparent) m.userData.base = m.opacity;
    });
    const el = document.createElement("div");
    el.className = `chip3d ${p.sys}`;
    el.style.setProperty("--c", colorOf(p));
    const icon = document.createElement("i");
    icon.textContent = "■";
    el.append(icon, p.sys === "vulns" ? p.name.slice(0, 4) : p.name);
    const lo = new CSS2DObject(el);
    lo.position.y = p.sys === "vulns" ? 0.5 : p.mapping ? 2.4 : 1.25;
    g.add(lo);
    nd.el = el;
    data.set(p.id, nd as NodeData);
  }

  const arcG = new THREE.Group();
  scene.add(arcG);
  let arcs: [THREE.QuadraticBezierCurve3, THREE.Mesh][] = [];

  // ---- state ----
  let spread = 0;
  let selected: string | null = null;
  let hovered: string | null = null;
  let hidden = new Set<LayerKey>();
  const visible = (p: Piece) => !hidden.has(layerOf(p).key);

  function nodePos(p: Piece) {
    const y = layerOf(p).y * (1 + spread * 0.9);
    if (p.sys === "vulns") {
      const [i, j] = SPOT[LESION[p.id]] ?? [0, 0];
      return V(i * CELL, y + 2.2 + stackAt[p.id] * 0.8, j * CELL);
    }
    const [i, j] = SPOT[p.id] ?? [0, 0];
    return V(i * CELL, y + 0.14, j * CELL);
  }

  function drawArcs() {
    for (const c of [...arcG.children]) {
      arcG.remove(c);
      if (c instanceof THREE.Line || c instanceof THREE.Mesh)
        c.geometry.dispose();
    }
    arcs = [];
    const near = selected ? neighbours(selected) : null;
    for (const [a, b] of LINKS) {
      const A = byId[a];
      const B = byId[b];
      if (A.sys === "vulns" || B.sys === "vulns" || !visible(A) || !visible(B))
        continue;
      const hot = !!near && (a === selected || b === selected);
      if (layerOf(A) === layerOf(B) && !hot) continue; // same-layer links only when focused
      const pa = (group.get(a) as THREE.Group).position
        .clone()
        .add(V(0, 0.8, 0));
      const pb = (group.get(b) as THREE.Group).position
        .clone()
        .add(V(0, 0.8, 0));
      const m = pa.clone().lerp(pb, 0.5);
      m.y = Math.max(pa.y, pb.y) + 1 + pa.distanceTo(pb) * 0.18;
      const curve = new THREE.QuadraticBezierCurve3(pa, m, pb);
      const c = hot
        ? new THREE.Color(colorOf(byId[a === selected ? b : a]))
        : new THREE.Color("#ffffff");
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),
        new THREE.LineDashedMaterial({
          color: c,
          dashSize: 0.22,
          gapSize: 0.18,
          transparent: true,
          opacity: hot ? 1 : near ? 0.06 : 0.32,
        }),
      );
      line.computeLineDistances();
      arcG.add(line);
      if (hot || !near) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(hot ? 0.09 : 0.05, 10, 10),
          new THREE.MeshBasicMaterial({
            color: c,
            transparent: true,
            opacity: hot ? 1 : 0.6,
          }),
        );
        arcG.add(dot);
        arcs.push([curve, dot]);
      }
    }
  }

  function refresh() {
    const near = selected ? neighbours(selected) : null;
    for (const p of PIECES) {
      const g = group.get(p.id) as THREE.Group;
      const nd = data.get(p.id) as NodeData;
      const on = visible(p);
      const focus = p.id === selected || p.id === hovered;
      const dim = !!near && !near.has(p.id);
      g.visible = on;
      g.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const m = o.material as Mat;
        if (m.userData.base !== undefined)
          m.opacity = m.userData.base * (dim ? 0.18 : 1);
      });
      if (nd.cap)
        (nd.cap.material as THREE.MeshStandardMaterial).emissiveIntensity = dim
          ? 0.15
          : focus
            ? 2.2
            : 0.9;
      if (nd.ring)
        (nd.ring.material as THREE.LineBasicMaterial).opacity =
          focus || near?.has(p.id) ? 1 : isLesionHost(p.id) ? 0.55 : 0;
      const show = on && (focus || (near ? near.has(p.id) : p.sys === "vulns"));
      nd.el.classList.toggle("show", show);
      nd.el.classList.toggle("focus", focus);
    }
    for (const g of plates.values())
      g.traverse((o) => {
        if (o instanceof THREE.Mesh && (o.material as Mat).transparent)
          (o.material as Mat).opacity = near ? 0.25 : 0.55;
      });
    renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
  }

  function layout() {
    for (const g of plates.values()) {
      g.position.y = g.userData.L.y * (1 + spread * 0.9);
      g.visible = !hidden.has(g.userData.L.key);
    }
    for (const p of PIECES)
      (group.get(p.id) as THREE.Group).position.copy(nodePos(p));
    drawArcs();
    refresh();
  }

  // ---- picking ----
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(ev: PointerEvent): string | null {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(
      ((ev.clientX - r.left) / r.width) * 2 - 1,
      -((ev.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(
      pickables.filter((m) => group.get(m.userData.id)?.visible),
      false,
    )[0];
    return (hit?.object.userData.id as string) ?? null;
  }
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
    fz: number;
    tz: number;
    t0: number;
  };
  let camAnim: Anim | null = null;
  const flyTo = (pos: THREE.Vector3, target: THREE.Vector3, zoom: number) => {
    camAnim = {
      fp: camera.position.clone(),
      tp: pos,
      ft: controls.target.clone(),
      tt: target.clone(),
      fz: camera.zoom,
      tz: zoom,
      t0: performance.now(),
    };
  };
  const fit = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    const a = w / h;
    renderer.setSize(w, h);
    css2.setSize(w, h);
    Object.assign(camera, {
      left: (-VIEW * a) / 2,
      right: (VIEW * a) / 2,
      top: VIEW / 2,
      bottom: -VIEW / 2,
    });
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(fit);
  ro.observe(stage);
  fit();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    if (camAnim) {
      const k = Math.min(1, (performance.now() - camAnim.t0) / 800);
      const s = ease(k);
      camera.position.lerpVectors(camAnim.fp, camAnim.tp, s);
      controls.target.lerpVectors(camAnim.ft, camAnim.tt, s);
      camera.zoom = camAnim.fz + (camAnim.tz - camAnim.fz) * s;
      camera.updateProjectionMatrix();
      if (k === 1) camAnim = null;
    }
    PIECES.forEach((p, i) => {
      const g = group.get(p.id) as THREE.Group;
      if (p.sys === "vulns") {
        g.children[0].position.y = Math.sin(t * 2.4 + i) * 0.12;
        g.children[0].rotation.y = t * 1.5;
      } else if (isLesionHost(p.id) && p.id !== selected)
        data
          .get(p.id)
          ?.ring?.scale.setScalar(1 + (Math.sin(t * 3 + i) + 1) * 0.06);
    });
    arcs.forEach(([c, dot], i) => {
      dot.position.copy(c.getPoint((t * 0.35 + i * 0.13) % 1));
    });
    controls.update();
    renderer.render(scene, camera);
    css2.render(scene, camera);
  });

  layout();

  return {
    select(id) {
      selected = id;
      if (id) {
        const p = (group.get(id) as THREE.Group).position;
        const off = camAnim
          ? camAnim.tp.clone().sub(camAnim.tt)
          : camera.position.clone().sub(controls.target);
        flyTo(p.clone().add(off), p, 1.8);
      } else flyTo(TARGET.clone().add(DIRS.iso), TARGET, 1);
      layout();
    },
    setSpread(v) {
      spread = v;
      layout();
    },
    setHiddenLayers(keys) {
      hidden = new Set(keys);
      layout();
    },
    setCamera(v) {
      flyTo(TARGET.clone().add(DIRS[v]), TARGET, 1);
    },
    setAutoRotate(on) {
      controls.autoRotate = on;
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
