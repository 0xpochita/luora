import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * External integration as a factory: wide low hall with a sawtooth roof and one or two chimneys.
 * Returns one geometry centred like a BoxGeometry(w, h, d) so the city can treat it as a building
 * (`h` is the total height, chimney top included).
 */
export function factoryGeometry(
  w: number,
  h: number,
  d: number,
  chimneys: 1 | 2,
): THREE.BufferGeometry {
  const hall = Math.min(1.2, h * 0.45);
  const tooth = hall * 0.45;
  const teeth = Math.max(2, Math.round(w / 0.7));
  // side profile (XY): hall walls + sawtooth roof line, extruded through the depth
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  for (let i = teeth; i > 0; i--) {
    const x0 = -w / 2 + ((i - 1) * w) / teeth;
    const x1 = -w / 2 + (i * w) / teeth;
    s.lineTo(x1, hall + tooth); // glazed vertical face
    s.lineTo(x0, hall); // roof slope
  }
  s.closePath();
  const body = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  body.translate(0, 0, -d / 2);
  body.clearGroups();
  const parts: THREE.BufferGeometry[] = [body];
  for (let k = 0; k < chimneys; k++) {
    const ch = h - hall + 0.1 - k * 0.6;
    const c = new THREE.CylinderGeometry(0.13, 0.18, ch, 6).toNonIndexed();
    c.translate(w / 2 - 0.35 - k * 0.5, hall - 0.1 + ch / 2, -d / 2 + 0.35);
    parts.push(c);
  }
  const g = mergeGeometries(parts) as THREE.BufferGeometry;
  for (const p of parts) p.dispose();
  g.translate(0, -h / 2, 0);
  return g;
}

/** Faint blinking beacon on the tallest chimney; child of the factory mesh (disposed with the scene). */
export function addBeacon(mesh: THREE.Mesh, w: number, h: number, d: number) {
  const mat = new THREE.MeshBasicMaterial({
    color: "#ffffff",
    transparent: true,
    depthWrite: false,
  });
  const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), mat);
  beacon.position.set(w / 2 - 0.35, h / 2 + 0.07, -d / 2 + 0.35);
  const phase = mesh.position.x + mesh.position.z;
  beacon.onBeforeRender = () => {
    mat.opacity =
      0.15 + 0.5 * Math.max(0, Math.sin(performance.now() / 500 + phase)) ** 4;
  };
  mesh.add(beacon);
}
