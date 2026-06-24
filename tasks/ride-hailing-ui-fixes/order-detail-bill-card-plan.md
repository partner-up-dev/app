# RideHailing Order Detail Bill Card Plan

## Objective

- add a reusable Bill Card component that takes `billId`, loads bill detail by
  itself, and renders price plus a `查看` action
- render that Bill Card in RideHailing order detail when the order already has
  a bill
- place the card above
  `order-detail.ride-hailing.resolved-vehicle-section`

## Classification

- Primary route: `Reality`
- Active mode: `Execute`

## Confirmed Truth

- frontend already has `useBillDetail(billId)` in
  `apps/frontend/src/domains/commerce/queries/useCommerce.ts`
- bill detail route already exists at `/bills/:billId`
- `CommerceOrderDetailPage` already gets `detail.bill?.id`
- RideHailing final bill is created from the provider final-amount callback,
  not from a separate manual admin action
- current RideHailing order detail has no bill card section

## Proposed Address And Object

- `apps/frontend/src/domains/commerce/ui/order-detail/`
  - add Bill Card component
- `apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue`
  - insert Bill Card above resolved vehicle section
- `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - assert bill-card appearance and bill-detail navigation
- task packet logs
  - record the implementation result and verification

## State Diff

- From:
  RideHailing order detail has no bill-specific entry even after bill creation.
- To:
  once `detail.bill?.id` exists, RideHailing order detail shows a Bill Card
  above resolved vehicle information; the card owns its own bill fetch and
  links to bill detail.

## Blast Radius Forecast

- frontend only unless bill-detail query shape proves insufficient
- scenario coverage should expand because the RideHailing finished state is the
  first likely bill-appearance point
- existing Rental order detail bill section should remain unchanged

## Invariants Check

- do not widen the Bill Card input contract beyond `billId` unless evidence
  forces it
- do not regress the existing resolved-vehicle section placement
- keep RideHailing `RideHailingSkuCard` usage unchanged
- keep existing `/bills/:billId` destination stable

## Verification Plan

- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm exec biome check apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue apps/frontend/src/domains/commerce/ui/order-detail/*.vue tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
- `pnpm exec vitest run --config vitest.config.ts --project system-scenario -t "commerce_ride_hailing_ordering_reaches_order_detail"`

## Implementation Result

- added `apps/frontend/src/domains/commerce/ui/order-detail/BillCard.vue`
- added shared bill display helper
  `apps/frontend/src/domains/commerce/model/bill-display.ts`
- Bill Card stays bill-id-owned and fetches canonical detail with
  `useBillDetail(billId)`
- RideHailing order detail now renders:
  - `账单`
  - `服务车型`
  - `路线`
  in that order whenever both bill and resolved vehicle exist
- Bill Card UI shape is:
  - status tag
  - amount
  - `查看`
  with no repeated internal `账单` title or `Bill` eyebrow

## Verification Result

- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm exec biome check apps/frontend/src/domains/commerce/model/bill-display.ts apps/frontend/src/domains/commerce/ui/order-detail/BillCard.vue apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue apps/frontend/src/pages/CommerceBillDetailPage.vue tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
- `pnpm exec vitest run --config vitest.config.ts --project system-scenario -t "commerce_ride_hailing_ordering_reaches_order_detail"`
- `git diff --check`
