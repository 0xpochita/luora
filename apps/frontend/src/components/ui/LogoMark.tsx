/* biome-ignore-all lint/performance/noImgElement: tiny static brand assets, no next/image optimisation needed */

/** Brand mark: the Luora starburst on its white rounded tile (public/brand/mark-tile.png). */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/brand/mark-tile.png"
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-tile shadow-soft"
    />
  );
}

/** Full wordmark: starburst + "luora" (public/brand/logo-text.png, white on transparent). */
export function LogoText({ height = 26 }: { height?: number }) {
  return (
    <img
      src="/brand/logo-text.png"
      alt="luora"
      width={Math.round((height * 300) / 96)}
      height={height}
      className="shrink-0"
    />
  );
}
