# Luora exporter

Plain Node scripts (no dependencies) that run your Foundry tests and write `luora-data.json` for the
Luora app. This folder is also the LuoraVault sample project they are developed against.

## Install

Copy these five files into the root of your Foundry project (next to `foundry.toml`).
`luora-export.mjs` imports the other four, so keep them side by side:

| File | Adds |
| --- | --- |
| `luora-export.mjs` | Entry point: `forge build`, `forge test --json -vvvv`, one `forge test --debug --dump` per unit test; writes `tests` and `sources` |
| `luora-lib.mjs` | ABI decoding, keccak, source maps |
| `luora-atlas.mjs` | The `atlas` section (contract map) from `forge build --ast` and `forge inspect … storageLayout` |
| `luora-findings.mjs` | Merges Slither / Aderyn JSON reports into the atlas findings |
| `luora-coverage.mjs` | `atlas.coverage` from `forge coverage --report lcov` |

```sh
cp luora/foundry/luora-{export,lib,atlas,findings,coverage}.mjs path/to/your-project/
```

Needs Node 20+ and `forge` on PATH.

## Run

```sh
node luora-export.mjs                       # all tests
node luora-export.mjs --mt test_deposit     # one test (other forge test flags pass through too)
node luora-export.mjs --slither=out/slither.json --aderyn=report.json
LUORA_ATLAS=MyVault node luora-export.mjs   # pick the contract the atlas maps
```

- Static-analysis reports are optional. Without flags it picks up `reports/slither.json`,
  `reports/aderyn.json`, `slither.json` and `report.json` if present. Generate them with
  `slither . --json reports/slither.json` and `aderyn . -o reports/aderyn.json`.
- If the atlas or coverage step fails, the export still writes the traces and prints
  `luora: atlas skipped — …` / `luora: coverage skipped — …`.
- Fuzz and invariant tests are listed, but only unit tests get source-line step data.

Output: `luora-data.json` in the project root (`generatedAt`, `forgeVersion`, `command`, `tests`,
`sources`, `atlas`). Add it to `.gitignore`.

## Load it in the app

Drop the file into the app (*Sample data → Use my project*), or start the app with
`LUORA_DATA_PATH=/abs/path/luora-data.json`. See the root [README](../README.md).

## Develop

```sh
forge build && node --test *.test.mjs   # exporter unit tests (run in foundry/)
forge test                 # the LuoraVault sample suite
```
