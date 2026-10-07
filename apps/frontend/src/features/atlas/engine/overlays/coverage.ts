import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { isStateChanging, pctLabel, pieceCoverage } from "../../utils/coverage";
import type { AtlasModel } from "../../utils/model";

export type CityOverlay = "coverage";
type Building = { mesh: THREE.Mesh; top: number };

/** Red diagonal hatch for buildings whose code never ran under the tests. */
function hatchTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.strokeStyle = "#ff4545";
  g.lineWidth = 5;
  for (let k = -32; k <= 64; k += 16) {
    g.beginPath();
    g.moveTo(k, 0);
    g.lineTo(k + 32, 32);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Coverage overlay for the City: untested = red hatch + red outline, partial = grey,
 * covered = green roof lamp; untested state-changing entry points get an UNTESTED marker.
 * Pieces without executable code (storage, deps, events) fade out while it is on.
 */
export function createCoverageOverlay(
  scene: THREE.Scene,
  model: AtlasModel,
  blds: Map<string, Building>,
) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const labels: CSS2DObject[] = [];
  const hatch = hatchTexture();
  const lampMat = new THREE.MeshBasicMaterial({ color: "#3ddc84" });
  let on = false;

  for (const [id, b] of blds) {
    const cov = pieceCoverage(model, id);
    if (!cov) continue;
    const { x, z } = b.mesh.position;
    if (cov.state === "untested") {
      const mat = new THREE.MeshBasicMaterial({
        map: hatch,
        transparent: true,
        depthWrite: false,
      });
      // fade with the building when the city dims it around a selection
      const body = b.mesh.material as THREE.Material;
      const shell = new THREE.Mesh(b.mesh.geometry, mat);
      shell.onBeforeRender = () => {
        mat.opacity = body.opacity;
      };
      shell.position.copy(b.mesh.position);
      shell.scale.setScalar(1.015);
      group.add(shell);
    } else if (cov.state === "covered") {
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.18, 0.5),
        lampMat,
      );
      lamp.position.set(x, b.top + 0.09, z);
      group.add(lamp);
    }
    const el = document.createElement("div");
    const untested = cov.state === "untested" && isStateChanging(model, id);
    el.className = `ccov ${cov.state}${untested ? " flag" : ""}`;
    el.textContent = untested ? "UNTESTED" : pctLabel(cov.pct);
    // street level, under the building: the roof belongs to the unit / finding markers
    const label = new CSS2DObject(el);
    label.position.set(x, 0, z);
    label.center.set(0.5, -0.4);
    label.visible = false;
    labels.push(label);
    scene.add(label);
  }

  return {
    setVisible(v: boolean) {
      on = v;
      group.visible = v;
      for (const l of labels) l.visible = v;
    },
    /** Re-tint one building after the city's own highlight pass (no-op while hidden). */
    paint(
      id: string,
      body: THREE.MeshStandardMaterial,
      edge: THREE.LineBasicMaterial,
      focus: boolean,
    ) {
      if (!on) return;
      const cov = pieceCoverage(model, id);
      if (!cov) {
        body.opacity *= 0.3;
        edge.opacity *= 0.3;
        return;
      }
      if (cov.state === "partial" && !focus) body.color.set("#3b3e44");
      if (!focus)
        edge.color.set(
          cov.state === "untested"
            ? "#ff4545"
            : cov.state === "covered"
              ? "#3ddc84"
              : "#9ba0a6",
        );
    },
  };
}
