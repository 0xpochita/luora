/**
 * Luora's docs (/docs), as data: groups of pages, each page a title, a one-line lead and blocks.
 * Inline text takes `code`, **bold** and [label](href) (DocsArticle renders them). The shape follows
 * onorca.dev/docs (D1, docs layout): Start here first, then the app, running tests, AI, more.
 */

export type Block =
  | { p: string }
  | { h2: string }
  | { h3: string }
  | { list: string[] }
  | { steps: string[] }
  | { code: string }
  | { note: string; tone?: "info" | "warn" }
  | { table: { head: string[]; rows: string[][] } }
  /** a screen recording of the app (public/docs/<name>.mp4, its poster <name>.jpg) */
  | { video: string; caption: string };

export type DocPage = {
  /** "" is /docs itself */
  slug: string;
  title: string;
  lead: string;
  blocks: Block[];
};

export type DocGroup = { title: string; pages: DocPage[] };

const SITE = "https://www.luorasec.xyz";
const DOWNLOAD = `curl -fsSLO -w "saved %{filename_effective}\\n" "${SITE}/exporter/luora-{export,lib,atlas,findings,coverage,chains,bridge}.mjs"`;

export const GROUPS: DocGroup[] = [
  {
    title: "Start here",
    pages: [
      {
        slug: "",
        title: "What is Luora?",
        lead: "A one-minute pitch: what Luora shows, who it is for and when to reach for it.",
        blocks: [
          {
            p: "Luora is a visual, defensive tool for smart contract auditors and bug bounty hunters. It reads what your Foundry project already produces (forge test traces, the compiler's AST and storage layout, Slither and Aderyn reports, coverage) and draws it: every call of a test on the source line it ran, your contract as a graph, findings on the pieces they touch, and scenario tests you wire and export as `.t.sol`.",
          },
          {
            video: "/docs/trace.mp4",
            caption:
              "Trace: a forge test's calls, decoded, with the source line each one ran",
          },
          { h2: "When to use Luora" },
          {
            list: [
              "A test passes or fails and you want to see exactly which calls ran, with which arguments, on which lines.",
              "You start on an unfamiliar codebase and want its functions, storage and external calls as one map.",
              "Slither and Aderyn report the same issue twice and you want one triaged list.",
              "You want to pin intended behaviour (access control, accounting, pause) as Foundry tests without writing them by hand.",
            ],
          },
          { h2: "Who it is for" },
          {
            p: "Auditors, bug bounty hunters and Solidity developers who already use Foundry. Luora assumes you read code and judge findings yourself: AI explains, you decide.",
          },
          { h2: "What Luora is not" },
          {
            list: [
              "**Not an exploit tool.** It never writes attack contracts, calldata or attack steps. Tests it helps you write check intended behaviour.",
              "**Not a hosted scanner.** Your code is never uploaded. The exporter runs on your machine and the app reads the file in your browser tab.",
              "**Not a replacement for forge, Slither or Aderyn.** It reads their output and lays it over the contract.",
              "**Not an AI.** Luora hosts no model. Ask AI uses one you bring, or built-in text.",
            ],
          },
          { h2: "Next steps" },
          {
            p: "Go to [Quick start](/docs/quick-start) to load your own project in a few minutes, or open the [sample vault](/trace) right away. Then read [Your first audit session](/docs/first-session).",
          },
        ],
      },
      {
        slug: "quick-start",
        title: "Quick start",
        lead: "From a Foundry project to its traces in Luora, on luorasec.xyz, with nothing to clone.",
        blocks: [
          { h2: "Requirements" },
          {
            list: [
              "[Foundry](https://getfoundry.sh) (`forge` on your PATH) and Node 20 or newer.",
              "A Foundry project with tests (the folder with `foundry.toml`).",
              "Optional: [Slither](https://github.com/crytic/slither) and [Aderyn](https://github.com/Cyfrin/aderyn) for findings.",
            ],
          },
          { h2: "1. Install the tools" },
          {
            p: "Skip this if `forge --version` and `node --version` already work.",
          },
          { code: "curl -L https://foundry.paradigm.xyz | bash && foundryup" },
          { h2: "2. Get the exporter into your project" },
          {
            p: "Seven plain Node scripts, no install. They are downloaded from the app, so they always match the version you use.",
          },
          { code: `cd path/to/your-project\n${DOWNLOAD}` },
          { h2: "3. Export a run" },
          { code: "node luora-export.mjs" },
          {
            p: "It runs `forge test` with traces, maps the contract, merges Slither and Aderyn reports from `reports/` if you have them, and writes `luora-data.json` next to `foundry.toml`. Add that file to `.gitignore`.",
          },
          { h2: "4. Load it" },
          {
            p: "Open [luorasec.xyz/trace](/trace) and drop `luora-data.json` on the Start page. The file is read in that tab only and never uploaded.",
          },
          { h2: "5. Optional: run tests from the page" },
          {
            p: "Start the bridge in the same folder and open the link it prints. Start test, Test all and Reload trace then run forge on your computer. See [Run tests from the browser](/docs/bridge).",
          },
          { code: "node luora-bridge.mjs" },
          {
            note: "No Foundry project at hand? Press **Try the sample vault** on the Start page: LuoraVault, a small demo vault bundled with the app.",
          },
        ],
      },
      {
        slug: "first-session",
        title: "Your first audit session",
        lead: "A short tour of where each part of an audit lives in Luora.",
        blocks: [
          { h2: "1. Read a test in Trace" },
          {
            steps: [
              "Pick a test in the list on the left. Failures show first in the run panel.",
              "Click any call in the call trace: the source panel jumps to the line it ran, with its arguments and return value.",
              "Switch to **Call graph** to see the same test as a graph of contracts, or open **Ask AI** on a call to have it explained.",
            ],
          },
          { h2: "2. Map the contract in Atlas" },
          {
            steps: [
              "Open **Atlas**. **Graph** shows every function with what it reads, writes, calls and emits.",
              "**Paths** walks one function step by step, with replay.",
              "The numbers in the header (coverage, untested, findings) open the summary.",
            ],
          },
          { h2: "3. Triage findings" },
          {
            p: "The findings tray at the bottom of Atlas merges Slither, Aderyn and Luora's own checks into one finding per issue. Mark each one **Confirmed** or **False positive**, then download the confirmed ones as a Markdown report.",
          },
          { h2: "4. Pin intended behaviour with a scenario" },
          {
            steps: [
              "Open **Scenarios** (Atlas, or the Scenario view in Trace).",
              "Wire Actor → Call → Expect revert or Assert, or start from a template.",
              "Press **Run** to check it against the run's values, then **Export .t.sol** (or Generate test) and add it to your suite.",
            ],
          },
          {
            note: "A failing assertion is a finding for you to review, not an attack. Scenarios only use the Lab's cards: actors, amounts, calls, expected reverts, asserts and snapshots.",
          },
        ],
      },
    ],
  },
  {
    title: "Using Luora",
    pages: [
      {
        slug: "trace",
        title: "Trace",
        lead: "Every call of a forge test, decoded, on the source line it ran.",
        blocks: [
          {
            p: "Trace shows one test at a time. The exporter decodes each frame with your project's own ABIs and ties it to the exact source lines it executed, so you read calls instead of opcodes.",
          },
          { h2: "The three views" },
          {
            table: {
              head: ["View", "Shows"],
              rows: [
                [
                  "Call trace",
                  "The calls in order with arguments, return values, events and gas; cheatcodes and events can be hidden",
                ],
                [
                  "Call graph",
                  "The same test as contracts and the calls between them",
                ],
                [
                  "Scenario",
                  "The Lab's scenario editor on this run's contract (see [Scenarios](/docs/scenarios))",
                ],
              ],
            },
          },
          {
            video: "/docs/graph.mp4",
            caption:
              "Call graph: the same test as contracts and the calls between them",
          },
          { h2: "Panels" },
          {
            list: [
              "**Tests** on the left, with pass, fail and the kind of test (unit, fuzz, invariant).",
              "**Source** on the right: the line a selected call ran. **Ask AI** is the same panel's other tab.",
              "**Token transfers** and **Net balance change** under the trace, for tests that move tokens.",
              "The **fork picker** switches between the local run and the testnet forks of the same tests.",
            ],
          },
          { h2: "Keyboard" },
          {
            table: {
              head: ["Key", "Does"],
              rows: [
                ["↑ ↓", "Step through calls"],
                ["← →", "Fold, unfold"],
                ["/", "Search calls"],
                ["A", "Ask AI about the selected call"],
                ["1 2 3", "Call trace, Call graph, Scenario"],
                ["[ ]", "Toggle the side panels"],
                ["F", "Full screen"],
                ["⌘R", "Reload trace (local Luora or a linked bridge)"],
              ],
            },
          },
          {
            note: "Fuzz and invariant tests are listed with their runs, but only unit tests get line-by-line step data.",
          },
        ],
      },
      {
        slug: "atlas",
        title: "Atlas",
        lead: "Your contract as a graph of its functions, storage and calls.",
        blocks: [
          {
            p: "The atlas is built from `forge build --ast` and `forge inspect … storageLayout`. Each piece (function, modifier, storage slot, external call, event) keeps its source line, and findings and coverage sit on the pieces they touch.",
          },
          { h2: "Views" },
          {
            table: {
              head: ["View", "Key", "Shows"],
              rows: [
                [
                  "Graph",
                  "1",
                  "What each function reads, writes, calls and emits",
                ],
                ["Paths", "2", "Each function step by step, with replay"],
                [
                  "Scenarios",
                  "3",
                  "The Lab: write a Foundry test of intended behaviour",
                ],
              ],
            },
          },
          {
            video: "/docs/atlas.mp4",
            caption:
              "Graph: every function with what it reads, writes, calls and emits",
          },
          {
            video: "/docs/paths.mp4",
            caption: "Paths: one function step by step, with replay",
          },
          { h2: "Header" },
          {
            list: [
              "The contract picker switches to other contracts the project deploys (mocks included).",
              "Coverage, Untested and Findings open the summary in the inspector.",
              "**Search** (/) finds a piece, **Ask AI** asks about the selection, **Inspector** shows its details.",
            ],
          },
          {
            p: "`LUORA_ATLAS=MyVault node luora-export.mjs` picks which contract the atlas maps when a project has several.",
          },
        ],
      },
      {
        slug: "scenarios",
        title: "Scenarios",
        lead: "Wire a test of intended behaviour as cards, run it, export it as a Foundry test.",
        blocks: [
          {
            p: "A scenario is a small graph of cards: who acts, what they call with which amounts, what should revert, what should hold afterwards. Luora runs it against the values of your run and turns it into a `.t.sol` test.",
          },
          {
            video: "/docs/scenario.mp4",
            caption:
              "Wiring a scenario, running it and generating the Foundry test",
          },
          { h2: "Cards" },
          {
            table: {
              head: ["Card", "Does"],
              rows: [
                [
                  "Actor",
                  "A caller with a name, a role (owner, keeper, user…) and a balance",
                ],
                ["Amount", "A constant value wired into a call's argument"],
                ["Call", "One entry point of the contract"],
                ["Expect revert", "The call must revert with that reason"],
                [
                  "Assert",
                  "A check after the calls: a == b, a ≥ b, only the owner can call, paused blocks a call…",
                ],
                [
                  "Snapshot",
                  "Reads a storage slot or a balance so an assert can compare it",
                ],
              ],
            },
          },
          { h2: "Write one" },
          {
            steps: [
              "Pick a template (New…) or start a blank scenario.",
              "Drag from a port to wire it: actor → caller, amount → argument, call → next card.",
              "Press **Run**. Each step shows pass or fail with the values it saw.",
              "Press **Export .t.sol** (or **Generate test** in Atlas) and add the file to `test/`.",
            ],
          },
          { h2: "Proposed by your AI client" },
          {
            p: "An AI client connected over [MCP](/docs/mcp) can propose scenarios. They appear in the scenario menu under *Proposed by your AI client*, checked against the Lab's cards first; invalid ones stay listed but disabled, with the reason.",
          },
        ],
      },
      {
        slug: "findings",
        title: "Findings & triage",
        lead: "Slither, Aderyn and Luora's own checks as one finding per issue, triaged in place.",
        blocks: [
          {
            p: "The exporter merges Slither and Aderyn JSON reports into the atlas and removes duplicates, so the same reentrancy reported by both tools is one finding with both sources. Luora adds a few checks of its own from the atlas.",
          },
          { h2: "Get the reports" },
          {
            code: "slither . --json reports/slither.json\naderyn . -o reports/aderyn.json\nnode luora-export.mjs",
          },
          {
            p: "The exporter picks up `reports/slither.json` and `reports/aderyn.json` by itself, or pass `--slither=…` and `--aderyn=…`.",
          },
          { h2: "Triage" },
          {
            list: [
              "Open the findings tray at the bottom of Atlas; filter by tool or severity.",
              "Each finding links to the pieces and lines it touches.",
              "Mark it **Confirmed** or **False positive**. Triage state stays in your browser, per contract.",
              "Download the confirmed findings as a Markdown report.",
            ],
          },
        ],
      },
      {
        slug: "explore",
        title: "Explore",
        lead: "Known DeFi protocols mapped for auditors.",
        blocks: [
          {
            p: "Explore shows how well-known protocols are meant to work: Uniswap v3, Aave v3, Morpho and Compound v3. Each is one report: its contracts and how they connect, its main flows as sequence diagrams, links to the code and what to check.",
          },
          {
            p: "Liquidations, flash loans, oracles and callbacks are shown as the protocol's intended features. Ask AI on a protocol explains how they work and what to check, never how to abuse them.",
          },
          {
            video: "/docs/explore.mp4",
            caption:
              "A protocol in Explore: its contracts, then its flows as sequence diagrams",
          },
          {
            p: "Open it from **Explore** in the top bar. The Contract Lab can go full screen.",
          },
        ],
      },
      {
        slug: "exploits",
        title: "Exploits",
        lead: "Large smart contract incidents as defensive post-mortems.",
        blocks: [
          {
            p: "Exploits covers four of the largest smart contract incidents on the rekt.news leaderboard, one per vulnerability class: Poly Network, Euler Finance, Nomad Bridge and Beanstalk. Each is one report: overview, attack flow as a sequence diagram, funds, root cause as a diff, and how an auditor catches it.",
          },
          {
            video: "/docs/exploits.mp4",
            caption:
              "An incident as one report: overview, attack flow and how an auditor catches it",
          },
          { h2: "Policy" },
          {
            list: [
              "Historical, closed incidents only, at the level their public post-mortems describe.",
              "No exploit code, calldata, transaction payloads or attacker addresses.",
              "Every attack step that matters is paired with the missing check, and every case ends with the invariant that would have failed.",
              "Code is illustrative, written to the pattern, and says so. Facts link to their sources.",
            ],
          },
        ],
      },
    ],
  },
  {
    title: "Running tests",
    pages: [
      {
        slug: "exporter",
        title: "The exporter",
        lead: "Plain Node scripts that run your tests and write luora-data.json.",
        blocks: [
          {
            p: "`luora-export.mjs` runs `forge build`, `forge test --json -vvvv` and one `forge test --debug --dump` per unit test, decodes the frames with your ABIs and writes `luora-data.json`. It needs `forge` on PATH and Node 20+, and nothing to install.",
          },
          { h2: "Commands" },
          {
            code: "node luora-export.mjs                          # all tests\nnode luora-export.mjs --mt test_deposit        # one test\nnode luora-export.mjs --mc VaultTest           # one test contract\nnode luora-export.mjs --chain base-sepolia     # on a fork of Base Sepolia\nnode luora-export.mjs --forks all              # the local run plus one per testnet\nLUORA_ATLAS=MyVault node luora-export.mjs      # the contract the atlas maps",
          },
          { h2: "The scripts" },
          {
            table: {
              head: ["File", "Does"],
              rows: [
                [
                  "luora-export.mjs",
                  "Entry point: build, test, trace, write the file",
                ],
                ["luora-lib.mjs", "ABI decoding, keccak, source maps"],
                [
                  "luora-atlas.mjs",
                  "The contract map from the AST and storage layout",
                ],
                ["luora-findings.mjs", "Slither and Aderyn reports, merged"],
                ["luora-coverage.mjs", "forge coverage mapped onto the atlas"],
                [
                  "luora-chains.mjs",
                  "The six testnets for --chain and --forks",
                ],
                [
                  "luora-bridge.mjs",
                  "Optional: lets the hosted app run the exporter ([bridge](/docs/bridge))",
                ],
              ],
            },
          },
          {
            note: "If the atlas or coverage step fails, the export still writes the traces and prints `luora: atlas skipped` or `luora: coverage skipped` with the reason.",
          },
        ],
      },
      {
        slug: "forks",
        title: "Testnet forks",
        lead: "Run the same tests on copies of six EVM testnets, read-only.",
        blocks: [
          {
            p: "`--chain <key>` runs your tests on a fork of that chain at its latest block; `--forks all` adds one such run per chain next to the local one. Nothing is sent on-chain: no key, no gas. Trace and Atlas switch between the runs with the fork picker.",
          },
          {
            video: "/docs/fork.mp4",
            caption:
              "The fork picker: the local run, or the same tests on a testnet fork",
          },
          {
            table: {
              head: ["Key", "Chain"],
              rows: [
                ["sepolia", "Ethereum Sepolia"],
                ["arbitrum-sepolia", "Arbitrum Sepolia"],
                ["base-sepolia", "Base Sepolia"],
                ["robinhood-testnet", "Robinhood Chain Testnet"],
                ["hyperevm-testnet", "HyperEVM Testnet"],
                ["tempo-testnet", "Tempo Testnet (Moderato)"],
              ],
            },
          },
          {
            p: "Public RPCs are used by default. For a provider endpoint set `LUORA_RPC_<KEY>`, e.g. `LUORA_RPC_BASE_SEPOLIA=https://…`.",
          },
        ],
      },
      {
        slug: "bridge",
        title: "Run tests from the browser",
        lead: "luora-bridge.mjs lets luorasec.xyz run forge on your computer.",
        blocks: [
          {
            p: "A website cannot start programs on your computer, and Luora's server never runs anyone's code. The bridge is a small script you start yourself in your Foundry project. It links the page to that project: the page asks, the bridge runs `node luora-export.mjs` on your machine and streams the result back. Nothing is uploaded.",
          },
          { h2: "Use it" },
          {
            steps: [
              "Download it with the exporter (see [Quick start](/docs/quick-start)).",
              "In the project root, run `node luora-bridge.mjs` and keep that terminal open.",
              "Open the link it prints. The header says **Live** with your project's name.",
              "**Start test**, **Choose**, **Test all** and **Reload trace** now run on your computer.",
            ],
          },
          {
            code: "node luora-bridge.mjs\n\nLuora bridge · my-vault\nOpen this link in Chrome, Brave, Edge or Firefox (keep this window open):\n  https://www.luorasec.xyz/trace#bridge=7457.…",
          },
          { h2: "Browsers" },
          {
            table: {
              head: ["Browser", "Works"],
              rows: [
                [
                  "Chrome, Brave, Edge",
                  "Yes, after you allow the site to reach this computer (asked once)",
                ],
                ["Firefox", "Yes"],
                [
                  "Safari",
                  "No: it blocks a secure page from reaching your computer. Use another browser",
                ],
              ],
            },
          },
          { h2: "Why it is safe" },
          {
            list: [
              "It listens on `127.0.0.1` only: nothing else on your network can reach it.",
              "It answers only the Luora site, and every request needs the token from the link. The token rides in the link's `#` part, which browsers never send to a server.",
              "It runs nothing but `node luora-export.mjs` in its folder, with test and chain names checked first. No command, flag or path comes from the page.",
              "One run at a time, a 15 minute limit, and Stop ends forge.",
            ],
          },
          { h2: "Troubleshooting" },
          {
            list: [
              "**Bridge unreachable**: check the terminal is still running, allow the permission prompt (or turn it back on in the site settings, the icon left of the address), then press Retry.",
              "**No luora-export.mjs here**: start the bridge in the project root, where you downloaded the exporter.",
              "Port 7457 busy: it tries the next ports, or pass `--port 8000`.",
            ],
          },
        ],
      },
    ],
  },
  {
    title: "AI",
    pages: [
      {
        slug: "ai",
        title: "Ask AI providers",
        lead: "Luora hosts no AI: Ask answers from built-in text, or a model you bring.",
        blocks: [
          { p: "Open **Connect AI** in the app's top bar." },
          {
            table: {
              head: ["Option", "What answers", "What leaves your machine"],
              rows: [
                ["None (default)", "Luora's built-in text", "Nothing"],
                [
                  "Local model",
                  "Ollama, LM Studio or any OpenAI-compatible server you run",
                  "The prompt goes from your browser to that endpoint (normally localhost)",
                ],
                [
                  "Own API key",
                  "Anthropic, OpenAI or OpenRouter",
                  "The prompt and key go from your browser straight to that provider",
                ],
                [
                  "Your Claude",
                  "Your own Claude Code with your Claude plan",
                  "Local Luora only ([Run Luora locally](/docs/local))",
                ],
              ],
            },
          },
          { h2: "What is sent" },
          {
            p: "Only when you ask, and only for the selected piece or calls: their source lines, the connected pieces, open findings and your question, plus a fixed system prompt that keeps the model defensive (explain, list what to check, write a test of intended behaviour, never exploits).",
          },
          { h2: "Local model on luorasec.xyz" },
          {
            p: "The browser calls your local server directly, so it must allow the site. With Ollama:",
          },
          {
            code: 'launchctl setenv OLLAMA_ORIGINS "https://www.luorasec.xyz"   # macOS, then restart Ollama\nollama pull llama3.1',
          },
          {
            p: "Then pick **Local model**, endpoint `http://localhost:11434/v1`, model `llama3.1`, and press Test connection. In LM Studio, turn on **Enable CORS** in the server settings.",
          },
          {
            note: "Your API key is kept only in this browser's localStorage and sent only to the provider you picked. Use a key you can revoke, with a spend limit.",
            tone: "warn",
          },
        ],
      },
      {
        slug: "mcp",
        title: "MCP server",
        lead: "Let your own AI client read a run and propose scenarios.",
        blocks: [
          {
            p: "MCP (Model Context Protocol) is a standard plug that gives an AI client tools. `luora-mcp.mjs` gives Claude Code, Claude Desktop or Cursor Luora's view of your run: decoded traces, the contract map, findings. Without it, the AI reads raw forge output or a large JSON; with it, it asks Luora for exactly what it needs.",
          },
          { h2: "Set it up" },
          {
            code: `curl -fsSLO "${SITE}/exporter/luora-mcp.mjs"\nclaude mcp add luora -- node /abs/path/luora-mcp.mjs --data=/abs/path/luora-data.json`,
          },
          { h2: "Tools" },
          {
            table: {
              head: ["Tool", "Access", "Returns"],
              rows: [
                [
                  "overview",
                  "read",
                  "Contract, tests, finding counts, coverage and what scenarios may use",
                ],
                ["get_trace(test)", "read", "One test's decoded frames"],
                [
                  "get_atlas",
                  "read",
                  "Every mapped piece and what each entry point reads, writes, calls and emits",
                ],
                [
                  "get_piece(id)",
                  "read",
                  "One piece: source lines, links, findings, reverts, coverage",
                ],
                [
                  "list_findings",
                  "read",
                  "Slither, Aderyn and Luora findings, by severity or tool",
                ],
                [
                  "propose_scenario",
                  "append",
                  "Checks a scenario and saves it to luora-scenarios.json",
                ],
              ],
            },
          },
          { h2: "Proposals in the Lab" },
          {
            p: "A proposal shows up in Atlas → Scenarios under *Proposed by your AI client*: in a local Luora, or on luorasec.xyz while `node luora-bridge.mjs` runs in the project (switch back to the tab to pick up a new one). Pick it, check it, Run, then export the `.t.sol`.",
          },
          {
            note: "The server runs on your machine over stdio, makes no network calls, reads luora-data.json and only writes luora-scenarios.json. Scenarios test intended behaviour only.",
          },
        ],
      },
    ],
  },
  {
    title: "More",
    pages: [
      {
        slug: "local",
        title: "Run Luora locally",
        lead: "The whole app on your machine, for Your Claude and a live link to one export.",
        blocks: [
          {
            p: "Most of Luora works on luorasec.xyz. Run it locally when you want **Your Claude** (Ask answered by your own Claude Code and plan), or the app pointed at one project's export without a bridge.",
          },
          {
            code: "git clone https://github.com/0xpochita/luora.git\ncd luora/apps/frontend\npnpm install\nLUORA_DATA_PATH=/abs/path/to/your-project/luora-data.json pnpm dev",
          },
          {
            p: "Open http://localhost:3000/trace. Start test runs the exporter next to that file, and Reload trace (⌘R) re-reads it after every export.",
          },
        ],
      },
      {
        slug: "privacy",
        title: "Privacy & security",
        lead: "What stays on your machine, and what Luora will never do.",
        blocks: [
          { h2: "Your code and runs" },
          {
            list: [
              "The exporter and the bridge run on your machine; your code is never uploaded.",
              "A dropped luora-data.json is read in your browser tab only.",
              "Triage notes, scenarios and AI settings are kept in your browser, per contract.",
              "Luora's server only serves the app and the exporter scripts. Its local-only routes answer 404 on luorasec.xyz.",
            ],
          },
          { h2: "Defensive by design" },
          {
            list: [
              "No exploit code, attack contracts, calldata or attack steps, in the app or from its AI prompts.",
              "Scenarios and generated tests check intended behaviour.",
              "Exploits are closed, historical incidents written as post-mortems, without addresses or payloads.",
            ],
          },
        ],
      },
      {
        slug: "limits",
        title: "Known limits",
        lead: "What Luora does not do well yet.",
        blocks: [
          { h2: "Large projects" },
          {
            p: "Luora is not fast with large projects yet. It has been tried on small projects (the sample vault, a fresh `forge init`); hundreds of tests make a big luora-data.json that the browser can be slow to open. Export a part at a time:",
          },
          {
            code: "node luora-export.mjs --mc VaultTest      # one test contract\nnode luora-export.mjs --mt test_deposit   # one test",
          },
          { h2: "Browsers" },
          {
            p: "The bridge does not work in Safari, which blocks a secure page from reaching your computer. Everything else works in current Chrome, Brave, Edge, Firefox and Safari.",
          },
          { h2: "Windows" },
          {
            p: "Luora is tested on macOS. On Windows, use WSL, or `curl.exe` instead of `curl` in PowerShell, where `curl` is another command.",
          },
          { h2: "Phones" },
          {
            p: "The landing page works on phones; Trace and Atlas are built for a desktop screen.",
          },
          { h2: "Test data" },
          {
            p: "Fuzz and invariant tests are listed with their runs, but only unit tests get line-by-line step data.",
          },
        ],
      },
    ],
  },
];

/** every page in reading order, for previous / next and the routes */
export const PAGES = GROUPS.flatMap((g) => g.pages);

export const pageBySlug = (slug: string) => PAGES.find((p) => p.slug === slug);

export const hrefOf = (p: DocPage) => (p.slug ? `/docs/${p.slug}` : "/docs");

/** the anchor of a heading: "What Luora is not" → "what-luora-is-not" */
export const anchorOf = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
