# Dev Server Ensure Entry

## Objective & Hypothesis

Add a single agent-facing entry that ensures the frontend and backend development
servers are available without encouraging agents to start duplicate dev servers.

Hypothesis: the durable default should remain portless-managed. A thin ensure
wrapper should prefer `portless.json` app identities (`partner-up`,
`api.partner-up`) over fixed numeric ports.

## Guardrails Touched

- Root operational guidance: `AGENTS.md`
- Local runtime truth: `docs/40-deployment/environments.md`
- Cross-unit local development contract: `docs/20-product-tdd/cross-unit-contracts.md`
- Script/package entrypoints: `scripts/`, root `package.json`

## Current Understanding

- `pnpm dev:portless` is already the durable default full-stack entry.
- `portless list` currently shows both active routes:
  - `https://partner-up.localhost`
  - `https://api.partner-up.localhost`
- Existing `scripts/start-dev-server-if-port-free.ps1` uses fixed ports
  `4001` and `4002`, which is compatibility behavior rather than the current
  default portless workflow.
- `portless` is available globally in this environment, not as a project
  dependency. An ensure script should fail with a direct diagnostic if the
  command is missing.

## Proposed State Diff

- From: agents are told to use `pnpm dev:portless`, and may still manually start
  frontend/backend dev commands when they only need servers available.
- To: agents are told to run a named ensure command first. The command checks
  or starts the portless-managed frontend/backend pair and reports stable URLs.

## Verification

- Static: PowerShell syntax parse for `scripts/ensure-dev-servers.ps1` passed.
- Static: `package.json` JSON parse passed.
- Runtime, non-invasive: `pnpm dev:ensure` reported existing routes and exited
  without starting duplicate services.

## Outcome

- Added `scripts/ensure-dev-servers.ps1`.
- Added root script `pnpm dev:ensure`.
- Updated root agent guidance and durable local runtime docs to use the ensure
  entry before browser/manual validation.
