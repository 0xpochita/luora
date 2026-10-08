# Luora design system

Soft minimalist dark UI, in the style of a node editor: a near-black canvas with a faint dot grid, rounded
surfaces that float above it, solid white for whatever is active or primary, and colour used only for
dots and status. It replaces the old "military HUD" look entirely.

Source of truth: `src/app/globals.css` (tokens + utilities) and `src/components/ui` (primitives).
If you need something that isn't covered there, add it there first. Don't invent one-off styles inside a feature.

## Tokens

Use the Tailwind names (`bg-surface`, `text-muted` …), or `var(--surface)` in feature CSS.

| Token | Value | Use |
|---|---|---|
| `canvas` | `#0d0d0f` | App background, under everything |
| `dot` | `#2a2a2f` | Dot-grid dots |
| `surface` | `#17171a` | Cards, panels, toolbars |
| `raised` | `#1e1e22` | Secondary tiles / buttons, chips, controls sitting on a surface |
| `hover` | `#26262b` | Hover state of `raised` |
| `inset` | `#121214` | Nested inner card, input fields, tracks (meter, segmented tray) |
| `border` | `rgba(255,255,255,.06)` | The only border. Use it rarely |
| `border-strong` | `rgba(255,255,255,.11)` | Hovered field |
| `fg` | `#ececee` | Primary text |
| `muted` | `#8e8e96` | Secondary text, idle tile text |
| `dim` | `#5d5d65` | Hints, corner stats, disabled |
| `primary` / `primary-fg` | `#f4f4f5` / `#0d0d0f` | Active / primary tile: white fill, near-black text |
| `green` | `#4ade80` | Pass, clear, ok |
| `yellow` | `#facc15` | Warn, pending, untested |
| `red` | `#f87171` | Findings, reverts, failures. **Only** for bad things |
| `blue` | `#60a5fa` | Info, external |
| `violet` | `#a78bfa` | Events, focus ring, glow |
| `pink` | `#f472b6` | Glow partner of violet |

Status tones (the `Tone` type in `components/ui/tone.ts`): `neutral`, `ok`, `bad`, `warn`, `info`, `violet`, `solid`.

**Legacy aliases.** `shell panel tray card ink line edge tick soft guide sel accent ok bad` still exist and point
at the new palette, so un-migrated screens keep rendering. When you restyle an area, switch it to the new names.
Once nothing references an alias any more, delete it from `globals.css`.

## Radius

| Class | px | For |
|---|---|---|
| `rounded-chip` | 8 | Chips, pills, small markers, tooltips |
| `rounded-tile` | 11 | Buttons, icon tiles, tabs, inputs |
| `rounded-card` | 16 | Cards, panels, toolbars, docks |
| `rounded-inner` | 11 | Nested inner card (= card 16 − 5px inset) |

For nested shapes, inner radius = outer radius − inset. Never put a sharp corner inside a rounded one.

## Elevation

- Use `shadow-soft` for cards and white tiles, and `shadow-float` for floating toolbars, docks and tooltips.
- Separate things with fill contrast (canvas → surface → raised) and spacing, not 1px lines.
  A card gets at most one `border-border` hairline. Avoid `divide-*` grids of boxes. Use spacing or `inset` blocks instead.
- `glow-border` adds a violet→pink gradient border. It is for the one focused or primary card, or the floating dock. Never use it on lists.

## Typography

- **Outfit** (`font-sans`) for all UI. Use sentence case, regular weight (400), and 500 at most for titles. Body text is 13px. Labels are 12px (`ui-label`). Tiles are 13–14px.
- **Geist Mono** (`font-mono`) only for code, addresses, hashes, selectors, slots, and numbers in tables or stats.
- No `uppercase`, no `tracking-[…]` letter spacing, no mono labels.

## Canvas

- The whole app sits on `dot-grid` (22px dots). Pan/zoom canvases keep the `dot-grid` class and set
  `backgroundSize` / `backgroundPosition` inline from the view transform.
- Content floats on the canvas: give panels a margin from the edges and let the dots show between them.

## Controls

