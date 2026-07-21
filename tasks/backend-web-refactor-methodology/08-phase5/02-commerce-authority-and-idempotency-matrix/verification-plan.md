# 5-1 Verification Plan

- Before mutation: deterministic `rg`/import-parser inventory with paths and symbol names.
- If only task evidence changes: packet consistency and `git diff --check`.
- If a category surface is introduced: targeted importing-owner unit tests, `pnpm check:type:backend`, and the
  narrowest affected Commerce scenario compile/run.
- Do not run all Commerce scenarios merely to validate a report or an export manifest.
