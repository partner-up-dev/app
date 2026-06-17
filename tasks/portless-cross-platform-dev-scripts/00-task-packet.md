# Portless Cross-Platform Dev Scripts

## Objective & Hypothesis

Make the root portless dev entries usable on macOS, Linux, and Windows without changing the public dev server entry names.

Hypothesis: the PowerShell scripts are only a thin platform adapter. Replacing the root entry adapter with Node keeps Windows-specific OpenSSL PATH handling while removing the macOS dependency on PowerShell.

## Guardrails Touched

- Root developer workflow scripts in `package.json`.
- Local portless availability contract in `docs/40-deployment/environments.md` and `docs/20-product-tdd/cross-unit-contracts.md`.
- No frontend/backend runtime contract changes.
- Public dev entries must remain:
  - `pnpm dev:ensure`
  - `pnpm dev:portless`
  - `pnpm dev:portless:frontend`
  - `pnpm dev:portless:backend`

## Verification

- Passed: `node ./scripts/portless.mjs --help`
- Passed: `node --check ./scripts/portless.mjs && node --check ./scripts/ensure-dev-servers.mjs`
- Passed: `pnpm exec biome check scripts/portless.mjs scripts/ensure-dev-servers.mjs package.json docs/40-deployment/environments.md docs/20-product-tdd/cross-unit-contracts.md tasks/portless-cross-platform-dev-scripts/00-task-packet.md`
- Passed: `pnpm dev:ensure`
- Passed: repeat `pnpm dev:ensure` reuses existing routes without duplicate starts.
- Passed: `portless list` shows `https://partner-up.localhost` and `https://api.partner-up.localhost`.
- Passed: `curl -k -I https://partner-up.localhost` returns HTTP 200.
- Passed: `curl -k -I https://api.partner-up.localhost` returns HTTP 404, which proves the backend server is reachable through portless and the root path is simply not routed.

## Current Understanding

- `scripts/portless.ps1` only prepends Git for Windows OpenSSL to `PATH` and forwards arguments to `portless`.
- `scripts/ensure-dev-servers.ps1` checks `portless list`, starts missing frontend/backend scripts, writes logs under `.codex-tmp/dev-servers`, and polls until both stable routes are registered.
- `portless` itself already supports the current `--name ... -- pnpm ... dev` command shape.
- Root scripts now use `scripts/portless.mjs` and `scripts/ensure-dev-servers.mjs`.
- The old PowerShell helper files have no remaining references and are removed to avoid duplicate startup logic.
- Backend `dev` now loads `apps/backend/.env` through `tsx watch --env-file-if-exists=.env`, matching the old fixed-port helper's local env behavior.
- `dev:ensure` now checks both route registration and HTTP reachability; stale 5xx routes are restarted through a force-only ensure path.

## Next Step

Ready for review.
