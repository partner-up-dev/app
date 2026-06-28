# Terminal Polling Stop And PR-Ready Recovery Plan

## Objective

- stop unnecessary RideHailing order-detail polling after terminal order states
- add a creator-oriented recovery path when create-order is blocked by
  `PR_NOT_READY`

## Classification

- Primary route: `Reality`
- Active mode: `Explore`

## Confirmed Truth

- `useCommerceOrderDetail()` already has the right high-level polling boundary:
  only active RideHailing execution phases should poll
- `CommerceOrderDetailPage.vue` still adds a second RideHailing-only refetch
  timer that is bill-existence-based instead of phase-based
- `OrderingPage.vue` already maps business failures into a blocked dialog
- backend `create-order` already returns `PR_NOT_READY`
- frontend already has `useUpdatePRStatus()` and does not need a new PR-status
  transport for this slice

## Address And Object

- polling behavior:
  - `apps/frontend/src/domains/commerce/queries/useCommerce.ts`
  - `apps/frontend/src/pages/CommerceOrderDetailPage.vue`
- create-order recovery dialog:
  - `apps/frontend/src/pages/OrderingPage.vue`
  - `apps/frontend/src/domains/commerce/ui/ordering/OrderingPageShell.vue`
    if shared-shell promotion proves justified
- verification:
  - `apps/frontend/src/domains/commerce/queries/useCommerce.test.ts`
  - relevant ordering / ride-hailing scenario coverage under
    `tests/scenario/commerce/`

## State Diff

- From:
  - terminal RideHailing orders may still refetch because page-local polling is
    keyed to bill existence
  - `PR_NOT_READY` only shows a passive blocked dialog
- To:
  - terminal RideHailing orders stop polling
  - creators blocked by `PR_NOT_READY` can choose a dialog path to mark the PR
    `READY` after explicit confirmation, then remain in Ordering

## Verification

- no further polling requests after RideHailing terminal order states
- `PR_NOT_READY` dialog exposes the recovery action only when it is actually
  admissible
- successful PR status update keeps the user in Ordering and closes the
  confirmation flow cleanly

## Implementation Result

- `CommerceOrderDetailPage.vue` no longer adds a page-local RideHailing polling
  timer; `useCommerceOrderDetail()` remains the only polling owner
- `OrderingPage.vue` now distinguishes generic info dialogs from:
  - recoverable `PR_NOT_READY` blocked dialogs
  - second-step PR-ready confirmation dialogs
- the PR-ready recovery path reuses `usePRDetail()` for creator gating and
  `useUpdatePRStatus()` for the mutation
- after successful PR status update, the flow stays in Ordering and asks the
  user to re-click create-order explicitly
- `OrderingPageShell.vue` stays structural-only in this slice

## Verification Result

- `pnpm check:type:frontend`
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`

## Segment Status

- completed and verified
