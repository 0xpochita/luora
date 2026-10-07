import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const HEIGHT = 40; // above the tallest building, below the fog start (55); ortho, so size comes from zoom
const HALF = 22; // world units from the centre to the top edge at zoom 1

/**
 * 2D top-down plan of the City: orthographic camera straight down (north = up), pan with any
 * button, wheel zooms. No perspective or orbit, so labels and lots read like a map.
 */
export function createPlanView(dom: HTMLElement, center: THREE.Vector3) {
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  camera.position.set(center.x, HEIGHT, center.z + 0.01);
  const controls = new OrbitControls(camera, dom);
  controls.target.set(center.x, 0, center.z);
  controls.enableRotate = false;
  controls.enableDamping = true;
  controls.screenSpacePanning = true;
  controls.minZoom = 0.6;
  controls.maxZoom = 6;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.enabled = false;
  controls.update();
  return {
    camera,
    controls,
    /** camera position that looks straight down on `at` */
    over: (at: THREE.Vector3) => new THREE.Vector3(at.x, HEIGHT, at.z + 0.01),
    fit(w: number, h: number) {
      const a = w / h;
      Object.assign(camera, {
        left: -HALF * a,
        right: HALF * a,
        top: HALF,
        bottom: -HALF,
      });
      camera.updateProjectionMatrix();
    },
  };
}
