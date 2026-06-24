# RideHailing Order Detail Back Navigation And Resolved Vehicle Plan

## Purpose

Open a new RideHailing Order Detail slice for two concrete UI problems:

- the header back button should return to the initiating page rather than the
  immediate previous `/order/new` page
- when the order has a resolved RideHailing item, the panel should show a
  `服务车型` section above `路线` and reuse the readonly `RideHailingSkuCard`

## Classification

- Primary input route: `Reality`
- Current mode: `Execute`
- Production-code mutation has now been completed for this slice

## Current Facts

- Current page shell:
  `apps/frontend/src/pages/CommerceOrderDetailPage.vue`
- Current RideHailing detail content:
  `apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue`
- Current shared back behavior:
  `apps/frontend/src/shared/routing/useFallbackBack.ts`
- Current shared readonly card:
  `apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue`
- Current order-detail scenario:
  `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`

Current back-navigation behavior:

- `CommerceOrderDetailPage` binds the page-header back event to
  `useFallbackBack`.
- `useFallbackBack` calls `router.back()` whenever the browser/router history
  contains a back entry.
- In the standard RideHailing ordering flow
  `PR Page -> /order/new -> /orders/:orderId`, that means Order Detail returns
  to `/order/new`, not to the initiating page.

Current resolved-item data availability:

- RideHailing order detail already contains the raw `detail.order.items`
  snapshots.
- The page already has a concrete SKU-resolution preference:
  `item.resolution?.sku ?? item.candidates[0]?.sku`.
- Therefore this slice does not need a new backend projection just to detect a
  resolved RideHailing service vehicle.

Current panel-content behavior:

- `RideHailingOrderContent` renders:
  - status hero
  - optional driver card
  - dispatching-only candidate vehicles
  - route section
  - rider section
- There is no dedicated resolved service-vehicle section.

## Target Behavior

Back navigation:

- In the normal RideHailing order-creation handoff flow, Order Detail back
  should skip the intermediate ordering page and return to the initiating page.
- Generic fallback behavior outside this flow must remain safe.

Resolved service vehicle section:

- When the RideHailing order item has a resolution with a resolved SKU, the
  panel should render a `服务车型` section above `路线`.
- The section should reuse `RideHailingSkuCard` in readonly mode.
- The existing dispatching-only candidate-vehicle section remains a separate
  concern and should not be conflated with the resolved service-vehicle section.

## Likely Touch Surface

- `apps/frontend/src/pages/CommerceOrderDetailPage.vue`
- `apps/frontend/src/shared/routing/useFallbackBack.ts` or a RideHailing-order
  specific back-navigation seam near page scope
- `apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue`
- `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`

## Open Design Checks

- Whether the “return to initiating page” rule should be implemented as:
  - a RideHailing Order Detail page-local back policy
  - a reusable routing helper that can skip one history entry when the current
    route is known to be the second hop of an ordering handoff
- For the resolved vehicle card price label, prefer:
  - `resolution.quoteSnapshot.amountFen` when available
  - a stable fallback when only resolved SKU facts exist
- Whether a dedicated section test id should be added, for example
  `order-detail.ride-hailing.resolved-vehicle-section`

## Implemented Decisions

- Back navigation is page-local to `CommerceOrderDetailPage`; the slice does
  not widen `useFallbackBack` into a more complex shared helper.
- The page skips `/order/new` only when that path is the current immediate
  router back entry.
- When safe two-step history back is unavailable, the page falls back to the
  PR path stored in the ordering handoff store.
- Resolved service vehicle rendering stays in `RideHailingOrderContent` because
  the page already passes full order detail into the presentational component.
- The new `服务车型` section is independent from the dispatching-only candidate
  list; it does not replace that list.

## Verification Candidate

- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm exec biome check` on changed frontend and task files
- `pnpm exec vitest run --config vitest.config.ts --project system-scenario -t "commerce_ride_hailing_ordering_reaches_order_detail"`
- focused browser/manual check:
  - create RideHailing order from PR
  - verify Order Detail back skips `/order/new`
  - verify resolved vehicle card appears above route facts after resolution

## Verification Result

- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm exec biome check apps/frontend/src/pages/CommerceOrderDetailPage.vue apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
- `pnpm exec vitest run --config vitest.config.ts --project system-scenario -t "commerce_ride_hailing_ordering_reaches_order_detail"`
