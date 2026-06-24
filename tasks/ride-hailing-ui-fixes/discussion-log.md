# Discussion Log

This file is the current working discussion surface. Keep it short enough to
reload at the start of a slice.

Archived full history:

- `archive/discussion-log-ordering-through-order-detail-map.md`

## Current Segment: Bill Detail Page Reset And Data Audit

- New requested slice:
  - first remove the current Bill Detail page body content
  - remove the Bill Detail header description/subtitle
  - then inspect actual Bill and BillLine information before deciding the new
    UI
- Current code findings:
  - current `CommerceBillDetailPage` is still a generic two-card document page
    with duplicated `Bill` / `Lines` eyebrows and a summary-grid-first layout
  - current page-level copy assumes a stable model of "每个人只支付自己的账单行",
    but the backend projection already contains both charge and refund facts
  - backend `BillDetailProjection.bill` currently exposes:
    - id
    - sourceOrderId
    - status
    - currency
    - chargeTotalFen
    - paidChargeFen
    - refundTotalFen
    - refundedFen
    - settlementStatus
  - backend `BillDetailProjection.order` currently exposes:
    - id
    - family
    - status
    - itemName
  - backend `BillDetailProjection.lines[]` currently exposes:
    - id
    - userId
    - kind
    - amountFen
    - currency
    - label
    - description
    - refundOfBillLineId
    - settlementStatus
    - paidFen
    - refundedFen
    - payableByViewer
    - checkoutHref
    - paymentProviderInstanceId
    - attemptCount
    - settledAt
  - important reality check:
    frontend currently handles `ACTION_REQUIRED` and `FAILED` line labels, but
    present `getBillDetail` line status is derived from `deriveBillPaymentState`
    and, in the current implementation, reliably yields
    `UNPAID / PROCESSING / PAID / REFUND_PENDING / REFUNDED`
- Design pressure observed:
  - bill-level data should own header summary only; page body should stay
    line-driven
  - payment action belongs only to viewer-payable charge lines, not to the bill
    shell as a whole
  - payer avatar/name is required for the chosen line-card layout, so
    `userId`-only projection is insufficient
- Implementation result:
  - removed the current Bill Detail header subtitle
  - removed the current successful-state Bill Detail body content
  - kept invalid-id, loading, error, and back-navigation behavior intact
  - backend `BillDetailProjection.bill` now exposes backend-owned
    `totalAmountFen`
  - backend `BillDetailProjection.lines[]` now exposes enriched payer
    presentation data:
    - `userId`
    - `nickname`
    - `displayName`
    - `avatarUrl`
    - `isViewer`
  - rebuilt `CommerceBillDetailPage` IA:
    - `查看订单` moved into `PuPageHeader` actions
    - `状态` and inline `总金额` moved into header meta
    - bill lines render as card rows with amount, status tag, payer, and
      description
    - footer CTA is single-select and bill-line-scoped
  - selection model follows backend `payableByViewer` only; non-payable lines
    stay visible but disabled
  - `BillLineCard` uses a visual-only checkbox and `usePuSelect` single-select
    state
  - implementation note:
    design-web `PuCard` does not inherit arbitrary attrs, so stable
    `bill-detail.line` anchors live on a native outer wrapper while the inner
    selectable `PuCard` keeps the role/button interaction model
- Follow-up layout correction:
  - BillLine card top row now matches the agreed structure:
    checkbox, amount/status cluster, payer avatar/nickname cluster
  - card body now shows description text only; the extra standalone label row
    was removed
  - payer nickname no longer appends `你`
  - payer name width is constrained from the BillLine card container with
    container-query units when available
  - bill-detail success state now uses a real `justify-content: space-between`
    column layout so the CTA sits at the bottom of the `PuPageScaffold`
    screen viewport without relying on `sticky`
- Verification result:
  - `pnpm exec biome check` on changed frontend/backend/scenario files
  - `pnpm --dir apps/frontend exec vue-tsc --noEmit`
  - `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
  - targeted system scenario passed:
    `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts -t "commerce_ride_hailing_ordering_reaches_order_detail"`
- Follow-up verification result:
  - `pnpm exec biome check apps/frontend/src/domains/commerce/ui/bill-detail/BillLineCard.vue apps/frontend/src/pages/CommerceBillDetailPage.vue tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm --dir apps/frontend exec vue-tsc --noEmit`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts -t "commerce_ride_hailing_ordering_reaches_order_detail"`
- Next step:
  - ready for the next bill-detail slice or commit request

