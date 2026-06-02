# PR Status Lifecycle Simplification

## Objective & Hypothesis

Simplify durable `PR.status` by removing `FULL` and `LOCKED_TO_START`.

Hypothesis:

- `FULL` should remain user-visible as a derived capacity state from `OPEN`
  PRs, not as persisted lifecycle state.
- `READY` should carry the former lock-to-start semantics: roster locked,
  not joinable, not exitable, not waitlistable, and order-attachable.
- Temporal refresh should move `OPEN` or `READY` PRs to `ACTIVE` when the
  time window starts.

## Guardrails Touched

- Product lifecycle truth in `docs/10-prd/behavior`.
- Cross-unit PR lifecycle and commerce contracts in `docs/20-product-tdd`.
- Backend PR entity status schema, temporal refresh, waitlist, partner section,
  analytics, and Anchor Event full-expansion policy.
- Frontend PR status display, action copy, Admin PR filtering, and Admin PR
  status editing layout.
- Forward-only data migration for existing `FULL` and `LOCKED_TO_START` rows.

## Verification

- Passed `pnpm exec vitest run --project backend-unit apps/backend/src/domains/pr-core/services/status-rules.test.ts apps/backend/src/domains/pr-core/services/waitlist.service.test.ts apps/backend/src/domains/pr-core/services/partner-section-view.service.test.ts`.
- Passed `pnpm exec vitest run --project frontend-unit apps/frontend/src/domains/pr/ui/primitives/PRPreviewCard.route.test.ts apps/frontend/src/pages/PRPage.creator-actions.test.ts`.
- Passed `pnpm lint:backend`.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` reported existing findings outside this task's files: Study Sprint page radius, MultiStopToggle padding, and commerce ButtonPlacement undefined text token.
- Passed `pnpm build:backend`.
- Passed `pnpm build:frontend`.
- Passed `pnpm exec vitest run --project backend-scenario apps/backend/tests/pr-core/pr-join.scenario.test.ts apps/backend/tests/pr-core/pr-waitlist.scenario.test.ts apps/backend/tests/pr-core/pr-temporal-finalization.scenario.test.ts apps/backend/tests/anchor-event/anchor-event-full-pr-expansion-policy.scenario.test.ts`.
- Passed `pnpm exec vitest run --project backend-scenario apps/backend/tests/pr-core/pr-join-gates.scenario.test.ts`.
- Passed `pnpm db:lint`.
