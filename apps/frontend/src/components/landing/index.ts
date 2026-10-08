/*
 * Landing page (/) — every section maps to a researched reference. Pins studied 2026-10-08.
 * Note: the pin URLs resolve to slightly different shots than their nicknames; the design brief's
 * description of each reference is what was followed, and the pin actually behind each URL is noted.
 *
 *  R1  pin/811562795397532634 (brief: Fxlogy; pin shows the "One-click for Asset Defense" frame)
 *      → Nav: centred pill group with a tiny active pill, white CTA pill top-right.
 *      → Hero: one soft monochrome light beam from the top (lp-beam), cross markers on the hairlines,
 *        the product living at the bottom of the hero, vertical "Scroll to explore" on the right edge.
 *  R2  pin/811562795397532630 (Golden Suisse) — pure black, thin white starburst with hairline
 *      perspective lines converging on it, light-weight sans heading, extreme restraint
 *      → Hero backdrop (Hero.tsx `Backdrop`), h1 in Outfit 300.
 *  R3  pin/3659243441333295 ("One-click for Asset Defense") — eyebrow pill above the H1, white +
 *      dark pill CTAs, small orbiting labelled nodes on thin lines around the headline, logo strip
 *      → Hero eyebrow + CTAs, `Orbits` (deposit(), slot 5 · totalShares, IOracle, ▲ finding),
 *        `WorksWith` (text wordmarks of what Luora really reads, no customer logos).
 *  R4  brief: Linear "Issue tracking without the noise" (that shot is behind pin/183873597282670958;
 *      pin/151855818681736612 is the Mercury hero, used only for its gradient-faded second line)
 *      → `Features`: copy column + 2×2 points beside the product, sides alternate (widgets: R21/R11);
 *        `Numbers`: big numbers with tiny captions (real sample-vault numbers, no quote).
 *  R5  pin/120823202500504610 ("Insights that actually — tell you something")
 *      → `Pillars` heading: one italic serif phrase (Instrument Serif, that phrase only);
 *   R12 QClay (pin 852728510751497559): dot-matrix panels, '+WORD+WORD' mono titles, dot compass,
 *   R13 ZERO (user ref): full-bleed closing scene, glowing curved horizon, hairlines with '+' markers;
 *   R14 SurveilTrack (user ref): that horizon is a dark city with lit roofs, windows, square markers
 *      → `Finale` (CityHorizon.tsx + FinalCta + Footer).
 *      mono key-value footers → `Pillars` panels (Pillars.tsx), all drawn from the sample run.
 *        three cards in one rounded frame with monochrome isometric wireframes drawn in SVG.
 *  R6  brief: boutique cyber security statement (huge centred line on black, segmented pill)
 *      → `Statement`: "Built for auditors. Not for attackers." + Trace / Lab / Findings pill.
 *  (R7, the tilted Linear-style hero capture, was dropped in the third pass: it read muddy.)
 *
 *
 * Second pass (2026-10-08, "too empty, add motion"), references I searched myself:
 *  R8  onorca.dev — tabbed product demo under the hero with a progress pill, a bento of many small
 *      real-UI capability cards, a comparison table, FAQ, closing CTA card, column footer
 *      → `ProductTabs` (Lab / Trace / Flow / Map / Findings), hero `Terminal` (the real export
 *        output, typed in), `Bento`, `Compare`, `Faq`, `FinalCta`, `Footer`.
 *  (R9 Nrok / R10 bento proof drove the old stats section; replaced at the user's request by `Ask`:
 *      R4 copy + real UI, R15 ComfyUI-style glassy prompt dock, answers from the app's aiAnswer.)
 *  R11 pin/15270086238695547 ("Burn out less, build with smart code") — mixed 3+2 bento with mini UI
 *      in each card → `Bento` grid rhythm.
 *  R12 pin/15270086238695545 ("Scale from a startup…") — bold lead + muted continuation captions
 *      → `Bento` and `Features` copy.
 *  Statement radar (hairline rings, slow sweep, one red blip) follows the concentric-ring security
 *  hero seen in the same Pinterest search, kept monochrome per DESIGN.md.
 *  Motion: words blur in, starburst breathes, packets ride the orbit wires, terminal types, tabs
 *  auto-advance, sections reveal on scroll, numbers count up — all off under prefers-reduced-motion.
 *
 * Third pass (2026-10-08, "blurry hero tabs, random cropped screenshots"):
 *  R20 pin/672232681926990953 (Echo) — product UI crisp and bright right under the headline, one
 *      light beam hitting its top edge, no blur, no overlap
 *      → `ProductTabs` frame: flat (no tilt), one monochrome beam + lit stretch of the top edge,
 *        crossfade where the outgoing view is gone before the incoming one shows.
 *  R16 pin/63543044738210889 (code editor with AI assistance) — one window chrome, three dots + tab
 *      → `Window.tsx`, used by the hero tabs (tab = view name) and the Trace widget (tab = test).
 *  R21 pin/489273947042736110 ("Technical Solutions That Go Beyond Limits") — copy + short checked
 *      bullets + CTA on one side, ONE isolated product widget on the other
 *      → `Features` rows: check bullets, 'Open in the app' link, one widget per feature.
 *  R11 pin/15270086238695547 ("Burn out less, build with smart code") — small, clean, isolated mini-UI
 *      → `FeatureWidgets.tsx`: Trace frames, Lab Actor → Call → Expect revert, Findings filter +
 *        two cards, CoverageSummary — the app's own components / utils on the sample data,
 *        centred on the dot grid, nothing cut off.
 *
 * Product shots in public/landing/ are real captures of /trace and /atlas, never mock UI: hero-*.webp
 * are the bundled sample data (Playwright, content area only, 2×); b-*.webp are from a local
 * `node luora-export.mjs` run. Colour stays per DESIGN.md: grey/white,
 * red only on findings.
 */

export { Ask } from "./Ask";
export { Bento } from "./Bento";
export { Compare, Faq, FinalCta, Finale, Footer, Statement } from "./Closing";
export { Features } from "./Features";
export { Hero, WorksWith } from "./Hero";
export { Pillars } from "./Pillars";
