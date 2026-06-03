# BI Official Account Nudge Click Rate

## Objective & Hypothesis

- Objective: show official-account follow Nudge click-through performance in the BI dashboard.
- Hypothesis: the existing user telemetry events can derive the BI metric directly: `official.account.follow.nudge.action.click` with `action = "complete"` represents the user clicking the Nudge's follow button.

## Guardrails Touched

- Backend analytics read model and `/api/analytics/anchor-event-funnel` response shape.
- Frontend admin analytics dashboard rendering and localized BI copy.
- Product TDD analytics contract.

## Verification

- Completed: `pnpm --filter @partner-up-dev/backend test:unit -- anchor-event-funnel.model.test.ts` covers Nudge shown, follow-click, dismiss, and source breakdown.
- Completed: `pnpm --filter @partner-up-dev/backend typecheck` verifies analytics query/model typing.
- Completed: `pnpm lint:backend` passed the backend Problem Details guardrail.
- Completed: `pnpm --filter @partner-up-dev/frontend build` verifies the expanded RPC response reaches the BI page.
- Completed: `pnpm --filter @partner-up-dev/frontend lint:tokens` reports no token governance findings outside baseline.
- Completed: targeted `git diff --check` passed for the touched files.