## Previous Segment: RideHailing Order Detail Bill Card

- New requested fix:
  - add a Bill Card component whose input is `billId`
  - the component should fetch canonical bill data by itself
  - the card should show bill price and a `查看` action that routes to bill
    detail
  - `RideHailingOrderContent` should render this card only when the order
    already has a bill
  - placement must be above
    `order-detail.ride-hailing.resolved-vehicle-section`
- Current code findings:
  - RideHailing order detail currently renders no bill-related UI inside
    `RideHailingOrderContent`
  - `CommerceOrderDetailPage` already receives `detail.bill?.id`, so the page
    can decide presence without widening the backend contract
  - frontend already has `useBillDetail(billId)` and routed bill detail page
    `/bills/:billId`
  - backend also exposes `GET /api/commerce/orders/:orderId/bill`, but the
    requested component contract is bill-id-owned, so that route is not
    required for this slice unless we hit an API-shape gap
  - Caocao final-amount callback already creates the RideHailing final bill,
    so the existing order-detail polling should be able to observe bill
    appearance after trip completion
- Implementation result:
  - added domain-owned `BillCard.vue` under RideHailing order-detail UI; the
    component input is only `billId`
  - the card fetches bill detail via `useBillDetail(billId)` and renders:
    - bill settlement `PuTag`
    - effective total amount
    - `查看` button to `/bills/:billId`
  - the card intentionally does not repeat a local `账单` title or `Bill`
    eyebrow because the parent section already owns the title
  - `RideHailingOrderContent` now renders a `账单` section above
    `order-detail.ride-hailing.resolved-vehicle-section` when `detail.bill?.id`
    exists
  - bill settlement label logic is now shared with `CommerceBillDetailPage`
    through `domains/commerce/model/bill-display.ts`
- Verification result:
  - `pnpm --dir apps/frontend exec vue-tsc --noEmit`
  - focused `biome check` on the changed frontend and scenario files
  - focused RideHailing system scenario now asserts:
    - bill section appears after the finished-state bill is created
    - bill section is ordered above resolved vehicle section
    - bill card displays `待支付`
    - `查看` routes to bill detail
    - bill detail can route back to order detail
- New slice planning artifact:
  `order-detail-bill-card-plan.md`

## Previous Segment: Order Detail Back Navigation And Resolved Vehicle Section

- Task-packet correction:
  previous notes overstated a visible `Call` text-label requirement on the
  Driver Card action. The actual accepted contract is that the right-side
  control is an action-oriented call affordance backed by `driverPhone`; the
  current icon-led button with accessible `联系司机` semantics is acceptable.
- New requested fixes:
  - Order Detail page back button should return to the initiating page rather
    than the immediate previous `/order/new` page
  - when a RideHailing order item has a resolved SKU, render a `服务车型`
    section above `路线`
  - reuse readonly `RideHailingSkuCard` for that resolved service vehicle
- Current code findings:
  - `CommerceOrderDetailPage` binds header back to `useFallbackBack`, and
    `useFallbackBack` calls `router.back()` whenever a back entry exists
  - in the normal PR -> `/order/new` -> `/orders/:orderId` flow, current back
    behavior therefore returns to the ordering page instead of the initiating
    page
  - current Order Detail data already contains raw `detail.order.items`
    snapshots; existing page code already prefers `item.resolution?.sku` over
    unresolved candidate SKU data
  - `RideHailingOrderContent` currently renders dispatching-only candidate
    cards, then route section, then rider section; no resolved service-vehicle
    section exists yet
- Implementation result:
  - `CommerceOrderDetailPage` no longer uses the generic single-step
    `useFallbackBack` policy; it now skips `/order/new` when that page is the
    immediate router back entry
  - when skip-back cannot safely use router history depth, the page falls back
    to the PR path held in the ordering handoff store
  - `RideHailingOrderContent` now renders a `服务车型` section above `路线`
    whenever a RideHailing choice-set item has `resolution.sku`
  - the new section reuses readonly `RideHailingSkuCard` and stays separate
    from the existing dispatching-only candidate list
- Verification result:
  - `pnpm --dir apps/frontend exec vue-tsc --noEmit`
  - focused `biome check` on the changed frontend and scenario files
  - focused RideHailing system scenario passed and now asserts:
    - resolved service-vehicle section content
    - back button returns to `/pr/:id`
- New slice planning artifact:
  `order-detail-back-and-resolved-vehicle-plan.md`

## Previous Segment: RideHailing Order Detail Driver Card And Live Geometry

