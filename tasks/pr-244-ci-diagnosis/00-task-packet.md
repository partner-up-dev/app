# Task Packet - PR 244 CI Diagnosis

Date: 2026-06-02

PR: `partner-up-dev/mvp-HA#244`

Head: `develop` at `8e3f8db3eb45e52103d79762147b27b3c0e7952f`

Base: `master` at `2e051f84bc0e2f7516e4a83f995fd026a90e8c33`

## Objective & Hypothesis

- Objective & Hypothesis: diagnose and repair each failing CI check for PR #244 with a poly-file task packet. Hypothesis: the failures are not one systemic outage; they are several contract drifts across frontend token governance, backend scenario tests, trade domain test helpers, and system scenario UI contracts.
- Input classification: `Reality` plus `Artifact`.
- Active modes: `Diagnose`, then `Execute`.
- Implementation status: completed after explicit approval.

## Guardrails Touched

- Volatile task packet under `tasks/`.
- Frontend token governance for design-token correctness.
- Backend scenario API contracts for Anchor Event and Trade.
- System scenario contracts for stable `data-testid` nodes, user-visible copy, and commerce ordering flow.
- GitHub CI check inspection through `gh`; GitHub connector MCP startup failed, so `gh` was the reliable source for checks and logs.

## Verification

- Confirmed local branch state: `develop` at PR head SHA and clean before packet creation.
- Confirmed GitHub auth through `gh auth status`.
- Read PR metadata with `gh pr view 244 --repo partner-up-dev/mvp-HA`.
- Inspected failing check logs with the bundled GitHub CI script and `gh run view`.
- Cross-checked failing log lines against source/test ownership with targeted `rg` and file reads.
- Used read-only sub-agent analysis for backend-gate root causes; no source/test files were changed.
- Checked WeChat scenario env presence without printing secrets; local `.env` has WeChat ability mocking enabled, but CI `e2e-gate.yml` does not set the equivalent mock env.
- Repaired frontend token governance, backend scenario contracts, trade foundation helpers, system scenario UI/ordering contracts, and CI E2E mock env.
- Verification after repair:
  - `pnpm --filter @partner-up-dev/frontend lint:tokens:strict`
  - `pnpm test:unit:frontend`
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm lint:backend`
  - `pnpm test:unit:backend`
  - `pnpm db:lint`
  - `pnpm test:scenario:backend`
  - `pnpm test:scenario:system`

## Packet Files

- `10-ci-check-summary.md`: failing checks, run/job IDs, and high-level outcome.
- `20-frontend-gate-token-governance.md`: token governance failures and causes.
- `30-backend-gate-scenario.md`: backend scenario failures and causes.
- `40-e2e-gate-system-scenario.md`: system scenario failures and causes.
- `50-repair-slices.md`: proposed repair slices and verification boundaries; not an implementation plan approval.
- `60-repair-results.md`: completed repair slices and final verification.
