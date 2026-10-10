# Luora

Luora shows what your smart contract actually does: decoded Foundry traces line by line, a contract
map with Slither / Aderyn findings and `forge coverage`, for auditors and bug-bounty hunters.
It is defensive only: scenarios test intended behaviour, a failing assertion is a finding to look at.

## Quickstart

**Requirements:** Node 20+, [pnpm](https://pnpm.io) 10, [Foundry](https://getfoundry.sh) (`forge` on PATH).

### 1. Run the app

```sh
git clone https://github.com/0xpochita/luora.git
cd luora/apps/frontend
pnpm install
pnpm dev            # http://localhost:3000
```

With no export yet the app shows the bundled **sample** (LuoraVault). A *Sample data* badge in the
top bar says so on every page.

### 2. Export a run from your Foundry project

Copy the exporter (five plain Node scripts, no dependencies) into your project root and run it there:

```sh
cp luora/foundry/luora-{export,lib,atlas,findings,coverage}.mjs path/to/your-project/
cd path/to/your-project
node luora-export.mjs
```

It writes `luora-data.json` next to `foundry.toml`. Flags and options: [foundry/README.md](foundry/README.md).

### 3. Load it

Either:

- **Drop it in:** click *Sample data → Use my project* in the top bar and drop `luora-data.json`
  (or pick it). It is read in that browser tab only and kept in memory: a full reload or *Unload*
  goes back to the server's data.
- **Keep it live:** start the app pointing at the file, then refresh after every export.

  ```sh
  LUORA_DATA_PATH=/abs/path/to/your-project/luora-data.json pnpm dev
  ```

### Privacy

The exporter and the app read local files. Nothing you export or drop in is uploaded to any server
we run: a dropped file is parsed in your browser, and `LUORA_DATA_PATH` is read by your own dev server.

## AI provider

See [docs/ai-provider.md](docs/ai-provider.md).

## MCP

See [docs/mcp.md](docs/mcp.md).

## Repo

| Path | What |
| --- | --- |
| `apps/frontend` | The Next.js app (Trace, Atlas). UI rules in `apps/frontend/DESIGN.md` |
| `foundry` | The exporter scripts plus the LuoraVault sample project they are tested on |
