# Explore: DeFi protocols as pictures (2026-10-10)

A new top-level section next to Trace and Atlas. Trace and Atlas read the auditor's **own** project;
Explore shows **known** protocols (Uniswap v3, Aave v3, Morpho, Compound v3), mapped from their
official source at a pinned release, so an auditor can learn a protocol's business system before
reading its code or auditing something that integrates with it.

Defensive only, like the rest of Luora: liquidations, flash loans, oracles and callbacks are
described as the protocol's intended features, followed by what an auditor should check. No attack
steps, no exploit code, nowhere (data, UI, suggested questions, system prompt).

## Who and what for

An auditor or bug-bounty hunter who is about to:

1. **Audit an integration** (a vault that supplies to Aave, a router that swaps on Uniswap) and
   needs to know which contract it talks to, what that contract calls next, and who can change it.
2. **Join a contest on a fork** of a big protocol and needs the map of the original in minutes.
3. **Learn** how a lending market or an AMM is put together, from the code, not from a blog.

Their jobs on these pages, most frequent first:

| # | Task | Where |
|---|---|---|
| T1 | Pick a protocol, see what it is for and how big it is | `/explore` gallery |
| T2 | See which contracts exist and how they call, hold, inherit and deploy each other | Map |
| T3 | Follow one business action (supply, borrow, swap, liquidate) contract by contract | Flows |
| T4 | Open one contract and read its functions, storage, calls and events | Contract (Atlas Lab) |
| T5 | Jump to the exact line on GitHub at the pinned commit | everywhere a function is named |
| T6 | Ask "how does this work / what should I check" about the protocol, a flow, a step or a contract | Ask AI |
| T7 | Know what the data is and isn't (release, commit, licence, what was left out) | header + About |

## References studied

Pinterest (id.pinterest.com, pins opened one by one):

| Id | Pin | What it shows |
|---|---|---|
| P1 | 18577417209678198 (GZ 0x, *LayerZero Scan, omnichain explorer*, Behance) | Each entity is a dark card with a title and **one row per relation**; a port dot at the row's end; wires leave from the row and enter the target card; quiet dotted wires with rounded corners |
| P2 | 914862421492319 (Juan Llerena, *Visualize to organize*, Savee) | A tree laid out in **columns** by level (root, capabilities, features, services); icon + name + status per row; only the selected path is drawn bright, the rest grey |
| P3 | 8514686792355593 (VMware Tanzu Service Mesh, security posture) | Sources, policies, destinations in three columns; picking a row **lights its whole path**, everything else fades |
| P4 | 10414642884268257 (*Workflow plan*) | Steps as pills laid on rows over time; the active step white, the rest graphite; a label with a count on each pill |
| P5 | 669206825922691039 (ProcessMind, *BPMN swimlanes dark mode*) | Process list on the left, the diagram in the middle, a **documentation panel** on the right with the selected step's objective and steps |
| P6 | 92042386128336773 (Bartosz Sawczuk, *Seventeen integrations*) | Integration cards: logo tile top-left, **category label top-right**, name, two-line purpose, a footer with a link and a status |
| P7 | 915849274239380602 (*NebulaDB integrations & webhooks*) | Title + one-line subtitle, search field and category filter tiles above a 3-column card grid; a card opens a side panel |

Products (L2 opened for this pass; TD from the trace pass; DL and SU known tools, not reopened):

| Id | Product | Taken |
|---|---|---|
| L2 | **L2BEAT**, project page, *Permissions* and *Smart contracts* sections, and its **Disco** contract explorer (l2beat.com/scaling/projects/arbitrum) | Contracts as cards whose **fields wire to the contracts they point to**; actors written as "Can interact with X: what"; every contract linked to its source; numbered sections |
| TD | **Tenderly** debugger and **Phalcon** invocation flow (already studied in trace-view.md) | Call order as a numbered, nested list; the selected call's details in a side panel |
| DL | **DeFiLlama** protocol list | Category and chain as plain columns next to the name; no decoration |
| SU | **sol2uml** / **Surya** graphs | Inherits vs calls vs storage pointers drawn as different edges; libraries as their own nodes |
| R1–R4 | The trace AskPanel references (pins 372109987986003766, 160018593004593469, 112871534413929668, 449445237837052121) | The Ask composer: context strip, suggested questions, model chip, Copy prompt with no AI |

## Decisions

