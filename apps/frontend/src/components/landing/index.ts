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
 *        the "Works with" marks (now the scattering row in ScatterGrow, no customer logos).
 *  R4  brief: Linear "Issue tracking without the noise" (that shot is behind pin/183873597282670958;
 *      pin/151855818681736612 is the Mercury hero, used only for its gradient-faded second line)
 *      → `Features`: copy column + 2×2 points beside the product, sides alternate (widgets: R21/R11);
 *        `Numbers`: big numbers with tiny captions (real sample-vault numbers, no quote).
 *  (R5 / R12 drove the old `Pillars` panels; removed in the sixth pass, the findings wheel and
 *      'How Luora works' carry the same run / coverage / findings data.)
 *   R13 ZERO (user ref): full-bleed closing scene, glowing curved horizon, hairlines with '+' markers;
 *   R14 SurveilTrack (user ref): that horizon is a dark city with lit roofs, windows, square markers
 *      → `Finale` (CityHorizon.tsx + FinalCta + Footer).
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
 * Fourth pass (2026-10-09, "feels like nothing changed": structural change), pins studied 2026-10-09:
 *  R22 pin/774124931585644 (Valley Engine) — exploded iso stack of slab plates over dashed guides, the
 *      active plate lit, a dashed leader with a square terminal out to a note with a vertical accent
 *      bar on the column divider; numbered cells with small icons on the left; hairline grid frame
 *      → `Features` is now 'How Luora works' (HowItWorks.tsx + IsoStack.tsx): sticky stage, four
 *        scroll steps (Run / Trace / Lab / Findings & coverage), the open step lights its plate.
 *  R23 pin/246501779599303620 (Dante) — tight vertical stack of rounded tiles with corner dots and
 *      side vents, copy cells aligned left and right, small square markers on the dividers
 *      → plate anatomy in IsoStack, the step cells and their divider markers.
 *  R24 pin/152207662382464793 (TechCrunch layered stack) — a texture per layer, bullet labels on
 *      short lines → each plate top drawn from the sample run, idle plates keep a '— • 0n' label.
 *  R25 pin/700661654577045083 (S7 Interface Module 01) — huge index number → faint '01'..'04'.
 *  R26 pin/3870349674475850 (Alfred workflow editor) — the product as a big, crisp, turned and
 *      tilted close-up bleeding off the frame → `ProductTabs`: the app's own Lab contract graph,
 *      TraceRow, FlowView, MapView and FindingsTab rendered live, no screenshots; R20's flat frame
 *      and edge beam are gone.
 *
 * Fifth pass (2026-10-09, Compare + Statement restaged), pins studied 2026-10-09:
 *  R27 pin/36028865763636582 (Ageeva "A card with features you won't find anywhere else") — the
 *      product column a raised, lighter rounded card standing above a flat table, checks in circles
 *      → `Compare`: the Luora column is one graphite card with a soft white glow over every row.
 *  R28 pin/175218241748813574 (Ortocosmos "Competitor analysis") — '№ / Subject / About' over a
 *      hairline, '[003]' index, compact table hung from the Subject column → `Compare` header.
 *  R29 pin/36028865764245218 (Ageeva "Constructor vs Legacy vs Building In-House") — every cell a
 *      short full sentence behind a leading icon → `Compare` cells; ✕ (muted) where the CLIs have nothing.
 *  R30 pin/707065210234626460 ("Design Philosophy") — hairline, numbered lines in a gutter, the active
 *      number circled by hand → `Statement` lists (01–03, hover circles the number).
 *  R31 pin/11962755257568023 ("What we do") — big title over a full-width hairline, tiny labels, one
 *      statement line, a round action on the right → `Statement` head + the Trace / Lab / Findings pill.
 *  R32 pin/65372632087024928 ("Our Approach: Simplicity ⇄ Efficiency") — two large thin circles, ⇄
 *      between, a word in each, icon badges on the outlines → `Statement` 'Reads ⇄ Never' (replaces
 *      the R6 radar and the two cards).
 *
 * Sixth pass (2026-10-09, "make it flow like geniestudio.app — yang penting nyambung"), Genie studied
 * by scrolling it top to bottom: Lenis + GSAP ScrollTrigger, three pinned scrubbed stages, a
 * background that never cuts. Same dark graphite look, same content and data; only the staging.
 *  Section (file)                         → Genie pattern
 *  SmoothScroll + .lp-backdrop (motion)   → Lenis smooth scroll on the GSAP ticker; one fixed
 *                                           background whose tone drifts per section (data-tone)
 *  Hero (Haze.tsx HeroExit)               → the hero swallowed by clouds rising from below: a
 *                                           graphite haze + perspective grid climbs over it
 *  Product (ScatterGrow.tsx, pinned)      → row of 5 round icons scatters, a tiny square in the
 *                                           centre grows into the app mockup (the live ProductTabs)
 *  Run (RunSentence.tsx, pinned)          → 'You can [+ Create] with one click', button inside the
 *                                           sentence, tiles around it (Run pill, scenario cards)
 *  BigWords ('Trace' / 'Test' / 'Triage') → 'Create' / 'Like' / 'Magic', letters dropping in one
 *                                           by one, mascots beside them (icon badges)
 *  Features ('How Luora works')           → pinned + scrubbed since the seventh pass (below)
 *  Findings (FindingsWheel.tsx, pinned)   → arc of style cards turning like a wheel, 'Hover to …'
 *  Tests (TestDrift.tsx)                  → testimonial rows drifting sideways (real test names,
 *                                           no quotes)
 *  Bento / Ask / Compare / Statement      → bento + scrubbed fade-and-lift entrances (Reveal);
 *                                           Compare sinks back under Statement (Exit)
 *  Finale (Haze.tsx FinaleRise)           → footer closed by clouds rising again: the city rises
 * Phones (<768px) and reduced motion: no pins, static readable layout (STAGE_MQ, landing.css).
 *
 * Seventh pass (2026-10-09, "make it feel Awwwards-level"). Genie re-studied by scrolling it top to
 * bottom; Pinterest pins studied 2026-10-09 (id.pinterest.com: 'awwwards dark landing page',
 * 'awwwards site of the day dark saas', 'scroll storytelling website dark', 'awwwards dark
 * comparison table landing', 'awwwards dark ai assistant code editor ui'):
 *  P1 pin/120823202500504610 ("Insights that actually tell you something") — monochrome objects lit
 *     from above inside dark rounded shells, a faint halo → the tools row marks (.lp-mark).
 *  P2 pin/523191681737169397 (Lore "01 Write / 02 Generate / 03 Share") — equal step cards, dim
 *     index + bright name, the mini UI whole inside a nested inner card, two-line caption
 *     → `Bento` card anatomy; the How Luora works index + step name.
 *  P3 pin/4362930885208241 (Deerflow AIoT dashboard) — equal-height tiles, a small index/title row,
 *     the instrument centred with air around it, a lit edge → `Bento` grid + hover edge.
 *  P4 pin/449163762860877017 ("Pricing page with comparison table") — quiet rows with air, values
 *     larger than the row labels → `Compare` type scale and spacing.
 *  P5 pin/30047522509933052 ("Code / Design / Writing / Building") — one composed monochrome object
 *     per tile, nothing bleeding off → live, fitted mini UIs in `Bento` (BentoMini.tsx).
 *  P6 pin/36169603254422786 ("AI Assistant - SaaS & UX UI Dashboard Design") — near-black panel,
 *     one soft beam from the top, glassy prompt box, chips → `Ask` window (.lp-askwin, .lp-glass).
 *  Section (file)                         → reference
 *  Tools row (Hero Product, ScatterGrow)  → Foundry, Solidity, Ethereum only (Slither/Aderyn
 *                                           logos removed); P1 marks; Genie scatter → grow kept
 *  How Luora works (HowItWorks, IsoStack) → Genie pinned scrubbed scene: plates assemble from a
 *                                           slab, swap note + widget in place (rise + blur),
 *                                           close up at the end; R25 + P2 odometer index;
 *                                           R22's boxed frame/grid removed for open space
 *  Bento (Bento, BentoMini)               → P2 / P3 / P5 cards; Genie "There's more" lift on
 *                                           hover; Reveal tilt = scrubbed staggered rise
 *  Ask (AskDemo)                          → P6 window; answers always render whole (CSS stagger
 *                                           replaces the interval that stalled at 'Checklist')
 *  Compare (Closing, CompareStage)        → P4 rows; Genie pricing card rising into place: the
 *                                           Luora card slides up, rows reveal one by one
 *
 * Eighth pass (2026-10-09, 'How Luora works' restaged), pins from the Pinterest search 'winning
 * awward website', picked for fit (dark / technical, explains steps), IsoStack removed:
 *  H1 pin/5629568280219721 (PlayerZero) — core tile, wires to labelled pills → step inputs / outputs
 *  H2 pin/436497388907405556 (ONYX 'Our Process') — masked rising index, panel over panel → the wipe
 *  H3 pin/3307399722549125 (Lumina) — one lit hairline between blocks → the edge riding the wipe
 *  H4 pin/5207355814660740 (GRFN 'How it works' 1 → 2 → 3) → the circled step rail (HowItWorks.tsx)
 *
 * Product shots in public/landing/ (b-*.webp, Bento) are real captures of /trace and /atlas from a
 * local `node luora-export.mjs` run, never mock UI; the hero and 'How Luora works' render the app live. Colour stays per DESIGN.md: grey/white,
 * red only on findings.
 */

export { Ask } from "./Ask";
export { Bento } from "./Bento";
export { BigWords } from "./BigWords";
export { Compare, Faq, FinalCta, Finale, Footer, Statement } from "./Closing";
export { Features } from "./Features";
export { Hero, Product } from "./Hero";
export { SmoothScroll } from "./motion";
export { Findings, Run, Tests } from "./Stages";
