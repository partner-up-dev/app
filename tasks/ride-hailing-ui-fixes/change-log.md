# Change Log

This file is the current working change surface. Keep completed slice details
compact and move old completed history to archive.

Archived full history:

- `archive/change-log-ordering-through-order-detail-map.md`

## Current Slice: RideHailing Cancel + Departure-Time Short-Circuit

- Requested slice:
  - implement RideHailing order cancellation from Order Detail
  - short-circuit RideHailing departure-time binding so ordering always uses
    `现在出发`
- Implementation result:
  - added generic order-detail cancellation transport:
    `POST /api/commerce/orders/:orderId/cancel`
  - added family-dispatched trade cancellation so Rental keeps its existing
    path while RideHailing calls provider `cancelRide` and converges local
    termination state plus `executionPhase = CANCELLED`
  - enabled the RideHailing Order Detail cancel CTA during `DISPATCHING`
  - removed PR-time import and manual editing from RideHailing departure-time
    UX; ordering now visibly stays on `现在出发`
  - stopped injecting RideHailing `departureAt` from ordering-entry and stopped
    sending it into Offer Listing
  - updated RideHailing system scenarios to cover:
    - dispatching-order cancellation
    - fixed `现在出发` ordering assertions
    - variable dispatching candidate-card counts driven by selected vehicles
- Verification result:
  - backend typecheck passed
  - frontend typecheck passed
  - focused RideHailing system scenario file passed

## Current Slice: Payment Client UI / Attempt Identity

- Requested slice:
  - turn the checkout repair into a usable local payment-client loop
  - diagnose whether the long `paymentTxId` means the system has two competing
    payment-transaction identities
- Implementation result:
  - repaired the runtime fake `WeixinJSBridge` by binding native browser
    `fetch` before the bridge calls the fake payment provider
  - widened the fake bridge into a dev-only payment-client overlay with:
    - `支付成功`
    - `取消支付`
    - `模拟失败`
  - added fake-provider prepay-keyed transitions for:
    - `succeed`
    - `close`
    - `fail`
  - changed `launch-payment-client-action` to return structured client result
    semantics instead of discarding bridge callback `err_msg`
  - refactored `PaymentCheckoutFlow` from request-level loading into
    attempt-phase orchestration with:
    - stable CTA labels
    - polling dialog + spinner
    - no CTA loading flicker during reconciliation
    - backend-authoritative terminal handling
  - ratified the current attempt identity model instead of forcing convergence:
    - canonical tuple:
      `kind + billLineId + paymentProviderInstanceId + attemptCount`
    - backend projection: `paymentTxId`
    - provider projection: `merchantOrderNo / out_trade_no`
- Verification result:
  - focused frontend unit tests passed:
    - `apps/frontend/src/shared/wechat/fake-wechatpay-bridge.test.ts`
    - `apps/frontend/src/domains/payment/use-cases/launch-payment-client-action.test.ts`
  - fake WeChatPay server unit tests passed
  - frontend typecheck passed
  - focused RideHailing system scenario passed:
    `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts -t commerce_ride_hailing_ordering_reaches_order_detail`

## Current Slice: Typed-Order Timeout Override For RideHailing Final-Bill Payment

- Requested slice:
  - fix RideHailing final-bill payment without introducing payment-side family
    branching
  - keep timeout override owned by typed order creation
- Implementation result:
  - `createBaseOrder` now accepts a full timeout snapshot from the typed-order
    caller
  - Rental creation paths still write the standard 30-minute unpaid-window
    timeout
  - RideHailing creation paths now write a non-expiring timeout snapshot:
    - `unpaidExpiresAt = 9999-12-31T23:59:59.999Z`
    - `defaultWindowMinutes = 0`
  - payment-side timeout readers remain family-agnostic
  - durable contract wording now records the owner split:
    - Rental keeps the standard unpaid payment window on the base-order timeout
      snapshot
    - RideHailing overrides that snapshot so final-bill payment is not bounded
      by the standard unpaid window
- Verification result:
  - backend typecheck passed
  - focused backend scenarios for RideHailing foundation and Rental persistence
    passed
  - focused RideHailing system scenario passed
  - `git diff --check` passed

## Current Slice: Payment Checkout Interaction / UI Implementation

- Requested slice:
  - replace the legacy commerce checkout aggregate with Billing-owned
    bill-line target reads plus Payment-owned provider / `PaymentTx` facts
  - implement the real checkout interaction:
    provider single-select, JSAPI launch, backend reconciliation, and
    success auto-return
