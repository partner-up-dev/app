# Change Log

This file is the current working change surface. Keep completed slice details
compact and move old completed history to archive.

Archived full history:

- `archive/change-log-ordering-through-order-detail-map.md`

## Current Slice: Bill Detail Page Reset And Backend Contract Segment

- Requested first mutation for the next slice:
  - remove Bill Detail page body content
  - remove Bill Detail header subtitle
- Confirmed current backend Bill projection fields:
  - `bill`: id, sourceOrderId, status, currency, chargeTotalFen,
    paidChargeFen, refundTotalFen, refundedFen, settlementStatus
  - `order`: id, family, status, itemName
  - `lines[]`: id, userId, kind, amountFen, currency, label, description,
    refundOfBillLineId, settlementStatus, paidFen, refundedFen,
    payableByViewer, checkoutHref, paymentProviderInstanceId, attemptCount,
    settledAt
- Important status reality:
  - current bill detail line status is derived from `deriveBillPaymentState`
  - current stable outputs are
    `UNPAID / PROCESSING / PAID / REFUND_PENDING / REFUNDED`
  - existing frontend `ACTION_REQUIRED` / `FAILED` line-label branches are not
    currently exercised by `getBillDetail`
- Prerequisite reset implemented:
  - removed Bill Detail header subtitle
  - removed current successful-state Bill Detail body content
  - preserved invalid-id, loading, error, and back-navigation handling
- Backend contract implementation:
  - expanded `BillDetailProjection.bill` with backend-owned `totalAmountFen`
  - expanded `BillDetailProjection.lines[]` with enriched payer presentation:
    - `userId`
    - `nickname`
    - `displayName`
    - `avatarUrl`
    - `isViewer`
  - added repository support to load payer records by id set
- Frontend implementation:
  - added `domains/commerce/ui/bill-detail/BillLineCard.vue`
  - rebuilt `CommerceBillDetailPage` header:
    - `查看订单` in actions
    - settlement tag and inline `总金额` in meta
  - bill lines now render as amount/status/payer/description cards
  - page selection is single-select via `usePuSelect`
  - only backend-payable lines are selectable
  - disabled non-payable lines remain visible with disabled checkbox state
  - page footer CTA now routes only the selected payable line to checkout
  - `BillCard.vue` now reads backend-owned `totalAmountFen`
  - follow-up layout correction:
    - BillLine card now uses:
      checkbox / amount+status / payer-avatar+nickname
    - card body now renders description text only
    - payer nickname no longer appends viewer copy
    - payer nickname width is container-constrained from the BillLine card
    - bill-detail success state now uses a true `space-between` flex column;
      CTA no longer relies on `sticky`
- Scenario coverage update:
  - RideHailing bill-detail flow now uses a two-participant order
  - scenario asserts:
    - header status and total amount
    - two bill lines render
    - viewer-owned line is default-selected and payable
    - non-viewer line stays disabled
    - CTA label reflects the selected bill-line amount
    - bill-detail -> checkout -> bill-detail -> order-detail routing works
- Verification result:
  - focused biome check passed
  - frontend typecheck passed
  - backend typecheck passed
  - focused RideHailing system scenario passed
  - `git diff --check` passed

## Previous Slice: RideHailing Order Detail Bill Card

- Target component contract:
  - Bill Card is a reusable component
  - input is `billId`
  - the component fetches canonical bill data by itself
  - the component shows bill price and a `查看` action to `/bills/:billId`
- Placement decision:
  - RideHailing order detail should render the Bill Card only when
    `detail.bill?.id` exists
  - the Bill Card belongs above
    `order-detail.ride-hailing.resolved-vehicle-section`
- Current dependency decision:
  - prefer existing `useBillDetail(billId)` rather than adding a new query
    owner
  - existing `/orders/:orderId/bill` API remains available but is not the
    preferred contract for this component slice
- Implementation result:
  - added `apps/frontend/src/domains/commerce/ui/order-detail/BillCard.vue`
  - added shared bill settlement display helper at
    `apps/frontend/src/domains/commerce/model/bill-display.ts`
  - RideHailing order detail now shows a `账单` section above
    `order-detail.ride-hailing.resolved-vehicle-section` when bill id exists
  - Bill Card shows status tag, effective-total amount, and `查看`
  - `CommerceBillDetailPage` now reuses the shared bill settlement label
    helper
