/**
 * SVG <defs> for the graphite card gradients (DESIGN.md "Cards"), so SVG views can use
 * `fill: url(#g-card)` / `url(#g-inner)` like the HTML `bg-card-grad` / `bg-inner-grad`.
 * Static ids keep it SSR-safe; only one atlas view renders at a time.
 */
export function CardGradients() {
  return (
    <defs>
      <linearGradient id="g-card" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2b2b2f" />
        <stop offset="1" stopColor="#1e1e21" />
      </linearGradient>
      <linearGradient id="g-inner" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#262629" />
        <stop offset="1" stopColor="#1b1b1e" />
      </linearGradient>
    </defs>
  );
}