- Implementation result:
  - removed legacy frontend checkout data hooks:
    - `usePaymentCheckout`
    - `useCreateChargeForBillLine`
    - `useSyncBillLinePayment`
  - removed legacy backend compatibility implementation files:
    - `domains/payment/use-cases/payment-checkout.ts`
    - `domains/payment/use-cases/get-bill-detail.ts`
    - `domains/payment/services/bill-payment-state.ts`
  - frontend checkout now reads:
    - Billing-owned `GET /api/commerce/bill-lines/:billLineId`
    - Payment-owned `GET /api/payment/providers`
    - Payment-owned `POST /api/payment/:paymentProviderInstanceId/charge?bill-line=...`
    - Payment-owned `GET /api/payment/:paymentTxId`
  - added checkout feature files:
    - `apps/frontend/src/domains/payment/queries/usePayment.ts`
    - `apps/frontend/src/domains/payment/use-cases/launch-payment-client-action.ts`
    - `apps/frontend/src/domains/payment/ui/primitives/PaymentCheckoutHero.vue`
    - `apps/frontend/src/domains/payment/ui/surfaces/PaymentCheckoutFlow.vue`
  - `PaymentCheckoutPage.vue` is now a route-only entrypoint that delegates to
    the payment-domain surface
  - checkout UI now provides:
    - `PuCell + PuRadio + usePuSelect` provider selection
    - checkout-specific BillLine hero
    - bottom-anchored CTA
    - generic provider-conflict dialog
    - backend-authoritative payment status reconciliation after bridge return
    - short success state followed by automatic return to Bill Detail
  - focused RideHailing scenario now:
    - installs fake WeChatPay bridge
    - clicks the checkout pay CTA
    - verifies automatic return to Bill Detail
    - waits for post-payment Bill Detail state convergence before asserting
- Verification result:
  - backend typecheck passed
  - frontend typecheck passed
  - bill payment-state unit test passed
  - focused RideHailing system scenario passed

## Current Slice: Payment Checkout Page Reset And IA Grounding

- Requested next slice:
  - user-facing route should become `/payment/checkout?bill-line=`
  - checkout page semantics should be payment-first instead of bill-line-first
  - first action should mirror the Bill Detail workflow:
    reset the current page body before redesign
- Confirmed current implementation facts:
  - current route is `/bill-lines/:billLineId/checkout`
  - current frontend page parses `route.params.billLineId`
  - current query owner is `usePaymentCheckout(billLineId)`
  - current backend route is `GET /api/commerce/bill-lines/:billLineId/checkout`
  - current Bill Detail CTA uses backend-authored
    `lines[].checkoutHref = /bill-lines/:billLineId/checkout`
  - current system scenario asserts the same route shape
  - local prerequisite reset is partially done by user:
    `PaymentCheckoutPage.vue` subtitle removed, not yet committed
- Confirmed design/ownership decisions:
  - Bill Detail CTA should stop depending on backend-authored checkout hrefs
  - frontend should own the eventual `/payment/checkout?...` route shape
  - backend should instead own payable-target facts, not user-facing route text
- Confirmed dev-environment decisions:
  - local mock payment provider baseline belongs in
    `apps/backend/data-migrations/` with `-- migration: environments=development`
  - it must not use `apps/backend/drizzle/`
  - that seed depends on stabilizing the fake WeChatPay fixture first, because
    the current fake server generates merchant credentials per boot
- Opened slice artifact:
  - `payment-checkout-page-reset-plan.md`
- Frontend reset implementation:
  - removed the current `PaymentCheckoutPage` successful-state body content
  - preserved invalid-id, loading, error, and back-navigation shell behavior
  - intentionally cleared the old bill-line-first amount/provider UI
- Scenario adjustment:
  - removed old checkout body assertions for amount and return-to-bill action
  - scenario now asserts checkout page reachability and back-navigation to Bill
    Detail
  - aligned one stale order-detail back-button locator to the real accessible
    label `返回上一页`
- Verification result:
  - focused biome check passed
  - frontend typecheck passed
  - focused RideHailing system scenario passed

## Current Slice: Payment Checkout Route / Ownership

- Requested segment:
  - move the user-facing checkout route to `/payment/checkout?bill-line=`
  - frontend should own route topology; backend should stop returning
    `checkoutHref`
- Confirmed implementation direction:
  - keep backend checkout/charge/sync endpoints bill-line-scoped for now
  - keep checkout page reset shell intact
  - use a frontend-owned route helper instead of scattering path strings
- Planned address:
  - frontend router, checkout page, bill-detail page, bill-line card
  - backend bill-detail projection
  - focused RideHailing system scenario
- Open next implementation artifact inside:
  - `payment-checkout-page-reset-plan.md`