- Verification result:
  - frontend typecheck passed
  - focused biome check passed
  - focused RideHailing system scenario passed with bill-card assertions
- Slice artifact:
  - `order-detail-bill-card-plan.md`

## Last Completed Slice: Order Detail Back Navigation And Resolved Vehicle Section

- Corrected task-packet wording for the Driver Card action:
  - the current icon-led call affordance is acceptable
  - the real contract is action-oriented call semantics, not a required visible
    `Call` text label
- Implemented Order Detail back-navigation correction:
  - header back skips `/order/new` when that page is the immediate router back
    entry
  - when two-step history back is unavailable, the page falls back to the PR
    path from the ordering handoff store
- Implemented resolved service-vehicle section:
  - RideHailing Order Detail now shows `服务车型` above `路线` when a resolved
    RideHailing SKU exists
  - the section reuses readonly `RideHailingSkuCard`
  - the existing dispatching-only candidate-vehicle section remains intact
- Updated focused scenario coverage:
  - dispatching candidate cards are asserted within their own section
  - resolved service-vehicle section is asserted independently
  - header back action is asserted to return to `/pr/:id`
- Slice artifact:
  - `order-detail-back-and-resolved-vehicle-plan.md`

## Last Completed Slice: RideHailing Order Detail Map Manual Review Corrections

- Fixed shared Tencent map single-coordinate fitting so active single markers
  respect `fitPadding`.
- Preserved the existing single-point max zoom cap.
- User manually confirmed the marker padding correction.
- Committed as:
  - `3c1eccb0 feat(ride-hailing): expose provider live geometry`
  - `413cb260 feat(frontend): render ride-hailing order detail map states`
  - `b568eefa fix(map): respect padding for single-marker fit`

## Last Completed Slice: RideHailing Order Detail PuFloatPanel Content

- Replaced raw JSON diagnostic panel content.
- Added Status Hero with status title/description and right-side action slots.
- Added readonly RideHailing SKU candidate cards only while dispatching.
- Added larger spacing before lifecycle-independent ride facts.
- Rendered exactly two ride fact sections:
  - route
  - riders
- Extended `RideHailingSkuCard` with a readonly/no-checkbox shape while keeping
  Ordering Page default selectable behavior unchanged.
- Extended RideHailing Order Detail projection with minimal candidate vehicle
  card facts derived from the order choice-set item.
- Updated the RideHailing system scenario from raw JSON assertions to semantic
  panel assertions.
- Limitation:
  cancel/more controls are rendered disabled because RideHailing cancel and
  more-operation domain actions do not exist yet.
- Manual review correction:
  Status Hero remains a single row on narrow screens; the actions side does not
  shrink, and the status copy side takes compression.

## Uncommitted Slice: Fake Caocao Admin Phase Control Observability

- Added fake Caocao phase retreat state support:
  - `ACCEPTED -> CREATED`
  - `ARRIVED_AT_PICKUP -> ACCEPTED`
  - `IN_TRIP -> ARRIVED_AT_PICKUP`
  - `FINISHED -> IN_TRIP`
  - `CREATED` and `CANCELLED` are not retreatable
- Added dev-control routes:
  - `POST /__fake_caocao/orders/latest/retreat`
  - `POST /__fake_caocao/orders/:providerOrderId/retreat`
- Changed phase control routes to include callback delivery details in success
  responses.
- Changed phase control routes to return
  `502 FAKE_CAOCAO_CALLBACK_DELIVERY_FAILED` when backend callback delivery
  returns non-2xx or cannot be delivered.
- Callback failure responses include the already-mutated fake order so the
  provider/local lifecycle drift is visible from Admin/network diagnostics.
- Updated RideHailing Provider Instance Admin dev tools:
  - added a "回退最新订单状态" button
  - shared loading and feedback for advance/retreat
  - success feedback now reports callback delivery status
  - error feedback now includes callback failure details

## Current Slice: RideHailing Order Detail Driver Card And Live Geometry

- Added a Driver Card to `RideHailingOrderContent` when projected
  `ride.driver` or `ride.vehicle` exists.
- The Driver Card displays driver avatar/name, vehicle plate/description, and a
  call action backed by `driverPhone`.
- Manual review correction: the Driver Card call action uses normal rect shape,
  outline variant, and primary tone.
- Manual review correction: the Driver Card call icon now uses the `PuButton`
  `#leading` slot.
