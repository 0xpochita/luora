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
 *  (R6 drove `Statement`, "Built for auditors. Not for attackers."; removed in the eighth pass, the
 *      defensive stance stays in the footer tagline and the FAQ.)
 *  (R7, the tilted Linear-style hero capture, was dropped in the third pass: it read muddy.)
 *
 *
 * Second pass (2026-10-08, "too empty, add motion"), references I searched myself:
 *  R8  onorca.dev — tabbed product demo under the hero with a progress pill, a bento of many small
 *      real-UI capability cards, a comparison table, FAQ, closing CTA card, column footer
 *      → `ProductTabs` (Lab / Trace / Flow / Map / Findings), hero `Terminal` (the real export
 *        output, typed in), `Compare`, `Faq`, `FinalCta`, `Footer` (its bento drove `Bento`,
 *        removed in the eighth pass).
 *  (R9 Nrok / R10 bento proof drove the old stats section; replaced at the user's request by `Ask`:
 *      R4 copy + real UI, R15 ComfyUI-style glassy prompt dock, answers from the app's aiAnswer.)
 *  R12 pin/15270086238695545 ("Scale from a startup…") — bold lead + muted continuation captions
 *      → `Features` copy.
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
 * Fifth pass (2026-10-09, Compare + Statement restaged; Statement and R30–R32 removed in the eighth
 * pass), pins studied 2026-10-09:
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
 *                                           by one, mascots beside them (icon badges; restaged
 *                                           with product visuals in the eighth pass)
 *  Features ('How Luora works')           → pinned + scrubbed since the seventh pass (below)
 *  Findings (FindingsWheel.tsx, pinned)   → arc of style cards turning like a wheel, 'Hover to …'
 *  Tests (TestDrift.tsx)                  → testimonial rows drifting sideways (real test names,
 *                                           no quotes)
 *  Ask / Compare / Faq                    → scrubbed fade-and-lift entrances (Reveal); Compare
 *                                           sinks back (Exit) as the FAQ rises over it
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
 *     → the How Luora works index + step name (and the removed `Bento` cards).
 *  P3 pin/4362930885208241 (Deerflow AIoT dashboard) — equal-height tiles, a small index/title row,
 *     the instrument centred with air around it, a lit edge → the removed `Bento` grid.
 *  P4 pin/449163762860877017 ("Pricing page with comparison table") — quiet rows with air, values
 *     larger than the row labels → `Compare` type scale and spacing.
 *  P5 pin/30047522509933052 ("Code / Design / Writing / Building") — one composed monochrome object
 *     per tile, nothing bleeding off → live, fitted mini UIs (now WordVisuals.tsx).
 *  P6 pin/36169603254422786 ("AI Assistant - SaaS & UX UI Dashboard Design") — near-black panel,
 *     one soft beam from the top, glassy prompt box, chips → the old `Ask` window
 *     (replaced in the eleventh pass, below).
 *  Section (file)                         → reference
 *  Tools row (Hero Product, ScatterGrow)  → Foundry, Solidity, Ethereum only (Slither/Aderyn
 *                                           logos removed); P1 marks; Genie scatter → grow kept
 *  How Luora works (HowItWorks, IsoStack) → Genie pinned scrubbed scene: plates assemble from a
 *                                           slab, swap note + widget in place (rise + blur),
 *                                           close up at the end; R25 + P2 odometer index;
 *                                           R22's boxed frame/grid removed for open space
 *  Ask (AskDemo)                          → P6 window; answers always render whole (CSS stagger
 *                                           replaces the interval that stalled at 'Checklist')
  *  Compare (Closing, CompareTable)        → P4 rows; Genie pricing card rising into place: the
 *                                           Luora card slides up, rows reveal one by one
 *
 *
 * Eighth pass (2026-10-09, "the giant words sit alone on an empty black screen"). Genie's 'Create /
 * Like / Magic' re-read with Awwwards staging: the word stays big but shares its screen with the
 * product doing it. Bento and Statement are removed (their content now lives in the words), so the
 * story runs Tests → Ask → Compare → Faq → Finale with no seam (Faq carries its own data-tone).
 *  Section (file)                         → reference
 *  Words (Stages.tsx Words → BigWords,    → Genie 'Create / Like / Magic': letters drop in one by
 *         WordVisuals.tsx)                  one; the visual scrubs in (rise, 0.96 → 1, tilted back
 *                                           → flat) and the icon badges orbit its corners.
 *                                           Trace = word left, decoded frames of the oracle-reading
 *                                           deposit in test_depositThenWithdraw + their call graph
 *                                           (GraphNode); Test = word right, the Lab scenario
 *                                           (Actor → Call → Expect revert → Assert, scenarioDemo)
 *                                           + the exported .t.sol (foundryTest, setUp folded);
 *                                           Triage = word on top sliding up as the visual rises:
 *                                           Findings on the line (source, red flagged lines),
 *                                           the triage table (FindingTriage, read only), Flow
 *                                           replay lanes, ⌘K search. Phones stack word, line,
 *                                           visual; each panel fits its column (never clipped).
 *
 * Ninth pass (2026-10-09, 'How Luora works' restaged), pins from the Pinterest search 'winning
 * awward website', picked for fit (dark / technical, explains steps), IsoStack removed:
 *  H1 pin/5629568280219721 (PlayerZero) — core tile, wires to labelled pills → step inputs / outputs
 *  H2 pin/436497388907405556 (ONYX 'Our Process') — masked rising index, panel over panel → the wipe
 *  H3 pin/3307399722549125 (Lumina) — one lit hairline between blocks → the edge riding the wipe
 *  H4 pin/5207355814660740 (GRFN 'How it works' 1 → 2 → 3) → the circled step rail (HowItWorks.tsx)
 *
 * Tenth pass (2026-10-09, 'Works with' read as three circles on an empty screen), pins from
 * id.pinterest.com ('integrations hub orbit website dark', 'dark website background grid texture'):
 *  W1 pin/56858014040806247 (Integrations Wheel) — rings around one core, tools on the orbit
 *  W2 pin/1076360379685275188 (MagicWand) — tick ring, one lit arc, short labels on the leaders
 *  W3 pin/1150880879804919385 (zsearch) — round marks wired into one lit-cornered square
 *  B1 pin/23432860626141831 / B2 pin/70437490488374 — graphite grid under a soft light, lit dots
 *  → ScatterGrow.tsx + hub.css: Foundry / Solidity / Ethereum on arms wired into the Luora core,
 *    what each hands over on its wire (forge test -vvvv · forge coverage, your own ABIs, calls &
 *    events · one local run), packets riding in, masked grid behind; the hub comes apart into the
 *    scatter and the core lands where the square grows into the Lab.
 *
 * Eleventh pass (2026-10-09, 'Ask' restaged), geniestudio.app studied in the browser:
 *  Genie: Prompts in. Magic out. carousel + prompt — a row of cards, the centre one larger, lifted
 *  and opaque, the sides smaller and fading to the edges, over one big rounded prompt box (prompt
 *  in large type, credits meta bottom-left, sparkle + white '+ Create' pill bottom-right) that
 *  always shows the centre card's prompt, typed in as the row moves
 *  → `Ask` (AskDemo.tsx + ask.css): one card per piece of the sample contract (five entry points,
 *    the busiest slot and external call: 3–6 lines, red ▲ on flagged lines), the question about the
 *    centre card in big type ('What should I check in harvest() on line 90?'), 'L90 · harvest() ·
 *    4 findings' bottom-left, Explain / What to check / Write a test bottom-right (the active one
 *    the white pill), the answer (aiAnswer, CHECKLIST, findings) in an inner card below. One rAF
 *    driver eases the row on transform + opacity; click, drag / swipe, ←/→, auto-advance paused on
 *    hover, focus, off screen and reduced motion. The R16–R19 / P6 editor window is gone.
 *
 * Twelfth pass (2026-10-09, Compare restaged: "too boxy and flat"), pins from the Pinterest search
 * 'winning awward website', picked for fit (contrast / editorial, dark or monochrome-able):
 *  C1 pin/677228862766302378 (Award OR Free, 'The bill is the bug') — what everyone else does in
 *     faded type over what they do in bright type → each row's copy: the CLI line fades, Luora lights
 *  C2 pin/3307399721419408 ('Step Through. Work Smarter.') — two dark masses, one lit gap, big
 *     two-tone title bottom-left with the note at its foot → the seam between the two worlds and
 *     the editorial 'Same run, / read differently.' title (no №/Subject/About table)
 *  C3 pin/281543726069847 (EqtyLab 'Verify to Trust AI') — thin curved light converging under the
 *     product → the arcs on the raw side, rounded shells instead of hairlines
 *  → Compare (Closing.tsx, CompareTable.tsx, CompareFragments.tsx, compare-data.ts, compare.css):
 *    eight rows, each the raw text forge / the analyzer CLIs print beside the same run as Luora
 *    draws it (decoded frames, source lines, slot reads / writes, call graph, the Slither + Aderyn
 *    reports merged, triage, coverage untested first, the Lab scenario and its .t.sol); the Luora
 *    side wipes open over the raw one with the scroll, the lit seam riding its edge.

 *
 * Thirteenth pass (2026-10-09, hero restaged: "busy, evenly lit, nodes scattered, terminal an
 * afterthought"), pins from the Pinterest search 'award winning website hero' (Hero refine),
 * picked for fit (dark, technical, one light source; fashion / colourful 3D / photo heroes rejected):
 *  HA pin/760404718381966789 (Triopixels 'Build sites that converts') — pure black, glass pill nav,
 *     hairline frame with '+' ends, two-tone headline, ONE shaft of light → nav, beam, h1 tones
 *  HB pin/1125968725514399 (Huly 'Everything App') — the beam lands on the product's top edge
 *     → the horizon on the terminal's top edge; the terminal moves up into the first screen
 *  HC pin/4081455908271646 (Ascend 'Powering the next generation') — monochrome, one big lit
 *     object owns the hero → the brand mark (redrawn SVG, flagged square) lit from above + halo
 *  HD pin/3307399722549125 (Lumina) — mark tile at the centre wired to its pieces, a hairline
 *     dropping into the next section → nodes wired out of the mark's rays (the finding off its
 *     flagged square), the hairline into the Works-with hub (its grain was tried and dropped: an
 *     feTurbulence background cost ~300 ms of mobile LCP)
 *  → Hero (Hero.tsx + hero.css): beam ignites → mark lit → flag lands → lines rise from masks →
 *    wires grow out of the mark → horizon draws → the real export types itself.
 *
 * Fifteenth pass (2026-10-10, "belajar dari awwwards"), Site of the Day / Honorable Mention
 * winners browsed at awwwards.com (filter: SOTD, dark palette), picked for fit (dark developer /
 * security tools; agency, fashion and 3D-scene heroes rejected):
 *  HF awwwards.com/sites/cerebrium (SOTD, cerebrium.ai) — editorial split: one huge light
 *     headline bottom-left, copy + two CTAs sitting at its baseline on the right, the visual
 *     bleeding behind the right half, a hairline + stack strip under it
 *     → the three-line h1 with 'actually does.' dimmed, copy + CTAs in the right column,
 *       the brand mark big and lit behind them
 *  HG awwwards.com/sites/aspen-search (SOTD, aspensearch.com) — strict hairline grid, a mono
 *     metadata rail on the top edge (time · place), halftone dot fields, huge type
 *     → the rail (file · solc · forge · tests · findings, read from the run), the column
 *       guides, the dot field the mark sits in
 *  HH awwwards.com/sites/evervault (HM, evervault.com) — the product right under the headline:
 *     a capabilities panel with 'ALWAYS ON' pills beside a ledger with status badges and a
 *     totals footer
 *     → the deck: Decoded trace / Contract graph / Findings merged / Coverage beside the
 *       sample's real findings (id, title, every tool that reported it, severity, lines) and
 *       the totals (findings, high, line coverage)
 *
 * Sixteenth pass (2026-10-10, "terlalu banyak komponen di hero, saya butuh yg minimalis"):
 *  HI pin/933300722780733209 (ZERO by Freede, the shot R13's closing scene came from) — wordmark
 *     + one pill, a two-line centred headline with the second line tinted, one subline, one
 *     App-Store-style button (icon, small label over the big one), two hairlines dropping from
 *     the top edge onto the headline, two rules running out from the button with small diamonds,
 *     a curved horizon lit from behind, the product peeking over its rim. Nothing else.
 *     → Hero: the same five pieces and nothing more. 'actually does.' in silver, the Lab button
 *       with the brand tile as its icon, the horizon an ellipse with a bright gradient rim and a
 *       bloom over a dawn glow (a brand tile standing on the rim, ZERO's phone, was tried and
 *       dropped as one object too many). Rail, deck, pipeline and the big mark are gone; the haze
 *       now starts below the rim and the Works-with hub is the first product view.
 *
 * Seventeenth pass (2026-10-10, "ganti lagi pake referensi ini"):
 *  HJ pin/1148699448726643412 (VEX, a MotionSites AI prompt) — a black sky: soft light pooled
 *     bottom-left (a lit limb) and top-right (diffuse), a fine star field, one bright curved
 *     glint on the right; a notched hairline frame hanging off the nav's corners and faint guide
 *     lines down the left; a two-line regular-weight white headline, one subline, a white
 *     button beside an outlined one (small radius, not pills); a hairline chip at the bottom
 *     centre ('Investing. Building. Advisory.') with thin lines falling from behind it.
 *     → Hero: the sky as three radial gradients, a deterministic 140-star path, the glint as a
 *       gradient-stroked curve with a soft copy under it; the notches as two tiny SVGs under the
 *       HA nav; the same headline / subline / two buttons; the chip reads 'Trace. Graph.
 *       Triage.' — the three product views — with four lines running to the foot. ZERO's
 *       horizon, hairline braces and sparks are gone.
 *
 * No screenshots: every product view on the page is the app's own component rendered live on the
 * sample run (built near the screen only, Lazy). Colour stays per DESIGN.md: grey/white, red only
 * on findings.
 */

export { Ask } from "./Ask";
export { Compare, Faq, FinalCta, Finale, Footer } from "./Closing";
export { Features } from "./Features";
export { Hero, Product } from "./Hero";
export { SmoothScroll } from "./motion";
export { Findings, Run, Tests, Words } from "./Stages";