- Requested fixes:
  - show a Driver Card whenever RideHailing order detail has driver or vehicle
    information, including accepted/pickup/in-trip/finished-like phases
  - make the map vehicle marker use the small top-view car icon from the
    uniapp route-map implementation
  - improve fake Caocao driver route / vehicle coordinate simulation so pickup
    and in-trip routes do not visually collapse into a straight endpoint line
  - verify whether fake Caocao `ACCEPTED` matches Caocao Open API semantics
- Driver data model:
  - `曹操测试司机` is example data, not a field name
  - fake Caocao emits it as `driverName`, callback form field
    `driver_name`, backend stores/projects it as `ride.driver.driverName`
  - frontend Driver Card should display `ride.driver.driverName` when present
  - the right-side control is a call action, not a phone-data field; the old
    packet wording incorrectly implied a required visible `Call` label
- Proposed Driver Card wireframe:

```text
┌─────────────────────────────────────────────────┐
│ ┌──────────┐  浙A·TEST                 ┌──────┐ │
│ │  Avatar  │  几何 · 白色              │  📞  │ │
│ └──────────┘                           └──────┘ │
│ 曹操测试司机                                      │
└─────────────────────────────────────────────────┘
```

- Uniapp reference:
  `sub_packages/ride_hailing/components/driverInfoDisplay/driverInfoDisplay.vue`
  renders driver avatar/name on the left, vehicle plate plus brand/model/color
  in the middle, and an icon call button on the right.
- Confirmed marker root cause:
  the repo already has the same driver marker asset as uniapp at
  `/route-map/map-marker-driver.png`. The shared Tencent map provider currently
  resolves `marker.active` before `marker.icon`, so the active driver marker
  uses the generic active pin style instead of the `routeDriver` car icon.
- Confirmed fake route root cause:
  fake Caocao `ACCEPTED` currently returns only
  `[driverCoordinate(order), order.origin]`, so the provider route necessarily
  renders as a straight line. `IN_TRIP` is also only interpolated points, not a
  road-like path.
- Caocao API semantics:
  official docs say event `1` is driver accepted; for realtime orders it maps
  to order status `9`, and status `9` is "start service" / pickup-route
  queryable. Driver route docs state pickup route is queryable for status `9`
  and `12`, and dropoff route for status `3`.
- Product interpretation for this slice:
  in the current simplified MVP phase model, backend `ACCEPTED` should be
  presented as `接客中`, not as a separate stable `已接单` UI state. Creating a
  true `已接单但未接客` phase would require provider semantics that distinguish
  it.
- Implementation result:
  - `RideHailingOrderContent` now renders a Driver Card from projected
    driver/vehicle data and exposes a call action when `driverPhone` exists
  - frontend/backend/Admin display copy now treats local `ACCEPTED` / provider
    status `9` as `接客中`
  - shared Tencent marker style resolution now lets explicit marker icons win
    over active styling, so the route driver car marker is preserved
  - fake Caocao pickup and in-trip provider route responses now return
    multi-point curved polylines instead of endpoint-only lines
  - scenario coverage asserts accepted status copy plus Driver Card name/plate
- Follow-up review findings:
  - Driver Card Call action should use the `PuButton` `leading` slot for its
    icon; placing the icon span directly in default content is inconsistent
    with the design-web button contract. This correction is now implemented.
  - Caocao Fake Server driving-process enhancement should be a separate slice.
    It should first diagnose the adapter path from Caocao `coords` to backend
    provider route projection to Tencent Map SDK input, because a rendered
    straight line is more likely a conversion/format mismatch than evidence
    that the fake server should deviate from Caocao API shape.
  - Fake Caocao should continue to follow Caocao API semantics. Better driving
    simulation options should prefer mature routing/polyline tooling or
    captured realistic route fixtures over hand-authored provider-incompatible
    coordinate formats.
  - Follow-up slice research is captured in
    `caocao-driver-movement-mock-research.md`.
  - Caocao driver-movement chain diagnosis result:
    fake server raw `coords`, backend adapter parsed polyline, frontend
    view-model `extraPolylines`, and Tencent provider `geometries[].paths`
    all preserve the same multi-point `latitude,longitude` route shape.
    Current evidence does not support coordinate reversal or intermediate point
    loss as the primary cause.
  - Stronger adapter contract issue:
    Caocao docs require `navigation_polyline_type` for driver route query, but
    `CaocaoProviderAdapter.queryDriverRoute` currently sends only `order_id`.
    The fake server also ignores this missing required parameter, so current
    tests hide the contract mismatch.
  - Route-contract implementation result:
    provider route query now carries an explicit `PICKUP` / `DROPOFF` route
    kind, the trade live projection maps local lifecycle phase to that route
    kind, Caocao adapter sends `navigation_polyline_type=1` or `3`, and fake
    Caocao rejects missing/mismatched route-type requests. This fixes the
    adapter contract before adding richer movement simulation.
  - Current movement/heading plan:
    implement deterministic fake movement with a narrow local geometry helper,
    not a geospatial dependency. The fake server should return the remaining
    provider-shaped route from the current simulated driver point, and the
    shared map marker contract should carry optional heading into Tencent
    marker style rotation.
  - Movement/heading implementation result:
    fake Caocao now advances simulated driver movement on successful route
    polling, keeps driver location and remaining route aligned, resets movement
    ticks on phase changes, and exposes calculated heading. Frontend map marker
    data now carries optional heading, and Tencent route-driver marker styles
    convert Caocao clockwise heading to Tencent counter-clockwise rotation
    without replacing the car icon.

