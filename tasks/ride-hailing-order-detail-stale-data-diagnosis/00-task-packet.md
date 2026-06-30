# Ride Hailing Order Detail Stale Data Diagnosis

## Objective & Hypothesis

- Reality: diagnose why a newly created RideHailing order can momentarily show
  the previous finished RideHailing order detail, then later switch to the new
  order detail.
- Hypothesis:
  - the symptom is not explained by TanStack Vue Query default
    `keepPreviousData`-style caching alone
  - the frontend currently lacks an order-identity guard on the Order Detail
    route, so any transient mismatched `detail` payload can be rendered
  - RideHailing order-detail reads are slower than ordinary detail reads because
    backend `GET /api/commerce/orders/:orderId` synchronously queries the
    provider on each detail read when a provider order id exists
  - there is a second, separate backend/domain defect: finished RideHailing
    orders still keep base `order.status = OPEN`, so frontend "existing active
    order" lookup can misclassify terminal RideHailing orders as reusable
    active orders

## Guardrails Touched

- Frontend order detail route:
  - `apps/frontend/src/pages/CommerceOrderDetailPage.vue`
  - `apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue`
  - `apps/frontend/src/domains/commerce/queries/useCommerce.ts`
- Frontend order entry / existing-order reuse:
  - `apps/frontend/src/domains/commerce/use-cases/usePlacementOrderingEntryFlow.ts`
- Backend order detail and provider sync:
  - `apps/backend/src/domains/trade/use-cases/rental-ordering-flow.ts`
  - `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`
  - `apps/backend/src/domains/ride-hailing/use-cases/sync-ride-hailing-order-with-provider.ts`
  - `apps/backend/src/controllers/partner-request.controller.ts`
- Existing scenario truth:
  - `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts`

## Verification

- Completed code-trace checks:
  - `queryKeys.commerce.orderDetail(orderId)` is keyed by explicit `orderId`;
    no direct evidence of a reused cache key
  - `VueQueryPlugin` is installed without custom `defaultOptions`
  - repo search found no project-level `placeholderData`,
    `keepPreviousData`, `setQueryDefaults`, or `RouterView` keep-alive/key
    customization affecting this route
  - runtime probe against `@tanstack/query-core` showed key switch default does
    not keep previous data
  - runtime probe against actual `@tanstack/vue-query` showed there is only an
    immediate same-tick stale window before the watcher applies the new
    `pending` state; this alone does not explain a multi-second stale render
- Confirmed backend timing amplifier:
  - RideHailing order detail projection calls
    `syncRideHailingOrderWithProvider(... trigger: "ORDER_DETAIL_POLL")` before
    returning detail when `providerOrderId` exists
- Confirmed separate status-model issue:
  - `apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts`
    asserts `updatedOrder.status === "OPEN"` while
    `updatedRide.executionPhase === "FINISHED"`

## Current Understanding

- Frontend cache-key collision is unlikely to be the primary cause.
- A safer frontend invariant is currently missing:
  - Order Detail should never render `detail.order.id !== route.params.orderId`
  - without that guard, any transient mismatched payload can leak to the UI
- Backend RideHailing detail reads are materially slower than Rental detail
  reads because provider sync is in-band with the read path.
- Finished RideHailing orders remaining `OPEN` is a likely adjacent bug and may
  affect `usePlacementOrderingEntryFlow()` existing-order reuse from PR entry.

## Proposed Next Step

- Current active slice:
  - instrumentation is now in place across frontend and backend
  - next reproduction should answer, with a shared `sessionId/requestId`,
    whether stale detail was retained on the frontend or returned by backend

## Current Collaboration State

- Human confirmed the stale view happens without leaving the Order Detail page.
  That removes the `GET /pr/:id/orders` existing-order reuse path from the main
  suspect set for this incident.
- Human confirmed the stale view contains the previous order's driver, status,
  map, and bill simultaneously. That means the stale UI behaves like a full old
  `detail` snapshot rather than an isolated provider-live subsection mismatch.
- Current working hypothesis:
  - the page keeps rendering an old full `CommerceOrderDetailResponse` until a
    slower fresh detail read returns
  - the same stale-detail persistence likely explains the post-cancel
    `接客中 -> 已取消` lag
- Current non-goal:
  - do not fix business logic yet
  - first use the new instrumentation to answer whether the stale screen came
    from:
    - frontend retaining old `detail`
    - backend returning an old `detail.order.id`
    - backend returning a correct `order.id` but stale nested RideHailing/bill
      content

## Active Instrumentation Scope

- Frontend:
  - route `orderId` extraction
  - `useCommerceOrderDetail()` request lifecycle, refetch cause, query result
    snapshots, and polling transitions
  - Order Detail page render snapshots keyed by route `orderId`,
    `detail.order.id`, `ride.providerOrderId`, `executionPhase`, and `bill.id`
  - RideHailing cancel mutation lifecycle
  - Bill Card child query keyed by `detail.bill.id`
- Backend:
  - `GET /api/commerce/orders/:orderId` request entry and response summary
  - `getCommerceOrderDetail()` basis: base order id/family/status, ride order
    id/phase, bill id/status, and viewer
  - RideHailing provider execution context load:
    local `providerBinding.providerOrderId` and `providerInstanceId`
  - provider sync request/response summary and local mutation summary
  - RideHailing cancel flow before-sync, after-sync, provider cancel result,
    persistence result, and returned payload summary

## Instrumentation Control Surface

- Frontend debug enablement:
  - enabled automatically in `import.meta.env.DEV`
  - can also be forced by setting
    `localStorage["__partner_up_order_detail_debug__"] = "1"`
- Correlation model:
  - browser logs emit `[CommerceOrderDetailDebug]`
  - request headers propagate `sessionId`, `requestId`, `channel`, `source`,
    `trigger`, `routeOrderId`, `orderId`, and `billId`
  - backend logs emit the same `[CommerceOrderDetailDebug]` marker so one
    reproduction can be stitched across browser console and backend stdout
- High-signal event families:
  - frontend detail chain:
    `detail.query.start|success|error|state`,
    `detail.poll.evaluate|tick`,
    `page.snapshot`,
    `ride-content.snapshot`
  - frontend bill/cancel chain:
    `bill.query.start|success|error|state`,
    `bill-card.snapshot`,
    `cancel.mutation.start|success|error`,
    `cancel.query.invalidate`
  - backend detail/sync/cancel chain:
    `controller.order-detail.*`,
    `usecase.order-detail.*`,
    `ride-detail.build.*`,
    `ride-provider-context.*`,
    `ride-provider-sync.*`,
    `controller.cancel-order.*`,
    `cancel.dispatch.*`,
    `ride-cancel.*`

## Verification

- Completed after instrumentation:
  - `pnpm check:type:backend`
  - `pnpm check:type:frontend`
  - `pnpm check:format`
  - `pnpm check:lint`
- Expected proof from the next reproduction:
  - which route `orderId` the page believed it was on
  - which `detail.order.id` the page rendered before and after recovery
  - which `providerOrderId` backend used during detail reads and cancel flow
  - whether post-cancel UI lag came from stale frontend detail or delayed
    backend detail propagation