- Implementation result:
  - added frontend-owned checkout route helper at
    `apps/frontend/src/domains/commerce/routing/payment-checkout-route.ts`
  - moved frontend checkout route to `/payment/checkout`
  - switched checkout page target parsing from route param to `bill-line` query
  - removed backend `checkoutHref` from bill-detail projection
  - switched Bill Detail CTA to frontend-built checkout navigation
  - simplified BillLine Card selectable gating to `payableByViewer`
- Verification result:
  - focused biome check passed
  - frontend typecheck passed
  - backend typecheck passed
  - focused RideHailing system scenario passed

## Current Slice: Payment Checkout Interaction / Contract Planning

- Requested planning update:
  - lock checkout runtime behavior before wireframe
  - define CTA behavior and payment-method ownership/source
- Confirmed runtime findings:
  - current CTA backend path is `POST /api/commerce/bill-lines/:billLineId/charges`
  - current payment sync path is
    `POST /api/commerce/bill-lines/:billLineId/payment/sync`
  - current provider client actions are `WECHAT_BRIDGE` and
    `PAYMENT_REDIRECT`
  - current frontend has no checkout-specific WeChat bridge execution layer yet
  - backend currently owns provider selection by `clientId` or existing line
    execution slot
  - backend model currently supports only one active provider instance per
    `clientId`
  - provider config currently supports only one `chargeMode` per provider
    instance
  - local fake WeChatPay server exists, but runtime dev frontend does not yet
    have a fake JSAPI bridge adapter; only scenario stub exists
- Confirmed contract conflict:
  - older schema created `payment_txs`
  - later migration `0078_bill_line_payment_slot.sql` removed `payment_txs`
  - current durable doc says provider transaction lifecycle truth is not
    persisted as backend payment transaction truth
- Latest human-corrected direction:
  - `PaymentTx` concept stays, but the deleted historical `payment_txs` table
    must not return
  - payment initiation should move under `/api/payment/*`
  - initiation should return `PaymentTx`
  - payment result polling should become `GET /api/payment/:paymentTxId`
  - provider discovery should become a separate backend query surface
  - active-provider-per-client uniqueness should be removed
- Confirmed planning direction:
  - the next slice is a backend contract reset, not UI-only implementation
  - provider choice should not be pre-restricted in UI
  - if an in-progress `PaymentTx` already binds a provider, mismatched choice
    should fail at charge-initiation time and be handled by dialog
  - recommended `PaymentTx` direction is an explicit API/domain resource with
    opaque id resolution, not a restoration of the old `payment_txs` table
  - checkout target truth should remain on billing-owned reads rather than a
    new synthetic payment checkout read
  - provider discovery does not need stable default-provider semantics
  - preferred charge-initiation path shape is now
    `POST /api/payment/:paymentProviderInstanceId/charge?bill-line=...`
  - wireframe discussion should happen after the `PaymentTx` contract direction
    is agreed
- Standalone artifact opened:
  - `payment-checkout-backend-contract-plan.md`
- Implementation result:
  - durable contract doc now explicitly states:
    - Billing owns checkout target truth
    - Payment owns provider discovery and transient `PaymentTx`
  - removed the single-active-provider-per-client constraint from payment
    provider instances
  - added schema migration:
    `apps/backend/drizzle/0082_payment_provider_multi_active_per_client.sql`
  - added authenticated payment routes:
    - `GET /api/payment/providers`
    - `POST /api/payment/:paymentProviderInstanceId/charge?bill-line=...`
    - `GET /api/payment/:paymentTxId`
  - added transient `PaymentTx` id encoding/decoding and provider-query-backed
    polling
  - charge initiation now rejects unfinished mismatched-provider choice with
    `PAYMENT_PROVIDER_CONFLICT`
  - provider notify routes stay unchanged under `/api/payment/wechat-pay/*`
  - legacy commerce checkout endpoints remain for compatibility while frontend
    migrates
- Verification result:
  - backend typecheck passed
  - backend migration lint/check passed
  - focused backend payment scenario passed against the new `/api/payment/*`
    contract
  - scenario proves multi-provider support, charge-time conflict, transient
    `PaymentTx` polling, and absence of `payment_txs`

## Opened Slice: Payment Checkout Fake JSAPI Bridge Planning

- Requested segment:
  - verify fake runtime direction against official WeChatPay v3 JSAPI docs
  - update task packet before implementation
