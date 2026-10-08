import * as THREE from "three";

const STILL =
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The USDC token as a 3D coin: logo on both faces, ridged metal rim, standing upright and slowly
 * turning. Unit diameter, so `scale.setScalar(size)` sizes it like the old sprite.
 * `spin(rad)` adds a turn on top of the idle one (the token spinning inside a factory).
 */
export function createUsdcCoin(logo: THREE.Texture) {
  const token = new THREE.Group();
  const pivot = new THREE.Group();
  token.add(pivot);
  // the back face reads its texture mirrored, so flip it to keep the "$" the right way round
  const back = logo.clone();
  back.wrapS = THREE.RepeatWrapping;
  back.repeat.x = -1;
  back.offset.x = 1;
  const face = (map: THREE.Texture) =>
    new THREE.MeshBasicMaterial({ map, fog: false });
  const rim = new THREE.MeshStandardMaterial({
    color: "#2775ca",
    metalness: 0.7,
    roughness: 0.35,
    fog: false,
  });
  // cylinder groups: 0 = side, 1 = top cap, 2 = bottom cap; axis turned to face ±Z
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 48)
    .rotateY(Math.PI / 2)
    .rotateX(Math.PI / 2);
  const coin = new THREE.Mesh(geo, [rim, face(logo), face(back)]);
  // reeded edge: thin ring of ridges around the rim
  const ridges = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.025, 6, 48),
    new THREE.MeshStandardMaterial({
      color: "#9fc4ee",
      metalness: 0.8,
      roughness: 0.3,
      fog: false,
    }),
  );
  pivot.add(coin, ridges);
  token.renderOrder = 10;
  let extra = 0;
  return {
    token,
    spin(rad: number) {
      extra = rad;
    },
    update(t: number) {
      pivot.rotation.y = (STILL ? 0.5 : t * 0.9) + extra;
    },
  };
}