## Previous Segment: Fake Caocao Admin Phase Control Observability

- Observation:
  Admin advanced the fake provider order to provider live `IN_TRIP`, but Order
  Detail still displayed `派单中`.
- Diagnosis:
  Order Detail intentionally renders local persisted
  `rideHailing.executionPhase`, not provider `rideHailing.live.phase`. For the
  reported order, local `executionPhase` remained `DISPATCHING`; therefore the
  UI was rendering the canonical local lifecycle correctly.
- Root problem:
  fake provider phase control could update fake provider state while the
  callback delivery to backend failed or was rejected without being surfaced to
  the Admin user. That creates visible drift between provider live state and
  local lifecycle.
- Repair direction:
  keep Order Detail UI driven by local lifecycle; make fake Caocao/Admin phase
  controls expose callback delivery success/failure explicitly.
- Added scope:
  provide both advance and retreat controls for the latest fake Caocao order.
  `CANCELLED` is not retreatable because fake state has no previous-phase
  history.
- Runtime finding:
  `Missing Caocao sign` on the new retreat control means the running fake
  server did not recognize the `__fake_caocao` route and fell through to signed
  Caocao request verification. Restarting the caocao portless route loaded the
  new route; an empty fresh fake state now returns
  `FAKE_CAOCAO_ORDER_NOT_FOUND` instead, which proves the dev-control route is
  matched.

## Previous Segment: RideHailing Order Detail PuFloatPanel Content

- Result:
  `RideHailingOrderContent` now replaces the raw JSON diagnostic panel with the
  reviewed content model.
- Status Hero:
  panel header contains status title and status description on the left.
  Cancellation, when available, sits immediately to the left of the more
  operation button on the right. This header should stay a single row on narrow
  screens; the actions side must not shrink, and the status copy side absorbs
  tight width.
- Dispatching-only SKU list:
  while dispatching, render the placed RideHailing SKU candidate list
  immediately after Status Hero. Reuse the `RideHailingSkuCard` visual shape in
  readonly mode: non-selectable and no checkbox.
- Projection decision:
  Order Detail now exposes minimal `candidateVehicles` facts derived from the
  persisted choice-set item. The frontend does not inspect raw order item
  snapshots to render readonly candidate cards.
- Ride facts:
  after a larger spacing, always render exactly two lifecycle-independent
  sections:
  - `路线`: section title plus PR Facts Card style route item list
  - `乘车人`: section title plus RideHailing Ordering rider drawer style list
    items
- Explicit exclusions:
  no provider facts, bill/payment facts, driver facts, route summaries, extra
  eyebrows, extra cards, or additional content in this segment.
- Interaction limitation:
  cancel and more controls are currently disabled visual controls because
  RideHailing cancellation/more-operation use cases are not implemented in this
  slice.

## Pinned Decisions

- Production code mutations still require Impact Handshake and explicit
  `开始`.
- `RideHailingOrderContent` owns RideHailing Order Detail panel content and map
  presentation; `CommerceOrderDetailPage` owns route/query/page-level shell.
- Map mode is driven by local persisted `ride.executionPhase`, not provider
  live phase/status.
- Raw JSON diagnostic UI has been removed from the panel content.
- `RideHailingSkuCard` may gain a readonly/no-checkbox shape, but its Ordering
  Page default must stay selectable with checkbox.

## Open Checks

- Manual browser review of dispatching and post-dispatch panel layout.
- Decide in a separate slice whether RideHailing cancellation should be
  implemented end-to-end.
