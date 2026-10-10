# Trace view: UX review and redesign (2026-10-10)

## Who and what for

A smart-contract auditor or bug-bounty hunter reading a Foundry test run. Their jobs on this
page, in order of frequency:

1. Pick a test, read what it called, in order (who called whom, with which values).
2. Jump from a call to the exact source line, and back.
3. Find where and why something reverted.
4. Narrow a long trace to the calls that matter (one contract, one function, one value).
5. Turn what they learnt into a scenario test (Scenario tab).

They read for a long time and switch between trace and source constantly, so the view must
give space to the trace on demand, keep its controls few and unambiguous, and work from the
keyboard.

## Heuristic review of the old screen (Nielsen)

| # | Finding | Heuristic | Severity |
|---|---|---|---|
| 1 | Three fixed columns (tests 272px, trace, source 440px); no way to give the trace the screen | Flexibility & efficiency | High |
| 2 | Filter chips "● Cheatcodes ● Events ● View calls" always show the same white dot: on and off look alike | Visibility of status | High |
| 3 | View tabs, filter chips and file tabs share one tile style: navigation and filtering look the same | Consistency | Medium |
| 4 | The test name appears three times (breadcrumb, eyebrow + title, sidebar); meta chips (Tests / Sources / forge) far from use | Minimalist design | Medium |
| 5 | No search, no depth limit, no keyboard stepping | Efficiency | High |
| 6 | A revert has to be found by scrolling; nothing points to it | Error recognition | High |
| 7 | Source file tabs are cut off ("Solvency.invariant.t.s") | Visibility | Low |
| 8 | The selected call's details (args, return, gas, call site) are only in the row, gone once you scroll | Recognition over recall | Medium |

## References studied

- **Phalcon Explorer** (BlockSec, docs.blocksec.com/phalcon/phalcon-explorer/quick-start): a
  full-screen button top right; the invocation flow has a search box (address, function
  signature, selector), a static-call show/hide, a gas show/hide and an "Expand: how many
  levels" control; line numbers are shareable.
- **Tenderly Debugger** (docs.tenderly.co/debugger/overview): trace, source, stack and a "call
  information" panel with decoded inputs, outputs and gas; Next / Previous to step through
  calls; a toggle between the full trace and CALLs only; jumps to the exact revert point.
- Pinterest pin 7951736838549212 (Evil Martians, HTTPie devtools): one quiet top bar per pane,
  view tabs with a status dot, a collapsible collection sidebar, a filter field at the top of
  the response pane.
- Pinterest pin 155374255891612555 (code editor concept): search with a ⌘K keycap in the
  sidebar header, an icon rail, file tabs that read in full.
- Pinterest pin 363525001193584930 (workflow canvas): one floating toolbar of icon buttons
  (fit, zoom, full screen, run) and a slide-in panel that closes.
- Pinterest pin 10414642884163395 (dark data workspace): a slim collapsible left rail, a dense
  results table with a search and icon actions in its header, a right activity panel.
- Pinterest pin 175640454214056601 (node app with debug pane): a bottom "Debug running" pane
  with clear actions, items search in the right panel.
- Pinterest pin 232146555789225977 (workflow design): a collapsible folder rail with counts.

## Decisions

| Decision | Fixes | From |
|---|---|---|
| **Full screen** button (and `F`, `Esc` to leave) on the trace panel: the trace panel fills the app window (not the browser's full screen), test list, source and app header step aside | 1 | Phalcon full-screen button; pin 363525001193584930 toolbar |
| **Collapse tests** (`[`) and **collapse source** (`]`) buttons, each a labelled icon | 1 | pins 7951736838549212, 10414642884163395, 232146555789225977 |
| One header: test name, Pass/Fail, test file, forge version, exported time; breadcrumb and meta chips gone | 4 | pin 7951736838549212 one bar per pane |
| Views as an **icon + label segmented control** (Call trace · Call graph · Scenario, `1` `2` `3`), visually distinct from filters | 3 | pin 7951736838549212 view tabs |
| **Search calls** field with a `/` keycap: contract, function, argument or value | 5 | Phalcon search box; pin 155374255891612555 keycap |
| Filters as **checkboxes with counts** ("☑ Cheatcodes 4"), state readable at a glance | 2 | Phalcon static-call show/hide |
| **Depth** select (All levels, 1, 2, 3) | 5 | Phalcon "Expand: how many levels" |
| **Revert banner** with "Jump to it" when the test reverted anywhere | 6 | Tenderly "exact revert point" |
| **↑ ↓ / j k** step through calls, the source follows | 5 | Tenderly Next / Previous |
| A **keyboard legend** at the foot of the trace | 5 | discoverability of the above |
| **Selected call** card in the source panel: args, return, gas, call site | 8 | Tenderly call information panel |
| Source file **select** instead of cut-off tabs | 7 | pin 155374255891612555 full file names |

## Legibility pass (same day)

"Icon, colour and type look too dark." Measured on the card (#242427), WCAG AA needs 4.5:1 for
small text:

| Token | Contrast | Was used for | Now |
|---|---|---|---|
| `dim` #6f6f76 | 3.10:1, fails | line index, argument names, gas, `L` refs | `muted` 5.60:1 / `body` 7.92:1 |
| `muted` #9b9ba1 | 5.60:1 | contract name, kind glyph | contract name `body` 7.92:1 |

Kind glyphs were 12px grey unicode (↗ ◎ ✦ ⚙), told apart only by shape. They are now
Phosphor icons on a tinted tile in **Foundry's own trace palette**, read from the ANSI output of
`forge test -vvvv --color always` on the sample project, the colours auditors already know from
their terminal (Nielsen: match between system and the real world):

| Kind | forge -vvvv | Luora |
|---|---|---|
| successful call `Contract::fn` | green (32) | green, chevron-in-circle |
| cheatcode `VM::` | blue (34) | blue, wrench |
| revert | red (31) | red, x-circle |
| event arguments | cyan (36) | cyan, broadcast |
| `[staticcall]` tag | yellow (33) | yellow, eye |
| delegatecall | yellow tag | pink, swap (a context switch should stand out) |

A colour key sits in the Calls header; argument and return chips get a hairline border; the
function name is semibold; tree guides are brighter.

## Phalcon pass, words not icons (same day)

Studied BlockSec Phalcon Explorer's invocation flow (tx 0xa1f1…b099, `?line=20`) and the request
"no icons if possible". Taken from it:

| Phalcon | Luora |
|---|---|
| Call type as a text badge (CALL, STATICCALL, DELEGATECALL, EVENT) | `KindBadge`: outlined mono badge in Foundry's colours; the tinted icon tiles and the colour key are gone |
| `Contract.fn(name=value, …)` inline on one line | same, contract `body`, fn semibold `fg`, values `text` |
| Return value in its own box | return chip after a `›` chevron |
| ⊟ / ⊞ fold boxes per call with children | `−` / `+` fold boxes; ← folds (or jumps to the parent), → unfolds; search ignores folds |
| `?line=N` shareable row | `?test=<name>&call=<n>`, kept in the URL; "Copy link" in the Selected call card |
| Dense rows, depth guides | rows packed with 1px gaps, guides kept |

Not taken: Phalcon's fund-flow and balance-change tabs (a Foundry test run has no on-chain money
flow to show) and its per-row gas toggle (gas stays a column with a meter).
