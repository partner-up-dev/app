# Issue 225 Confirmation Follow-Up

## Objective & Hypothesis

- Objective: when PR confirmation is enabled, show a dedicated join-success follow-up that explains the confirmation requirement, the time window, and the slot-release consequence, with the confirmation reminder subscription placed in that dedicated view.
- Hypothesis: the existing PR detail read model already exposes confirmation enablement and deadline data, so the smallest safe slice is a frontend join-success state-machine change plus product copy and scenario coverage.

## Guardrails Touched

- Input route: Intent
- Mode: Execute
- Durable owner: `docs/10-prd/behavior/`
- Frontend owner: PR join-success follow-up in `PRJoinFlow.vue`
- Notification subscription presentation keeps backend quota and channel truth unchanged.
- Persistent PR detail notification-subscription management remains unchanged.

## Verification

- Update the PR detail join scenario to assert the confirmation follow-up appears when confirmation is enabled.
- Verify the confirmation follow-up contains a notification subscription action button.
- Run targeted system scenario and frontend build where practical.

## Verification Results

- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm exec vitest run --project system-scenario tests/scenario/pr-core/pr-detail-join.scenario.test.ts` passed.