- Clarified that `曹操测试司机` is fake/provider example data flowing through
  `driverName` / callback `driver_name`, not a UI field name.
- Corrected Driver Card action wording: the right-side button is `Call`, not
  `Phone`.
- Changed shared Tencent marker style resolution so explicit marker icons, such
  as `routeDriver`, are preserved even when the marker is active.
- Changed fake Caocao pickup and in-trip driver routes from endpoint-only /
  simple interpolation output to multi-point curved polylines for manual map
  review.
- Changed Caocao `ACCEPTED` / status `9` user-facing copy to `接客中` in the
  current simplified phase model.
- Added focused backend, fake-provider, and system scenario coverage for the
  new behavior.

## Opened Slice: Caocao Driver Movement Mock

- Created `caocao-driver-movement-mock-research.md`.
- Confirmed this slice should start from adapter conversion diagnosis:
  Caocao `coords` -> backend provider route projection -> frontend map
  view-model -> Tencent `MultiPolyline`.
- Confirmed fake Caocao should remain Caocao-shaped and should not emit
  Tencent-specific route data.
- First chain diagnosis result:
  - fake server raw `coords` preserved 5 points
  - `CaocaoProviderAdapter.queryDriverRoute` preserved the same 5 points
  - frontend order map view-model preserved the same 5 points as `{ lat, lng }`
  - Tencent provider assembles `geometries[].paths` with
    `new TMap.LatLng(lat, lng)`
- Found adapter contract risk:
  `queryDriverRoute` does not send required `navigation_polyline_type`.
- Implemented route-query contract guardrail:
  - provider route query now carries `PICKUP` / `DROPOFF`
  - trade live projection maps local execution phase to route kind
  - Caocao adapter sends `navigation_polyline_type=1` for pickup and `3` for
    dropoff
  - fake Caocao route endpoint validates required route type and rejects
    missing/mismatched requests
  - backend adapter, fake server, frontend view-model, typecheck, and system
    scenario tests pass
- Captured candidate implementation models:
  - realistic Caocao-shaped fixtures
  - geospatial library such as Turf modular packages or `geolib`
  - narrow local geometry helper
- Implemented driver movement and heading marker segment:
  - added fake Caocao movement helper for distance, heading, and remaining-route
    snapshots
  - made fake driver location and route polyline progress with successful route
    polling
  - reset movement ticks on phase changes
  - returned remaining pickup/dropoff geometry from the current driver point
  - added optional shared map marker `headingDegrees`
  - passed RideHailing provider heading into driver marker
  - rendered Tencent `routeDriver` marker with heading-aware rotated styles
    while preserving the car icon
- Implemented Tencent marker smoothing follow-up:
  - shared Tencent map provider now uses `MultiMarker.moveAlong` for
    `routeDriver` coordinate changes
  - route-driver marker style uses `faceTo: "map"` for Tencent auto-rotation
  - non-driver route markers still update directly
- Implemented route map polyline tone correction:
  - moved route-specific polyline tone policy into `RouteMap`
  - route polylines now use `secondary` by default
  - multiple planned polylines allocate `secondary` / `tertiary` / `primary`
    to reduce same-color overlap
  - fallback straight-line geometry uses `danger`
  - RideHailing provider live route is no longer recolored by `active`
    polyline state
- Corrected map tone colors to design-system tokens:
  - Tencent map provider now resolves tone colors from `--sys-color-*`
    variables
  - `danger` maps to `--sys-color-error`
  - fallback values match the current `@partner-up-dev/design-web` sys tokens
    instead of private map hex values
- Implemented route map viewport follow mode:
  - `SharedMap` now supports active-marker following, user-paused follow, resume
    follow, and "view full route" controls
  - `RouteMap` exposes generic follow-mode props without coupling to RideHailing
    lifecycle state
  - RideHailing order detail follows the driver marker during pickup and trip
    phases at a fixed follow zoom
  - RideHailing order detail follow zoom was reduced from `17` to `15` to keep
    more surrounding route context visible
  - live route or driver geometry updates no longer force full-route fit while
    the user is browsing the map
  - follow resume now restores the configured zoom and recenters on the driver
    marker
  - follow marker recenter now uses `easeTo(center, zoom)` instead of
    `fitBounds` followed by `setZoom`, avoiding zoom-only resume failures
  - follow mode now raises the map provider max zoom to at least the configured
    follow zoom, avoiding SDK clamp from the generic RouteMap max zoom
  - map-level driver-heading rotation was reverted; the map stays north-up while
    the vehicle marker itself still uses heading-aware rendering
  - pickup overview now fits the provider route, driver marker, and origin
    marker instead of every route point

