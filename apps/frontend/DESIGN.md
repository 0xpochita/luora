# Luora design system

Monochrome node editor (ComfyUI-like): a near-black canvas with a faint dot grid, **graphite gradient
cards** floating above it, soft white for whatever is active or primary, and colour used **only as tiny
semantic dots**. No coloured headers, bars, chips or wires anywhere.

Source of truth: `src/app/globals.css` (tokens + utilities) and `src/components/ui` (primitives).
If you need something that isn't covered there, add it there first. Don't invent one-off styles inside a feature.

## Tokens

Use the Tailwind names (`bg-raised`, `text-muted` …), or `var(--raised)` in feature CSS.

### Surfaces

| Token | Value | Use |
|---|---|---|
| `canvas` | `#0e0e10` | App background, under everything |
| `dot` | `#232327` | Dot-grid dots (22px grid) |
| `card-top` → `card-bot` | `#2b2b2f` → `#1e1e21` | Outer card gradient (`bg-card-grad`, SVG `url(#g-card)`) |
| `inner-top` → `inner-bot` | `#262629` → `#1b1b1e` | Nested inner card gradient (`bg-inner-grad`, SVG `url(#g-inner)`) |
| `surface` | `#1e1e21` | Flat fallback where a gradient can't be used |
| `raised` | `#252528` | Idle tiles, chips, badges sitting on a card |
| `hover` | `#2e2e33` | Hover of `raised` |
| `inset` | `#1c1c1f` | Select / control tiles, tracks |
| `field` | `#1a1a1d` | Text inputs |
| `border` | `rgba(255,255,255,.07)` | The card hairline (outer and inner card) |
| `border-strong` | `rgba(255,255,255,.13)` | Hovered / selected card or field |

### Text

| Token | Value | Use |
|---|---|---|
| `fg` | `#e6e6e8` | Titles, primary text |
| `text` | `#dcdcde` | Inner-card header (kind row), chip text |
| `body` | `#b9b9be` | Body text in cards (13px, line-height 1.5) |
| `port` | `#a3a3a9` | Port labels (12.5px) |
| `muted` | `#9b9ba1` | Control labels, secondary text |
| `dim` | `#6f6f76` | Hints, placeholders, corner stats, disabled |
| `primary` / `primary-fg` | `#f4f4f5` / `#0e0e10` | Active / primary tile: soft white fill, near-black text |

### Wires

| Token | Value | Use |
|---|---|---|
| `wire` | `#7d7d84` | Every wire, 1px smooth bezier |
| `wire-on` | `#f4f4f5` | Selected / active path |
| red at 70% | `#f87171` | Finding path (write after external call, revert wire) |

### Semantic dots — the only colour

| Token | Value | Means |
|---|---|---|
| `red` | `#f87171` | Finding, revert, bad, failure. **Only** for bad things |
| `green` | `#4ade80` | Pass, covered, ok, bool check holds |
| `yellow` | `#facc15` | Amount / uint, warning, untested, privileged |
| `blue` | `#60a5fa` | External, address |
| `mint` | `#86efac` | Background of the one accent action pill (Run) |
| `pink` + `blue` | | Very soft blurred glow (`glow-top`) behind the one selected / running card |

Everything else — function, slot, event, logic, access, call, write categories — is told apart by a
**monochrome icon + label**, never by colour. Status tones (`Tone` in `components/ui/tone.ts`):
`neutral`, `ok`, `bad`, `warn`, `info`, `solid`; they colour a dot, never a fill.

**Legacy aliases.** `shell panel tray card ink line edge tick soft guide sel accent ok bad` still exist and point
at the new palette. Once nothing references an alias any more, delete it from `globals.css`.

## Radius

| Class | px | For |
|---|---|---|
| `rounded-chip` | 8 | Chips, badges, accent pill, tooltips |
| `rounded-tile` | 10 | Buttons, icon tiles, tabs, select / control tiles |
| `rounded-inner` | 12 | Nested inner card, text inputs |
| `rounded-card` | 18 | Cards, panels, toolbars, docks |

The inner card sits 8px inside the outer card. Never put a sharp corner inside a rounded one.

## Elevation

- Cards: `bg-card-grad`, `border border-border`, `shadow-soft` (`0 10px 30px rgba(0,0,0,.45)`).
  Floating toolbars, docks, popovers: `shadow-float`.
- The inner card: `bg-inner-grad` with its own faint `border`.
- Separate with gradient contrast and spacing, not 1px lines. Avoid `divide-*` grids of boxes.
- `glow-top` (soft pink/blue blur behind the top edge) only on the **one** selected or running card. Never on lists, docks or toolbars.

## Typography

- **Outfit** (`font-sans`) for all UI, sentence case, letter-spacing 0 or `-0.01em`.
- Sizes **12.5 / 13 / 14 / 15** (`text-ui-xs/sm/md/lg`), weights **400 / 500 only** (no semibold / bold).
  Titles 14px 500 `fg`; body 13px `body`; port labels 12.5px `port`; control labels 13px `muted`.
