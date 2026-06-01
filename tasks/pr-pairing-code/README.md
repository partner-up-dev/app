# PR Pairing Code

## Objective & Hypothesis

Add a PR-owned offline pairing aid for READY PRs: active participants can see a deterministic 4-digit pairing code in the PR detail primary actions area and open a full-screen code display for on-site discovery.

Hypothesis: a stable, non-authoritative 4-digit visual code is enough for nearby participants to identify each other while keeping identity and participation rules under the existing PR viewer state.

## Guardrails Touched

- Product truth: `docs/10-prd/behavior/workflows.md`, `docs/10-prd/behavior/capabilities.md`
- Frontend PR route entrypoint and PR-domain UI
- Frontend route wiring
- Frontend unit tests

## Verification

- `pnpm exec vitest run --project frontend-unit apps/frontend/src/domains/pr/model/pr-pairing-code.test.ts apps/frontend/src/pages/PRPage.creator-actions.test.ts apps/frontend/src/pages/PRPairingCodePage.test.ts`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - The new pairing-code files do not add token findings. The command still reports existing findings in `src/shared/ui/forms/MultiStopToggle.vue` and `src/domains/commerce/ui/ButtonPlacement.vue`.
- Browser check opened `/pr/123/pairing-code` through the local frontend dev server and confirmed the route reaches a nonblank error state without backend/session data. Authorized full-screen code rendering is covered by component tests.