- **Tile** (`tile(on)` from `components/ui`): one rounded square or pill. Active is `bg-primary text-primary-fg`, idle is `bg-raised text-muted` with hover `bg-hover`. Every tab, nav item and icon toggle is built on it.
- **Tabs / TileGroup**: separate tiles with a `gap-1.5`, no container, no underline, no folder tabs. Use them for route nav (Trace / Atlas), sub-views (Lab / Explorer / Map / Flow) and file tabs (`size="sm"`).
- **SegmentedControl**: a compact choice inside one `inset` tray. The active segment is a white tile.
- **Button**: `primary` (white, at most **one per area**: the action that matters most, like "Share" in the reference), `secondary` (dark grey, the default), and `ghost`.
- **IconButton**: a rounded square (32/36px). `active` makes it white. Always pass `label` (used for aria-label and title).
- **Chip**: a soft pill on a tinted fill, with an optional tone `dot`. **ToggleChip**: a filter pill. When on, the dot is lit and the text is bright.
- **Input / Select**: `inset` fill, tile radius, violet focus ring.
- **Tooltip**: CSS hover/focus bubble (`side` top / bottom / left / right).
- **KV**: sans key on the left, mono value on the right. **Meter**: rounded track with a `bg-current` fill (pass the colour via `tone`).

### When white is allowed

Use white for exactly two jobs: **active** (the selected tab, tool or view) and **primary** (the single main action).
Never use it for decoration, headings or large areas. If two white things compete in one toolbar, one of them is wrong.

## Cards (`Panel` / `Card`)

```
 ● Title                     aside      ← header (inside the card, or above it with titleAbove)
╭──────────────────────────────────╮
│ ╭──────────────────────────────╮ │    ← outer card: surface, rounded-card, shadow-soft
│ │  inner card (inset)          │ │    ← inner card: inset fill, 5px in, rounded-inner
│ ╰──────────────────────────────╯ │
╰──────────────────────────────────╯
```

`Panel` takes these props: `label`, `aside`, `dot?: Tone` (status dot before the title), `titleAbove`, `inset` (nested inner card) and `glow`.

### Node card anatomy (Lab, graph, flow nodes)

- The title and status dot sit **above** the card, in small `fg` text. Corner stats are `dim` mono (gas, %, slot).
- The body is an outer `surface` card with a nested `inset` inner card holding the rows.
- Ports are 8px round dots coloured by type: yellow = input / caller, green = state / ok, red = finding / revert,
  blue = external, violet = event. Put them on the card edge.
- Wires are thin (1–1.5px), grey (`#3a3a40`), and smooth beziers. Highlight the selected path with `fg` or the port colour, never with glow.
- Selected node: a `border-strong` hairline plus `shadow-float`, or `glow-border` for the single focused one. Never use a white fill on a node.

## Floating chrome

- **Toolbar**: a floating `surface/90` blurred container (`rounded-card`, `p-1.5`, `gap-1.5`) holding tiles or IconButtons. On canvases, put a
  vertical one on the right edge (+, −, fit, eye, layers) and a horizontal one top-left for view controls.
- **FloatingDock**: a glassy bottom-centre card with `glow-border`, holding a text area and a row of icon tiles, with the active one white.
- Small grey stats (counts, zoom %, hints) sit in canvas corners as `dim` 12px text with no box.
- App header: the logo tile, the `luora` wordmark and the route tiles on the left, with status chips on the right. Everything floats over the canvas, with no bar background.

## Do / don't

Do
- Use the primitives from `@/components/ui`. Extend them rather than re-styling locally.
- Use rounded corners everywhere, with nested radii that follow `outer − inset`.
- Separate with fill contrast, soft shadows and spacing.
- Write sentence-case labels in Outfit.
- Use colour only on dots, status chips, ports and the glow. Keep red for findings / reverts / bad.

Don't
- **No chamfers / clip-path corners.**
- **No corner brackets.**
- **No uppercase mono letter-spaced labels.**
- No underline nav and no folder tabs.
- No hard 1px boxes around everything, no grid-line backgrounds, no striped bars.
- No white fills for anything except active / primary.
- No new colours outside the token table.