- Confirmed doc-aligned direction:
  - frontend payment invocation must model
    `WeixinJSBridge.invoke("getBrandWCPayRequest", payload, callback)`
  - payload field names and casing must stay exactly:
    `appId / timeStamp / nonceStr / package / signType / paySign`
  - `WeixinJSBridgeReady` remains the correct structural readiness event
  - bridge callback result is not final payment truth; checkout must still poll
    backend `PaymentTx`
- Confirmed local-runtime findings:
  - scenario-only fake bridge already exists at
    `tests/scenario/_infra/browser/wechatpay.ts`
  - fake WeChatPay server already supports
    `POST /__fake_wechatpay/prepays/:prepayId/succeed`
  - runtime frontend still has no dev-only fake `WeixinJSBridge`
- Opened slice artifact:
  - `payment-checkout-fake-jsapi-bridge-plan.md`
- Recommended segment boundary:
  - dev-only fake bridge shim only
  - no backend contract mutation
  - no page IA or wireframe mutation
  - no H5 mocking
- Implementation result:
  - added frontend fake bridge module:
    `apps/frontend/src/shared/wechat/fake-wechatpay-bridge.ts`
  - installed the bridge from app bootstrap:
    `apps/frontend/src/app/create-app.ts`
  - added env typing and example vars for:
    - `VITE_FAKE_WECHATPAY_BRIDGE_ENABLED`
    - `VITE_FAKE_WECHATPAY_ORIGIN`
  - refined `window.WeixinJSBridge` typing
  - added focused frontend unit tests
  - local ignored `apps/frontend/.env` is now enabled for this bridge against
    `https://wechatpay.partner-up.localhost`
- Verification result:
  - frontend typecheck passed
  - focused frontend unit tests passed
  - bridge module now proves install, supported invoke, unsupported invoke,
    non-override behavior, and invalid prepay package failure handling
  - remaining gap: Payment Checkout page still lacks the user-visible JSAPI
    invocation path, so local manual button-flow proof belongs to the next UI
    slice

## Opened Slice: Payment Checkout Interaction / UI Planning

- Requested planning correction:
  - stop treating IA / wireframe as separable from interaction and contract
    alignment
  - revisit the page against the approved backend contract changes
  - prepare a standalone segment plan file
- Confirmed corrections:
  - provider discovery must stay target-agnostic
  - checkout UI must not pre-announce unfinished provider binding from the
    provider list
  - channel implementation details such as `JSAPI` / `H5` should not be shown
    in the primary method list
  - current frontend still depends on the legacy commerce checkout aggregate,
    which is the wrong assembly direction for the approved owner model
- New standalone artifact:
  - `payment-checkout-interaction-ui-plan.md`
- Planned direction:
  - likely merge route shape adjustment, frontend query-owner migration, page
    IA, pay-action state machine, and minimal backend conflict-payload
    alignment into one implementation slice
  - corrected route conclusion:
    `billLineId` itself is enough for the user-facing checkout route; the real
    owner-alignment gap is the absence of a Billing-owned bill-line read
    surface that can replace the legacy checkout aggregate

## Opened Slice: Local Mock Payment Provider Baseline Planning

- Requested segment:
  - create a stable local payment-provider baseline for checkout development
- Confirmed planning direction:
  - baseline should target `clientId = web`
  - baseline should prefer `chargeMode = JSAPI`
  - stable fake fixture source must land before provider-instance seed
  - development-only seed belongs in `apps/backend/data-migrations/`
- Confirmed implementation decisions:
  - stable fake fixture will be stored as a committed asset
  - development-only seed will rely on runtime platform-certificate refresh
- Opened slice artifact:
  - `local-mock-payment-provider-baseline-plan.md`
- Implementation result:
  - added committed fake fixture asset at
    `packages/fake-wechatpay-server/src/fixtures/stable-dev-fixture.json`
  - changed fake WeChatPay fixture loading to parse that committed asset
  - added development-only provider baseline migration:
    `apps/backend/data-migrations/0081_dev_mock_payment_provider_baseline.sql`
  - baseline seeds active client `web` provider
    `dev-fake-wechatpay-web` with `JSAPI` mode and
    `https://wechatpay.partner-up.localhost`
  - baseline leaves `platformCertificates = null` for runtime refresh
  - baseline disables conflicting active `web` payment-provider rows before
    activating the seeded row
- Verification result:
  - fake WeChatPay package typecheck passed
  - fake WeChatPay package tests passed
  - backend typecheck passed
  - migration lint passed
  - `git diff --check` passed
  - current local `db:migrate:dev` remains blocked by a pre-existing local
    issue in historical migration `0061_user_telemetry_v2.sql`
  - isolated temporary-database `db:migrate:dev` passed and applied `0081`

## Previous Slice: Bill Detail Page Reset And Backend Contract Segment

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