| UI choice | Task | From |
|---|---|---|
| Gallery = title, one-line subtitle, card grid; no hero, no stats | T1 | P7 |
| Card: real logo tile top-left (only if the asset exists, else monogram tile), category top-right, name + version, two-line purpose, footer "chain · N contracts · licence" | T1, T7 | P6, DL |
| Licence shown as a chip with a dot: green "Source excerpts" (MIT/GPL), grey "Structure only" (BUSL); the same words in the protocol header and About | T7 | L2 (sources linked, not copied) |
| No TVL, users, volume or other numbers we did not measure; counts are counted from the AST | T1 | DESIGN.md "no fake stats" |
| Protocol page = left rail (views, flows, contracts) · canvas · right panel (About / Ask AI) | T2–T6 | P5, R4 |
| Views as Tabs: Map · Flows · Contract | T2–T4 | trace-view.md view tabs |
| Map: contracts in **columns by role** (entry points → logic → tokens and storage → config, oracles, external) | T2 | P2 columns, L2 Disco |
| Map card: title above (white dot + name), inner header kind icon + label (Contract, Library, Token, Interface), **one row per relation** ("calls AToken", "holds IPoolAddressesProvider") with a port dot; the wire leaves from that row | T2 | P1, L2 Disco |
| Relation kinds told apart by **words and line style**, not colour: calls and delegates solid, holds dashed, deploys dotted; inheritance listed as text ("is PoolStorage, …") | T2 | SU, DESIGN.md (monochrome wires) |
| Selecting a card lights its wires and neighbours, the rest fades | T2 | P3, P2 |
| Pan, zoom, fit (the Call graph's ZoomControls and usePanZoom) | T2 | trace Call graph |
| Flows: a **lane diagram**: one lane per contract (actor first), each step a numbered pill on its contract's lane, a wire from step to step | T3 | P4, sequence diagrams |
| Selected step white, others graphite; ← → and j k step; the right panel shows the step's explanation, the function and its GitHub line | T3, T5 | P4, P5, TD |
| Under each flow: "What an auditor checks" list, written as checks, not attacks | T3 | L2 risk wording, defensive rule |
| Contract view = the Atlas **Lab** contract graph, unchanged (`only="contract"`), fed from the same luora-atlas.mjs output | T4 | Atlas |
| Every function name links to `github.com/<repo>/blob/<commit>/<file>#L<n>` | T5 | L2 (source links), Phalcon line links |
| Ask AI tab: context strip (protocol › flow › step or contract), suggested defensive questions, model chip, Copy prompt without AI | T6 | R1–R4 |
| Header chips: repo@tag, short commit, licence; "What's not here" note per protocol (e.g. Curve: Vyper, no solc AST) | T7 | L2 numbered sections |

## Data

`foundry/luora-protocol.mjs` turns one spec (`foundry/explore/<id>.json`: repos, key contracts with
their role, flows with steps, auditor checks) plus the protocol's own `forge build --ast` into
`apps/frontend/src/features/explore/data/<id>.json`:

- per contract: `buildAtlas` from `luora-atlas.mjs` (the same pieces the Atlas draws), its file,
  line, kind, base contracts;
- between contracts: **calls** (external calls on a typed contract), **delegates** (explicit library
  calls), **holds** (state variables and immutables of a contract type), **deploys** (`new X`),
  **inherits** (direct bases), with the member names called;
- every flow step is checked against the AST (the function exists in that contract or its bases) and
  gets its file and line; a step that doesn't resolve fails the build;
- a few relations the AST can't see (Comet's assembly `delegatecall` to its extension) are listed
  in the spec and marked `manual`.

Releases: Aave v3.5.0 (aave-v3-origin), Uniswap v3-core v1.0.0 + v3-periphery v1.0.0, Morpho Blue
v1.0.0 + MetaMorpho v1.0.0, Compound III main at f766f51 (no release tags). Curve is not included:
its pools are Vyper, and the Atlas reads solc ASTs. Lido is not included yet: its core mixes
solc 0.4.24 (Aragon) with 0.8.x and needs the Aragon packages to build.

Regenerate (clones live outside the repo):

```sh
forge build --ast --extra-output storageLayout          # in each clone, see each spec's builds
node foundry/luora-protocol.mjs foundry/explore/aave-v3.json /path/to/clones
```

Licences are read **per file** from the SPDX header, not per repo: a file under MIT / GPL / LGPL /
Apache / BSD / MPL keeps its source for the Lab; BUSL-1.1, UNLICENSED or no header is **structure
only** (no `source`, the one-line `find` anchors replaced by names) and links to GitHub at the pinned
commit. So Uniswap v3-core (BUSL) is structure only while v3-periphery and TickMath (GPL) keep their
source; Morpho.sol (BUSL) is structure only while its GPL libraries and MetaMorpho keep theirs; Aave
v3 and Compound III are structure only. Files from git submodules or node_modules of another project
(`vendored`) get no link.

Atlas findings (the hygiene heuristics) are dropped: these protocols are audited, and a heuristic
"finding" on Uniswap would read as a claim we can't stand behind.

Flow and step names use the protocol's own function names (supply, borrow, liquidationCall,
exactInputSingle, mint, absorb, buyCollateral …), read from the code at the pinned commit.
