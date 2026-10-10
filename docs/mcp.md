# Luora MCP server

`foundry/luora-mcp.mjs` lets **your own** AI client (Claude Code, Claude Desktop, Cursor) read a Luora run and propose Lab scenarios. Luora hosts no AI and calls no model. The server is plain Node with no dependencies. It talks MCP (JSON-RPC 2.0, one message per line) over stdio and only touches two local files:

- reads `luora-data.json` (written by `node luora-export.mjs`)
- writes `luora-scenarios.json` in the same folder, and only from `propose_scenario`

Nothing is sent over the network. Your AI client still sends whatever the tools return to its own model provider, as it does for any MCP server.

Scenarios test **intended behaviour**: access control holds, accounting stays consistent, pause works, funds round-trip. A scenario can only use the Lab's cards (Actor, Amount, Call, Expect revert, Assert, Snapshot). Anything else is rejected. A failing assertion is a finding for the auditor to review. It is never an attack sequence.

## Tools

| Tool | Access | What it returns |
| --- | --- | --- |
| `overview` | read | Contract, file, compiler, tests (name, status), finding counts by severity and tool, coverage totals, and `scenarioModel`: entry points with their ports, roles, assert checks, snapshot slots and revert reasons. |
| `get_trace(test)` | read | One test's decoded frames. Long args and return values are clipped, executed lines are shown as ranges, and storage ops are counted. |
| `get_atlas` | read | Every mapped piece (functions, modifiers, slots, calls, events, findings) with its line, plus the entry points and `seq` (what each one reads, writes, calls and emits, in order). |
| `get_piece(id)` | read | One piece: its source lines, links, findings on it, reverts and coverage. |
| `list_findings(severity?, tool?)` | read | Findings from Slither, Aderyn and Luora's own checks (`manual`). `severity` is `high`, `med`, `low` or `info`. |
| `propose_scenario(scenario)` | append | Checks the scenario against the Lab's model and appends it to `luora-scenarios.json`. Reusing an `id` replaces that proposal. |

### What `propose_scenario` accepts

```jsonc
{
  "name": "Non-owner cannot setOracle",          // one line, max 80 chars
  "nodes": [                                     // x / y are optional: cards without them are laid out for you
    { "id": "alice", "kind": "actor", "label": "alice", "role": "user", "balance": "1,000" },
    { "id": "call",  "kind": "call",  "fn": "setOracle" },
    { "id": "rev",   "kind": "expect", "reason": "!owner" },
    { "id": "only",  "kind": "assert", "check": { "type": "only", "fn": "setOracle" } }
  ],
  "wires": [
    { "from": { "node": "alice", "port": "addr" },     "to": { "node": "call", "port": "caller" } },
    { "from": { "node": "call",  "port": "r:!owner" }, "to": { "node": "rev",  "port": "call" } },
    { "from": { "node": "call",  "port": "then" },     "to": { "node": "only", "port": "then" } }
  ]
}
```

| Card | Fields | Allowed values (all listed in `overview.scenarioModel`) |
| --- | --- | --- |
| `actor` | `label`, `role`, `balance` | `label` must be an identifier. `role` is `user` or a role an entry point checks. `balance` is in USDC. |
| `const` | `value` | A USDC amount, e.g. `"100"` or `"0.5"`. |
| `call` | `fn` | An entry point. |
| `expect` | `reason` | `""` (taken from the wire) or a revert reason an entry point can hit. |
| `assert` | `check` | One of `assertChecks[].check`: `sum`, `solvent`, `only`, `paused` or `cmp` (`==`, `>=`, `<=`). |
| `snapshot` | `of` | `"balance"` or a public storage slot. |

Wires follow the Lab's typed ports:

- `actor.addr` → `call.caller` or `snapshot.who`
- `const.value` → `call.a<i>`, where `i` is the argument index
- `call."r:<reason>"` → `expect.call`
- `call."w:<slot>"` → `snapshot.slot`
- `snapshot.value` → `assert.a` or `assert.b` (for `cmp` checks)
- `"then"` → `"then"` sets the execution order

A wire is rejected if the port does not exist, the port types differ, the input is already wired, or it closes a loop.

Every rejection names the field and lists what is allowed, for example:

```
scenario rejected:
- node "x": kind must be one of actor, const, call, expect, assert, snapshot
- node "call": fn must be an entry point: deposit, withdraw, harvest, harvestRewards, setOracle, pause
```

The app checks every proposal again with the same rules (`scenarioErrors` in `lab-scenario.ts`). `lab.check.ts` runs both checkers on the same scenarios, so they cannot drift apart.

## In the app

Open `/atlas` → **Lab** → **Scenario**. The scenario picker has a group called **Proposed by your AI client**:

- Picking `AI · <name>` copies the proposal into your scenarios and marks it with an **AI proposal** chip.
- From there it works like a built-in template: **Run** replays it, and **Export .t.sol** gives you a Foundry test you can run with `node luora-scenario.mjs`.
- A proposal that no longer fits the contract (for example, after the code changed) appears as `Invalid · <name>` and is disabled. Hover over it to see why.

The app reads `luora-scenarios.json` from the folder that holds `LUORA_DATA_PATH`, and reloads it on every request.

## Register it

Use an absolute path to `luora-mcp.mjs`. Run the server from your Foundry project, or pass `--data=/abs/path/luora-data.json`.

### Claude Code

```sh
cd my-foundry-project
claude mcp add luora -- node /abs/path/to/luora-mcp.mjs
# or pin the data file:
claude mcp add luora -- node /abs/path/to/luora-mcp.mjs --data=/abs/path/my-foundry-project/luora-data.json
```

### Claude Desktop

Add this to `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`). Claude Desktop does not start in your project, so `--data` is required:

```json
{
  "mcpServers": {
    "luora": {
      "command": "node",
      "args": ["/abs/path/to/luora-mcp.mjs", "--data=/abs/path/my-foundry-project/luora-data.json"]
    }
  }
}
```

### Cursor

Add this to `.cursor/mcp.json` in the project, or to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "luora": {
      "command": "node",
      "args": ["/abs/path/to/luora-mcp.mjs", "--data=/abs/path/my-foundry-project/luora-data.json"]
    }
  }
}
```

## Example prompt

> Use the luora tools. Read `overview` and `list_findings` (severity high). For each high finding, look at the piece it sits on with `get_piece`. Then propose up to three scenarios that check the **intended** behaviour around those findings, for example that only the owner can call a privileged function, that pause blocks deposits, and that `totalShares` equals the sum of `shares` after two deposits. Use only entry points, roles and checks from `scenarioModel`. If a proposal is rejected, fix it using the error message.

Then open the Lab, pick the proposals, **Run** them and **Export .t.sol**.

## Check it

```sh
node --test foundry/luora-mcp.test.mjs     # JSON-RPC framing, tool list, valid and invalid scenarios
node --experimental-strip-types apps/frontend/src/features/atlas/utils/lab.check.ts   # app and server checkers agree
```
