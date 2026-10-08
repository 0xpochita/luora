import * as THREE from "three";
import { pieceCoverage } from "../../utils/coverage";
import type { AtlasModel } from "../../utils/model";

type Building = { mesh: THREE.Mesh; top: number };
const STILL =
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Soft grey puff: radial gradient on a small canvas. */
function puffTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(120,124,130,0.55)");
  r.addColorStop(0.6, "rgba(90,94,100,0.22)");
  r.addColorStop(1, "rgba(80,84,90,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Fog of war for the Coverage overlay: code the tests never ran sits in drifting haze, like an
 * unexplored part of the map. Shown together with the coverage overlay.
 */
export function createFogOverlay(
  scene: THREE.Scene,
  model: AtlasModel,
  blds: Map<string, Building>,
) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const map = puffTexture();
  const puffs: { s: THREE.Sprite; x: number; z: number; ph: number }[] = [];
  for (const [id, b] of blds) {
    if (pieceCoverage(model, id)?.state !== "untested") continue;
    const { x, z } = b.mesh.position;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map, depthWrite: false, fog: false }),
      );
      const px = x + Math.cos(a) * 1.2;
      const pz = z + Math.sin(a) * 1.2;
      s.position.set(px, 0.6 + (k % 3) * 0.7, pz);
      s.scale.setScalar(4.5 + (k % 2) * 1.5);
      s.renderOrder = 5;
      group.add(s);
      puffs.push({ s, x: px, z: pz, ph: a });
    }
  }
  return {
    setVisible(v: boolean) {
      group.visible = v;
    },
    update(t: number) {
      if (STILL || !group.visible) return;
      for (const p of puffs) {
        p.s.position.x = p.x + Math.sin(t * 0.4 + p.ph) * 0.5;
        p.s.position.z = p.z + Math.cos(t * 0.3 + p.ph) * 0.5;
        p.s.material.rotation = t * 0.1 + p.ph;
      }
    },
  };
}
