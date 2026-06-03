# Issue 224 Beta Group Follow-Up

## Objective & Hypothesis

- Objective: expose the Anchor Event beta-group QR from PR detail surfaces, merge beta-group and official-account prompts into one join-success follow-up view, and highlight the beta-group card in List Mode when admin-only creation leaves users needing the group channel.
- Hypothesis: the event beta-group field and event-page card already exist, so the smallest safe slice is to project event context through `GET /api/pr/:id`, compose a PR join follow-up panel, and reuse the existing delayed expand/flash behavior for the beta-group card.

## Guardrails Touched

- `GET /api/pr/:id` read contract adds a nullable Anchor Event context projection.
- PR detail utility actions gain an event-specific beta-group QR modal when the projection carries a QR URL.
- PR join success prompt keeps notification subscription first, then presents one combined community follow-up when either beta-group QR or official-account prompt is available.
- Anchor Event List/Card Mode render the beta-group card only when the Anchor Event carries a beta-group QR URL.
- Anchor Event List Mode retains existing PR creation card behavior and applies the same attention behavior to the beta-group card for admin-only creation policy.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm lint:backend` passed.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/pr-core/pr-detail-anchor-event-context.scenario.test.ts` passed.
- `pnpm exec vitest run --project system-scenario tests/scenario/pr-core/pr-detail-join.scenario.test.ts` passed.
- `pnpm exec vitest run --project system-scenario tests/scenario/anchor-event/anchor-event-landing-distribution.scenario.test.ts` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed after the route-type edits were corrected outside this slice.
- `pnpm exec vitest run --project system-scenario tests/scenario/anchor-event/anchor-event-landing-distribution.scenario.test.ts` passed after adding no-beta-group coverage for List Mode and Card empty state.
