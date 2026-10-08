import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { BASE } from "./endfield";

/**
 * USDC playground in the City (see utils/playground.ts): move-order preview while the auditor
 * drags the token, the access-control stop at a gate, a selection ring under the token and red
 * rings on finding hosts reached by the replayed call. A passing call itself is the existing
 * step simulation (CitySimFrame), this layer only adds to it.
 */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const STILL =
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const GREEN = "#3ddc84";
const RED = "#ff4545";

/** Where the token enters the city: the plot's south-west corner, next to the dock. */
export const DOCK_AT = V(BASE.x0 - 1.6, 0.1, BASE.z1 + 1.6);

/** call = entry point that will run, pass = access control will stop it (works), reach = no call */
export type PreviewTone = "call" | "pass" | "reach";
/** Token stopped by access control: `gate` = modifier building, else the role's relay pylon. */
export type PlayRevert = {
  entry: string;
  gate: string | null;
  head: string;
  code: string;
};

type Node = { mesh: THREE.Mesh; top: number };

export function createPlaygroundLayer(o: {
  scene: THREE.Scene;
  blds: Map<string, Node>;
  pylon: (entry: string) => THREE.Vector3 | undefined;
  token: THREE.Sprite;
  size: number;
}) {
  const { scene, blds, token } = o;
  const g = new THREE.Group();
  scene.add(g);
  const flat = (geo: THREE.BufferGeometry, color: string, opacity = 1) => {
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    g.add(m);
    return m;
  };

  // move order: dotted path dock → target along the streets, bracket box on the target
  const pathMat = new THREE.LineDashedMaterial({
    color: "#ffffff",
    dashSize: 0.5,
    gapSize: 0.35,
    fog: false,
  });
  const path = new THREE.Line(new THREE.BufferGeometry(), pathMat);
  path.visible = false;
  const box = new THREE.Box3Helper(new THREE.Box3(), "#ffffff");
  box.visible = false;
  const dock = flat(new THREE.RingGeometry(0.7, 0.85, 4), "#ffffff", 0.7);
  dock.position.copy(DOCK_AT);
  g.add(path, box);
  const TONE: Record<PreviewTone, string> = {
    call: "#ffffff",
    pass: GREEN,
    reach: "#9ca0a6",
  };

  function preview(id: string | null, tone: PreviewTone | null) {
    const b = id ? blds.get(id) : undefined;
    path.visible = box.visible = dock.visible = !!b && !!tone;
    if (!b || !tone) return;
    const to = b.mesh.position;
    const y = 0.12;
    path.geometry.dispose();
    path.geometry = new THREE.BufferGeometry().setFromPoints([
      V(DOCK_AT.x, y, DOCK_AT.z),
      V(DOCK_AT.x, y, to.z),
      V(to.x, y, to.z),
    ]);
    path.computeLineDistances();
    pathMat.color.set(TONE[tone]);
    box.box.setFromObject(b.mesh).expandByScalar(0.35);
    (box.material as THREE.LineBasicMaterial).color.set(TONE[tone]);
  }

  // unit selection ring under the token (fixed ring + rotating segmented ring)
  const ring = flat(new THREE.RingGeometry(0.95, 1.05, 48), "#ffffff", 0.9);
  const ticks = flat(
    new THREE.RingGeometry(1.2, 1.32, 24, 1, 0, Math.PI * 1.7),
    "#ffffff",
    0.6,
  );
  let unit = false;

  // access-control stop: token rides from the entry to the gate and halts; the gate flashes green
  const gateFx = flat(new THREE.RingGeometry(0.9, 1.05, 48), GREEN);
  const capEl = document.createElement("div");
  capEl.className = "cproc pass";
  const capHead = document.createElement("b");
  const capCode = document.createElement("code");
  capEl.append(capHead, capCode);
  const cap = new CSS2DObject(capEl);
  cap.visible = false;
  g.add(cap);
  let stop: { from: THREE.Vector3; at: THREE.Vector3; t0: number } | null =
    null;
  function revert(r: PlayRevert | null) {
    stop = null;
    cap.visible = gateFx.visible = false;
    const from = r && blds.get(r.entry);
    if (!r || !from) return;
    const gate = r.gate ? blds.get(r.gate) : undefined;
    const at = gate
      ? gate.mesh.position.clone().setY(gate.top + 1)
      : (o.pylon(r.entry)?.clone().setY(5.8) ??
        from.mesh.position.clone().setY(from.top + 1));
    stop = {
      from: from.mesh.position.clone().setY(from.top + 1),
      at,
      t0: performance.now(),
    };
    capHead.textContent = r.head;
    capCode.textContent = r.code;
    cap.position.set(at.x, at.y + 1.6, at.z);
  }

  // findings reached by the replayed call: red ring at each host's foot
  const lit = new Map<string, THREE.Mesh>();
  function setLit(hosts: Set<string>) {
    for (const [id, m] of lit)
      if (!hosts.has(id)) {
        g.remove(m);
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
        lit.delete(id);
      }
    for (const id of hosts) {
      const b = blds.get(id);
      if (!b || lit.has(id)) continue;
      const m = flat(new THREE.RingGeometry(1.5, 1.62, 4), RED, 0.9);
      m.rotation.z = Math.PI / 4;
      m.position.set(b.mesh.position.x, 0.1, b.mesh.position.z);
      m.visible = true;
      lit.set(id, m);
    }
  }

  return {
    preview,
    revert,
    setLit,
    /** selection ring under the token while the playground holds it */
    setUnit(on: boolean) {
      unit = on;
    },
    /** true while the layer, not the step simulation, positions the token */
    owns: () => !!stop,
    /** position the token (only when `owns()`) */
    drive(t: number) {
      if (!stop) return;
      const k = STILL ? 1 : Math.min(1, (performance.now() - stop.t0) / 900);
      token.visible = true;
      token.scale.set(o.size, o.size, 1);
      token.position.lerpVectors(stop.from, stop.at, ease(k));
      if (k < 1) return;
      cap.visible = gateFx.visible = true;
      const q = STILL ? 0.5 : (t * 1.2) % 1;
      gateFx.position.set(stop.at.x, stop.at.y - 0.9, stop.at.z);
      gateFx.scale.setScalar(1 + q * 1.6);
      (gateFx.material as THREE.MeshBasicMaterial).opacity = 1 - q;
    },
    /** keep the ring under the token and pulse lit findings; call after the token moved */
    follow(t: number) {
      ring.visible = ticks.visible = unit && token.visible;
      if (ring.visible) {
        ring.position.set(token.position.x, 0.14, token.position.z);
        ticks.position.copy(ring.position);
        if (!STILL) ticks.rotation.z = t * 1.4;
      }
      const a = STILL ? 0.9 : 0.55 + 0.45 * Math.sin(t * 4) ** 2;
      for (const m of lit.values())
        (m.material as THREE.MeshBasicMaterial).opacity = a;
    },
    tokenAt: () =>
      token.visible ? { x: token.position.x, z: token.position.z } : null,
  };
}

export type PlaygroundLayer = ReturnType<typeof createPlaygroundLayer>;
