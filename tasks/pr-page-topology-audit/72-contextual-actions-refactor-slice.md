# Contextual Actions Refactor Slice

Status: implemented in working tree.

## Objective & Hypothesis

Delete the `PRContextualActions` umbrella controller and replace it with peer PR participation action components that are directly arranged by `PRPage`.

Hypothesis:

- Splitting by user capability creates a clearer topology than one contextual controller.
- `PRPage` should own the canonical PR detail query and pass `PRDetailView` to each action component.
- Each action component should own its rendering, copy, modal/dialog state, mutation hooks, and visibility rules.
- Query invalidation from mutation hooks is enough to refresh the canonical read model; live polling can be removed.

## Guardrails Touched

- Frontend route entrypoint: `apps/frontend/src/pages/PRPage.vue`
- PR domain action UI:
  - `PRJoinExitActions.vue`
  - `PRWaitlistActions.vue`
  - `PRConfirmationAction.vue`
  - `PRCheckInFeedbackActions.vue`
- PR domain action helpers:
  - `usePRActionCopy.ts`
  - `usePRPrimaryActionTelemetry.ts`
  - `pr-join-entry-context.ts`
- Durable telemetry note: `docs/20-product-tdd/cross-unit-contracts.md`
- Removed:
  - `PRContextualActions.vue`
  - `usePRLivePolling.ts`

## Implementation Notes

- `PRPage` now renders participation capabilities as ordinary peer components:
  - waitlist
  - confirmation
  - check-in / feedback
  - join / exit
- `PRDraftPublishNotice` no longer emits `published`; `usePublishPR` invalidates the relevant query keys.
- Pending WeChat replay remains in `PRPage`, routed to the relevant component expose:
  - `PR_JOIN` -> `PRJoinExitActions.replayJoin`
  - `PR_EXIT` -> `PRJoinExitActions.replayExit`
  - `PR_WAITLIST` -> `PRWaitlistActions.replayWaitlist`
  - `PR_CONFIRM` -> `PRConfirmationAction.replayConfirm`
- `PRJoinEntryContext` remains as a temporary attribution bridge and is documented as context erosion in `cross-unit-contracts.md`.
- Known residual: `PRJoinFlow` still owns an internal `usePRDetail` observer for success-prompt fallback data. This should be handled in a later slice.
- Known residual: pending WeChat replay is still hand-dispatched inside `PRPage`; follow-up target is `usePRPendingWeChatReplay` with a small action registry.
- Follow-up design notes for replacing `PRJoinFlow` / `PRWaitlistFlow` live in `74-join-waitlist-flow-follow-up.md`.

## Verification

- `pnpm exec vitest run --project frontend-unit apps/frontend/src/domains/pr/ui/sections/PRParticipationActions.test.ts apps/frontend/src/pages/PRPage.creator-actions.test.ts`
- `pnpm test:unit:frontend`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- `git diff --check`
- `rg -n "PRContextualActions|usePRLivePolling|handlePRActionSuccess|@published=|@action-success|resetLivePolling" apps/frontend/src tests`