## Verification

- Current in-progress slice:
  - `pnpm --filter @partner-up-dev/fake-caocao-server test`
  - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
  - `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
  - `pnpm --dir apps/frontend exec vue-tsc --noEmit`
  - `pnpm exec vitest run --config vitest.config.ts --project frontend-unit apps/frontend/src/shared/map/tencent/tencent-lbs-provider.test.ts apps/frontend/src/domains/commerce/queries/useCommerce.test.ts apps/frontend/src/domains/commerce/ui/order-detail/ride-hailing-order-map-view-model.test.ts`
  - `pnpm exec vitest run --config vitest.config.ts --project frontend-unit apps/frontend/src/domains/commerce/ui/order-detail/ride-hailing-order-map-view-model.test.ts apps/frontend/src/shared/map/tencent/tencent-lbs-provider.test.ts`
  - `pnpm exec vitest run --config vitest.config.ts --project backend-unit apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts`
  - `pnpm exec vitest run --config vitest.config.ts --project frontend-unit apps/frontend/src/domains/commerce/ui/order-detail/ride-hailing-order-map-view-model.test.ts`
  - `pnpm exec vitest run --config vitest.config.ts --project system-scenario -t "commerce_ride_hailing_ordering_reaches_order_detail"`
  - `pnpm exec biome check apps/backend/src/domains/ride-hailing/model/provider.ts apps/backend/src/domains/ride-hailing/services/caocao-provider.ts apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts apps/frontend/src/domains/commerce/ui/order-detail/ride-hailing-order-map-view-model.ts apps/frontend/src/domains/commerce/ui/order-detail/ride-hailing-order-map-view-model.test.ts apps/frontend/src/shared/map/types.ts apps/frontend/src/shared/map/tencent/types.ts apps/frontend/src/shared/map/tencent/tencent-lbs-provider.ts apps/frontend/src/shared/map/tencent/tencent-lbs-provider.test.ts packages/fake-caocao-server/src/movement.ts packages/fake-caocao-server/src/movement.test.ts packages/fake-caocao-server/src/routes.ts packages/fake-caocao-server/src/server.test.ts packages/fake-caocao-server/src/state.ts packages/fake-caocao-server/src/state.test.ts`
- Current Driver Card / live geometry slice:
  - `pnpm exec biome check apps/backend/src/domains/ride-hailing/services/caocao-provider.ts apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue apps/frontend/src/shared/map/tencent/tencent-lbs-provider.ts apps/frontend/src/pages/AdminRideHailingPage.vue packages/fake-caocao-server/src/routes.ts packages/fake-caocao-server/src/server.test.ts tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts tasks/ride-hailing-ui-fixes/control.md tasks/ride-hailing-ui-fixes/discussion-log.md tasks/ride-hailing-ui-fixes/change-log.md`
  - `pnpm --filter @partner-up-dev/fake-caocao-server test`
  - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
  - `pnpm --dir apps/frontend exec vue-tsc --noEmit`
  - `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
  - `pnpm exec vitest run --config vitest.config.ts --project backend-unit apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts`
  - `pnpm exec vitest run --config vitest.config.ts --project system-scenario -t "commerce_ride_hailing_ordering_reaches_order_detail"`
  - `git diff --check`
- Driver Card Call slot correction:
  - `pnpm exec biome check apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue`
  - `pnpm --dir apps/frontend exec vue-tsc --noEmit`
  - `git diff --check -- apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue tasks/ride-hailing-ui-fixes`
- `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm exec biome check apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts tasks/ride-hailing-ui-fixes`
- `pnpm exec vitest run --config vitest.config.ts --project system-scenario -t "commerce_ride_hailing_ordering_reaches_order_detail"`
- `git diff --check`
- Status Hero single-row correction:
  - `pnpm --dir apps/frontend exec vue-tsc --noEmit`
  - `pnpm exec biome check apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue`
  - `git diff --check -- apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue`

## Next Manual Review

- Browser review of `PuFloatPanel` at dispatching and post-dispatch phases.
- Decide whether RideHailing cancellation should become a separate domain slice.