- **Geist Mono** (`font-mono`) only for code, addresses, hashes, slot numbers and percentages.
- No `uppercase`, no wide `tracking-[…]`, no mono labels.

## Canvas

- The whole app sits on `dot-grid` (22px dots). Pan/zoom canvases keep the `dot-grid` class and set
  `backgroundSize` / `backgroundPosition` inline from the view transform.
- Content floats on the canvas: give panels a margin from the edges and let the dots show between them.
- Floating chrome keeps 16px from the canvas edge and 16px from each other. Hints live in a status corner
  (bottom-left), never on top of cards; zoom stacks get their own gutter.

## Controls

- **Tile** (`tile(on)`): one rounded square or pill. Active is `bg-primary text-primary-fg`, idle `bg-raised text-muted`, hover `bg-hover`.
- **Tabs / TileGroup**: separate tiles with `gap-1.5`, no container, no underline, no folder tabs.
- **SegmentedControl**: a compact choice inside one `inset` tray; the active segment is a white tile.
- **Button**: `primary` (soft white), `accent` (pastel mint pill, near-black text, sparkle icon — the ONE main action, e.g. Run),
  `secondary` (graphite, default), `ghost`. At most one `primary` or `accent` per area.
- **Control row**: label left (`muted`, 13px), control right as a dark inset tile (`inset`, radius 10, 36px tall, value `#f0f0f2`, ▾ caret via `select-caret`).
  Steppers are three separate tiles (◀ 30 ▶).
- **Input**: `field` fill, radius 12, placeholder `dim`, white-ish focus border (no coloured rings).
- **Chip**: graphite pill; the tone colours only its `dot`. **ToggleChip**: filter pill with a white dot when on.
- **Meter**: monochrome light-grey fill on a dark track; pass `tone="text-red"` only for bad values.
- **Tooltip**, **KV**, **IconButton** (always pass `label`).

### When white is allowed

Exactly two jobs: **active** (the selected tab, tool or view) and **primary** (the single main action).
Never for decoration, headings or large areas.

## Cards (`Panel` / `Card`)

```
 ● Title                     aside      ← title row: white dot + 14px 500 title (inside, or above with titleAbove)
╭──────────────────────────────────╮
│ ╭──────────────────────────────╮ │    ← outer: bg-card-grad, radius 18, border, shadow-soft
│ │  inner card                  │ │    ← inner: bg-inner-grad, 8px in, radius 12, faint border
│ ╰──────────────────────────────╯ │
╰──────────────────────────────────╯
```

`Panel` props: `label`, `aside`, `dot?: Tone` (semantic dot instead of the white one), `titleAbove`, `inset`, `glow`.

### Node card anatomy (Lab, graph, flow nodes)

- **Title outside, above the card**: white dot + title (14px 500 `fg`), 10px above the card. Badges
  (`▲1 H`, `82%`) right-aligned in the same row, 8px apart: graphite pills with a semantic dot.
- **Inner header**: monochrome kind icon + label (14px `text`) — "Function", "Storage slot", "External contract", "Event"…
- **Port rows**: 32px tall, `label ●` with the label 12.5px `port`, 12px between label and dot. Inputs in the left
  column, outputs in the right, ≥24px apart; long names ellipsize with a tooltip.
- **Port dots** are 7px and are the only colour on a card: blue = address / external, yellow = amount,
  green = bool / pass, red = revert / finding. State, events and execution order are grey.
- **Wires**: 1px `wire` beziers; selected / active `wire-on`; finding path red at 70%. Never coloured by type.
- Selected node: `border-strong` + `shadow-float` + `glow-top`. Never a white fill on a node.
- Lab layout (`utils/lab-graph.ts`): ≥160px between columns (functions → slots → externals/events), 44px from a
  card's bottom to the next title, every slot in the slots column.

## Floating chrome

- **Toolbar**: graphite gradient container (`rounded-card`, `p-1.5`, `gap-1.5`) holding tiles or IconButtons.
- **FloatingDock**: graphite bottom-centre card holding inputs and a row of tiles.
- Small grey stats (counts, zoom %, hints) sit in canvas corners as `dim` 12.5px text with no box.
- App header: logo tile, `luora` wordmark and route tiles on the left; graphite status chips with dots on the right.

## Do / don't

Do
- Use the primitives from `@/components/ui`. Extend them rather than re-styling locally.
- Graphite gradients for cards, nested radii (18 outer → 12 inner, 8px inset).
- Tell categories apart with monochrome icons + labels.
- Colour = tiny semantic dots only (red bad, green ok, yellow amount / warning, blue external).

Don't
- **No coloured headers, bars, chips, meters or wires.** Colour = tiny semantic dots only.
- No category colours (function / slot / event / logic all monochrome).
- No violet, no coloured focus rings, no coloured glows except the one `glow-top`.
- No chamfers / clip-path corners, no corner brackets, no uppercase mono letter-spaced labels.
- No underline nav and no folder tabs.
- No hard 1px boxes around everything, no grid-line backgrounds, no striped bars.
- No white fills except active / primary. No weights above 500.
- No new colours outside the token table.
