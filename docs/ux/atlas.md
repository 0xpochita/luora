# Atlas UX review (2026-10-10)

The Atlas shows one contract as pictures: a node graph, a layer tree, a one-page sheet and
step-by-step paths, plus the Scenario lab that writes Foundry tests of intended behaviour. This
review was done before any change, as for the trace view (docs/ux/trace-view.md).

## Who and what for

An auditor or bug-bounty hunter opening a contract they did not write. In order, they want to:

1. get the whole contract at a glance (who can call what, what it stores, who it trusts);
2. follow one function: what it reads, writes, calls and emits, and in what order;
3. see where tests are thin and where findings sit;
4. write a test of the intended behaviour and run it.

## Heuristic audit of the screen as it was

| # | Problem | Heuristic | Where |
|---|---|---|---|
| 1 | View names say nothing about the job: Lab, Explorer, Map, Flow. "Explorer" will also clash with the new top-level Explore section. | Match with the real world | header tabs |
| 2 | Three levels of navigation: view tabs, then Contract / Scenario inside Lab, then Entry points / Storage / External / Findings under the canvas. | Consistency, recognition | Lab |
| 3 | An unlabeled icon rail (add, code, settings, export, share, help) on the read-only graph; "Add node" silently jumps to Scenario. | Recognition over recall, error prevention | Lab rail |
| 4 | Zoom controls in a different place in every view: a 68px column at the bottom right in Lab, a vertical stack mid-right in Map and Flow. | Consistency | all canvases |
| 5 | The right panel is the same in every state: source at the top (imports, when nothing is selected), coverage under it. The selection's details sit below the fold. | Progressive disclosure | aside |
| 6 | Selecting a function lights its wires but every other card stays at full strength: a hairball. | Graph visualisation: focus and neighbours | Lab graph |
| 7 | Card text that reads wrong: "slot 4 · written by" with nothing after it; external calls listed as "cPrice()", "cCall()" (piece ids, not function names). | Visibility of system status (correct data) | Lab cards |
| 8 | Search exists (`/`, ⌘K) but is only a dim hint, not a control. | Recognition over recall | header |
| 9 | The Map draws its smallest labels at 8.5–10px, then scales the whole sheet down to fit. | Legibility (WCAG text size) | Map |

## References

| Ref | What it shows | Taken |
|---|---|---|
| Cambridge Intelligence, "Graph visualization UX" and "fixing data hairballs" | progressive disclosure; style a selection's neighbours and fade the rest; start focused | 6 |
| Figma UI3 ("Behind our redesign", "Our approach to designing UI3") | tools in one floating dock; the properties panel opens on selection; panels can be hidden for canvas space | 4, 5 |
| VSCode Solidity Auditor (Consensys Diligence) cockpit | auditor-first names (state vars, writers, call graph), everything one click from the code | 1, 7 |
| A1 pin 116249234132919268 (node canvas, "image generation") | few cards with generous spacing, one floating dock, no side rails | 3, 4 |
| A2 pin 23925441769073772 (Slavik Bushko, workflow builder) | compact cards; one horizontal canvas toolbar (pan, fit, zoom) always in the same corner; a side panel that closes | 4, 5 |
| A3 pin 175640454214056601 (node editor with code and debug panels) | tool groups in one capsule; menus that say what each item does, with shortcuts | 3, 8 |
| docs/research/alchemy-security-tools.md | Wake and VSCode Solidity Auditor keep graphs next to the code the auditor reads | 5 |

## Decisions

| # | Change | From |
|---|---|---|
| D1 | Views named by the question they answer, one flat row with icons and keys 1–5: **Overview** (was Map), **Layers** (was Explorer), **Graph** (was Lab · Contract), **Paths** (was Flow), **Scenarios** (was Lab · Scenario). The Lab's own Contract / Scenario switch is gone. | 1, 2; VSCode Solidity Auditor |
| D2 | The Lab rail shows only tools that work in the view: Graph keeps Settings (reset layout) and Help; Scenarios keeps all six. | 3; A1, A3 |
| D3 | One zoom dock, horizontal, bottom right, in Overview, Graph, Paths and Scenarios: − + Fit. | 4; A2, Figma UI3 |
| D4 | The right panel follows the selection: nothing selected shows the contract summary (coverage, audit focus, layers) with the source last; a selection shows the source of that piece and its details first. `]` or the Inspector button hides it for more canvas. | 5; Figma UI3, A2 |
| D5 | Graph focus: with a piece selected, its cards and their direct neighbours stay, everything else fades, unrelated wires fade further. | 6; Cambridge Intelligence |
| D6 | Cards say what they mean: a slot lists the functions that write and read it; an external contract lists the functions called on it by name. | 7 |
| D7 | Search is a visible capsule in the header with its `/` keycap. | 8; A3 |
| D8 | Map labels no smaller than 10.5px. | 9 |

Not done here: the Entry points / Storage / External / Findings tray under the Graph stays as it
is (it is the Graph's list view); turning it into a left panel shared by every view is the next
step if the tray still feels detached.

## Minimal pass (same day)

"Still too many components; make it as minimal and simple as possible; an auditor must never be
confused." Researched again before cutting:

| Ref | Principle | Applied |
|---|---|---|
| NN/g heuristic 8, "Aesthetic and minimalist design" | every extra unit of information competes with the relevant ones | cut everything that repeats what the canvas already shows |
| Hick's law (Laws of UX) | decision time grows with the number of choices; hide rarely used options until asked | 5 views to 3; panels only on demand |
| M1 pin 75716837485844383 ("Tool call graph") | one graph, one 3-way switch, a few key numbers under it, no side panels | the header's one line of numbers |
| Figma UI3 | the properties panel opens on selection | inspector opens on a selection or on the numbers |

What the screen holds now, and where everything else went:

| Was | Now |
|---|---|
| 5 view tabs (Overview, Layers, Graph, Paths, Scenarios) | 3 in one segmented control, keys 1–3: **Graph**, **Paths**, **Scenarios** (the same control as Trace). Overview and Layers repeated the Graph and are removed. |
| file, solc and Findings chips | the file name, then one quiet line "Coverage 80% · Untested 3 · Findings 5" that opens the summary |
| right panel always open (coverage, layers, source) | closed until a selection (what it is first, then its source) or the numbers (coverage, audit focus, a plain findings list); Esc closes |
| bottom tray (4 tabs, a toggle, cards) | removed: the Graph cards are the list, the summary holds untested entries and findings, Search finds the rest |
| icon rail and hint line on the Graph | removed; "Reset layout" appears in the zoom dock only after a card was dragged |
| Paths shrunk to fit the height | fills the width from the top; pan down for more |

Like Trace, the right panel can be put away (Inspector, `]`) and the canvas can fill the window
(Full screen, `F`; Esc steps back out).
