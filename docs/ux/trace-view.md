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
