# Recorded static-analysis reports for `src/LuoraVault.sol`

Real tool output (not hand-written), imported by `luora-findings.mjs` when `node luora-export.mjs` runs.

| File | Tool | Command (run in `foundry/`) |
| --- | --- | --- |
| `slither.json` | Slither 0.11.6 (`uv tool install slither-analyzer`) | `slither . --json reports/slither.json --filter-paths 'lib\|test'` |
| `aderyn.json` | Aderyn 0.6.8 (`npm i @cyfrin/aderyn`) | `aderyn . -o reports/aderyn.json` |

Regenerate after changing the contracts; findings outside the atlas contract's file (e.g. `src/mocks/`) are ignored.
