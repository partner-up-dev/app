# Discussion Log

This file is the current working discussion surface. Keep it short enough to
reload at the start of a slice.

Archived full history:

- `archive/discussion-log-ordering-through-order-detail-map.md`

## Current Segment: Payment Client UI / Attempt Identity

- Requested segment:
  - confirm the widened checkout repair is real before fixing:
    - fake `WeixinJSBridge` runtime bug
    - dev-only payment-client UI
    - polling UX instability
    - possible `PaymentTx` identity confusion
- Diagnosis findings:
  - the local "支付后一直未支付" failure was real
  - root cause was the runtime fake bridge calling a detached native `fetch`,
    which fails in browser with:
    `Failed to execute 'fetch' on 'Window': Illegal invocation`
  - fake provider state and backend settlement path were both already healthy:
    manually advancing the fake prepay to `SUCCESS` immediately settled the
    corresponding BillLine
  - the long `paymentTxId` is not the provider-facing merchant order number;
    WeChatPay already uses a separate short `merchantOrderNo / out_trade_no`
    projection
- Implementation result:
  - fake bridge now binds browser `fetch` correctly
  - fake bridge now owns a dev-only payment-client overlay with explicit
    `支付成功 / 取消支付 / 模拟失败`
  - fake provider now supports prepay-keyed `close / fail` alongside `succeed`
  - `launch-payment-client-action` now returns structured client results
    instead of swallowing bridge callback semantics
  - `PaymentCheckoutFlow` now uses attempt phases:
    - `IDLE`
    - `WAITING_FOR_CLIENT`
    - `RECONCILING`
    - `SUCCEEDED`
  - checkout reconciliation now uses a blocking dialog + spinner and no longer
    ties CTA loading to each poll request
- Attempt identity decision:
  - keep one canonical attempt tuple:
    `kind + billLineId + paymentProviderInstanceId + attemptCount`
  - keep two explicit string projections:
    - backend resource id: `paymentTxId`
    - provider protocol id: `merchantOrderNo / out_trade_no`
  - do not force one-token convergence in this slice
- Verification result:
  - focused frontend unit tests passed:
    - fake bridge success/cancel/fail
    - launch-payment-client-action result mapping
  - fake WeChatPay server unit tests passed
  - frontend typecheck passed
  - focused RideHailing system scenario passed:
    `commerce_ride_hailing_ordering_reaches_order_detail`
- Next step:
  - the current packet is ready for the next payment or ride-hailing slice
  - the remaining `PAYMENT_NOTIFY_BASE_URL` / platform certificate caveat stays
    outside this segment by prior agreement

## Current Segment: Payment Checkout Fake JSAPI Bridge Planning

- New requested segment:
  - re-check the fake JSAPI runtime direction against official WeChatPay v3
    JSAPI docs
  - update task packet and write the segment plan before implementation
- Official contract findings:
  - JSAPI client entry is
    `WeixinJSBridge.invoke("getBrandWCPayRequest", payload, callback)`
  - required payload fields are:
    - `appId`
    - `timeStamp`
    - `nonceStr`
    - `package`
    - `signType`
    - `paySign`
  - `WeixinJSBridgeReady` is the right readiness event when bridge is not yet
    available
  - bridge callback `ok/cancel/fail` is not final payment truth; backend query
    or polling still decides final state
- Current code findings:
  - backend `WECHAT_BRIDGE` client action already matches the official JSAPI
    payload shape
  - scenario-only fake bridge already exists at
    `tests/scenario/_infra/browser/wechatpay.ts`
  - fake WeChatPay server already supports `prepay -> succeed`
  - runtime frontend still has no development-only fake `WeixinJSBridge`
- Planning direction:
  - open a standalone Fake JSAPI Bridge segment
  - keep it dev-only and bootstrap-level
  - emulate only payment bridge behavior, not the full WeChat JSSDK
  - keep backend `PaymentTx` polling as the only final payment truth
- Opened slice artifact:
  - `payment-checkout-fake-jsapi-bridge-plan.md`
- first recommended implementation scope is happy-path `success` only;
  local `cancel/fail` provider-state alignment should not be smuggled into
  this segment without explicit need
- Implementation result:
  - dev-only fake `WeixinJSBridge` is now installed from app bootstrap
  - the fake bridge is intentionally narrow and payment-only
  - success path reuses fake-provider `prepay -> succeed`
  - unsupported methods and invalid prepay payloads fail deterministically
  - existing real `WeixinJSBridge` is preserved
- Verification result:
  - focused frontend unit tests passed
  - frontend typecheck passed
- Next step:
  - return to Payment Checkout interaction/UI slice and let the page consume
    the now-ready fake JSAPI bridge when it grows a real pay-action path

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

## Current Segment: Payment Checkout Page Reset And IA Grounding

- New requested slice:
  - user-facing route should become `/payment/checkout?bill-line=`
  - the page should not be over-coupled to BillLine, even if the current
    payment implementation is BillLine-backed
  - the page core should be price plus payment method/channel, not BillLine
    narrative
  - same workflow as Bill Detail:
    reset first, then discuss IA and wireframe
- Current code findings:
  - current frontend route is `/bill-lines/:billLineId/checkout`
  - current frontend page parses `route.params.billLineId`
  - current frontend page already has a local prerequisite change:
    header subtitle removed
  - current successful-state page layout is bill-line-first:
    - `Checkout` eyebrow
    - `checkout.order.itemName` heading
    - amount block labeled by `checkout.billLine.label`
    - provider card rendered as a second section
  - current frontend query owner is `usePaymentCheckout(billLineId)`
  - current backend contract is `GET /api/commerce/bill-lines/:billLineId/checkout`
  - current checkout projection is centered on:
    - `billLine`
    - `bill`
    - `order`
    - `eligibility`
    - `payment`
  - current Bill Detail flow depends on backend-authored
    `lines[].checkoutHref = /bill-lines/:billLineId/checkout`
  - current RideHailing scenario asserts the same path shape
- Product/contract reading:
  - `docs/20-product-tdd/ecommerce-contracts.md` says payment should stay
    inside the Order Detail journey by default and should not introduce a broad
    user-facing `/checkout/*` route family
  - that makes `/payment/checkout?...` materially better than the current
    bill-line resource path, because it frames the page as a payment tool
    surface rather than a raw domain entity route
- Design pressure observed:
  - current user-facing route leaks a backend-owned resource shape
  - current page information hierarchy emphasizes what is being paid for,
    instead of how much the user is paying and through which channel
  - we likely need to distinguish:
    - transport/keying still bill-line-scoped for now
    - UI semantics and route semantics becoming payment-first
- Additional contract conclusion:
  - `BillDetailPage` should not depend on backend-authored checkout hrefs
  - current `checkoutHref` is only mirroring a frontend route choice, so it
    expands blast radius for no business gain
  - better ownership split:
    backend returns payable-target facts; frontend builds the user-facing
    checkout route
- Additional dev-environment finding:
  - local payment provider readiness cannot be solved by a dev-only SQL seed
    alone
  - current fake WeChatPay fixture is generated per process start, including
    merchant key pair and certificate
  - therefore a development-seeded `payment_provider_instances` row would drift
    unless the fake provider fixture becomes stable first
  - the correct durable bucket is:
    stable fake fixture source + `apps/backend/data-migrations/` dev-only seed
- Implementation result:
  - `PaymentCheckoutPage.vue` successful-state body is now intentionally empty
  - invalid-id, loading, error, and back-navigation shell remain intact
  - the old bill-line-first content and provider controls are removed so IA can
    be redesigned from a cleared page
  - focused RideHailing scenario no longer asserts amount text or inline
    `返回账单` action from the old page body
  - scenario now proves only:
    checkout route reachability and back-navigation to Bill Detail
- Next step:
  - discuss `PaymentCheckoutPage` information architecture against the cleared
    shell
  - decide the eventual frontend-owned checkout route builder contract
  - open the separate dev-infra segment for stable fake WeChatPay fixture plus
    development-only provider seed

## Current Segment: Payment Checkout Backend Contract

- New requested segment:
  - update the checkout task packet before wireframe
  - discuss dynamic behavior first:
    - what happens after clicking `支付`
    - where payment methods come from
    - how runtime states should evolve
- Confirmed dynamic truths from source:
  - checkout read contract:
    `GET /api/commerce/bill-lines/:billLineId/checkout`
  - charge creation contract:
    `POST /api/commerce/bill-lines/:billLineId/charges`
  - payment sync contract:
    `POST /api/commerce/bill-lines/:billLineId/payment/sync`
  - current charge creation may return `payment.clientAction`
  - current client actions are:
    - `WECHAT_BRIDGE`
    - `PAYMENT_REDIRECT`
  - current frontend has no checkout-specific `WeixinJSBridge` invocation
    layer yet
  - local fake WeChatPay server exists, but runtime dev frontend does not yet
    have a fake JSAPI bridge layer
  - only a scenario-only fake bridge stub exists at
    `tests/scenario/_infra/browser/wechatpay.ts`
  - provider choice is backend-owned today:
    existing execution slot provider wins, otherwise backend chooses the active
    provider by `clientId`
  - payment-provider model allows only one active provider instance per
    `clientId`
  - each provider instance currently has exactly one `chargeMode`
  - therefore true multi-method user choice is not yet implemented at the
    backend/domain level
- Contract conflict confirmed:
  - `drizzle/0071_payment_foundation.sql` once created `payment_txs`
  - `drizzle/0078_bill_line_payment_slot.sql` later dropped `payment_txs` and
    moved execution identity onto `bill_lines`
  - `docs/20-product-tdd/ecommerce-contracts.md` currently says provider
    transaction lifecycle truth is not persisted as backend payment transaction
    truth
- Latest human corrections:
  - `PaymentTx` concept remains valid
  - deleted `payment_txs` table must not be reintroduced
  - `POST /api/commerce/bill-lines/:billLineId/charges` should be replaced by
    payment-domain initiation returning `PaymentTx`
  - payment result polling should become `GET /api/payment/:paymentTxId`
  - payment method options should come from a separate backend query surface
  - single-active-provider-per-client constraint is not acceptable and should
    be removed
  - do not pre-restrict provider choice in UI
  - if an in-progress `PaymentTx` already binds a provider, mismatched provider
    choice should fail at charge-initiation time and be surfaced by dialog
- IA decisions already locked:
  - checkout Hero can reuse a simplified BillLineCard shape
  - Hero should hide payer and checkbox
  - payment method section should use `PuCell + PuRadio + usePuSelect`
- Current recommendation:
  - treat this as a backend contract reset segment, not merely an IA segment
  - model checkout around `PaymentTx`
  - recommended `PaymentTx` shape is an explicit API/domain resource with an
    opaque pollable id, not a restoration of the old `payment_txs` table
  - do not add a new synthetic checkout-target read; target truth should stay
    on billing-owned read surfaces
  - provider discovery does not need stable default-provider semantics
  - JSAPI should be the first-class path for the current slice
  - H5 should stay secondary until a real return-to-app flow is designed
- Standalone artifact opened:
  - `payment-checkout-backend-contract-plan.md`
- Implementation result:
  - active-provider-per-client uniqueness is removed both in schema and admin
    runtime checks
  - payment domain now exposes:
    - `GET /api/payment/providers`
    - `POST /api/payment/:paymentProviderInstanceId/charge?bill-line=...`
    - `GET /api/payment/:paymentTxId`
  - `PaymentTx` is implemented as a transient opaque id over
    `billLineId + paymentProviderInstanceId + attemptCount`, not as a revived
    table
  - current bound execution is queried and normalized before accepting a new
    explicit-provider charge request
  - unfinished mismatched-provider choice now fails with
    `PAYMENT_PROVIDER_CONFLICT`
  - historical failed `PaymentTx` polling is isolated from later successful
    attempts on the same BillLine
- Verification result:
  - backend typecheck passed
  - backend migration lint/check passed
  - focused payment backend scenario passed on the new contract
- Next step:
  - use the implemented backend contract to continue Payment Checkout IA,
    runtime UI state, and wireframe work

## Current Segment: Payment Checkout Interaction / Contract

- Status:
  - pending until backend contract is settled
- Locked frontend truth already agreed:
  - page stays payment-first
  - Hero may reuse a simplified BillLineCard shape
  - payment method selection uses `PuCell + PuRadio + usePuSelect`
  - provider choice is not pre-restricted in UI
  - if an in-progress `PaymentTx` already binds a provider, choosing another
    provider should produce a conflict dialog at charge-initiation time

## Proposed Segment: Payment Checkout IA / Wireframe Recovery

- Status:
  - proposed, previous draft partially rejected, awaiting revised review
- Reconfirmed topology before wireframe:
  - Payment Checkout page is still mounted on the reset shell
  - current frontend implementation still reads the old commerce checkout
    aggregate:
    `GET /api/commerce/bill-lines/:billLineId/checkout`
  - this remains a transition reality only; target truth should still migrate
    toward Billing-owned reads plus Payment-owned provider discovery and
    `PaymentTx` polling
- Proposed page hierarchy:
  - `PuPageScaffold(viewport="screen")`
  - scrollable content region:
    - simplified BillLine Hero card
    - payment method section
    - optional soft notice / method helper for unfinished payment reuse
  - bottom anchored CTA region:
    - primary button text: `支付 {amount}`
- Proposed Hero treatment:
  - reuse the BillLineCard visual language, but remove:
    - payer
    - checkbox
    - selectable affordance
  - keep:
    - amount as the primary signal
    - settlement / runtime tag
    - one line of label or description
- Proposed payment-method section:
  - use `PuCell + PuRadio + usePuSelect`
  - no target-aware pre-restriction in the option list itself
  - do not surface unfinished-binding hints before charge-initiation because
    current approved contract deliberately keeps provider discovery target-
    agnostic
  - do not expose provider channel internals such as `JSAPI` / `H5` in the
    primary user-facing list unless a later slice proves they are necessary
- Proposed dynamic layout rule:
  - keep the same page structure across idle / launching / polling states
  - evolve only:
    - CTA text / disabled-loading state
    - Hero tag
    - optional helper notice or dialog
- Revised alignment requirement from review:
  - this slice should not keep depending on the legacy payment-owned checkout
    aggregate read
  - related backend alignment and checkout page route changes should be handled
    together with the interaction/UI slice
  - corrected route conclusion:
    the current `/payment/checkout?bill-line=...` shape is already enough; the
    real missing piece is a Billing-owned bill-line read surface
- standalone follow-up artifact opened:
  - `payment-checkout-interaction-ui-plan.md`
- segment framing correction:
  - do not continue splitting `Interaction / Contract` and
    `IA / Wireframe Recovery` as if they were independent implementation
    slices
  - treat route shape, data assembly, page IA, pay-action runtime, and minimal
    backend dialog-alignment as one coherent checkout slice
- final review decisions now locked:
  - checkout success should show a short-lived success state and then
    auto-return
  - do not add a separate payment-domain status for
    "paymentTx created but bridge launch did not complete cleanly"
  - all user-visible payment outcome text must be derived from backend
    `PaymentTx`, not from bridge callback wording
  - after any bridge return / fail / throw, immediately reconcile through
    `GET /api/payment/:paymentTxId`
  - do not expand `PAYMENT_PROVIDER_CONFLICT` payload in this slice
  - dedicated checkout Hero is preferred over extending `BillLineCard`

## Current Segment: Payment Checkout Route / Ownership

- New requested segment:
  - move checkout to `/payment/checkout?bill-line=...`
  - make frontend own the user-facing checkout route shape
  - keep backend ownership on payable facts and execution endpoints
- Confirmed current coupling points:
  - frontend route is still `/bill-lines/:billLineId/checkout`
  - `PaymentCheckoutPage.vue` still parses `route.params.billLineId`
  - backend `BillDetailProjection.lines[]` still exposes `checkoutHref`
  - `CommerceBillDetailPage.vue` CTA still consumes `checkoutHref`
  - `BillLineCard.vue` still gates selectability on `checkoutHref`
  - focused system scenario still asserts the old pathname shape
- Confirmed segment boundary:
  - this slice changes route ownership only
  - backend checkout transport stays bill-line-scoped for now:
    `GET /api/commerce/bill-lines/:billLineId/checkout`
  - charge creation and payment sync endpoint shapes also stay unchanged
  - checkout reset shell remains as-is; body redesign belongs to a later slice
- Planned implementation:
  - add a frontend-owned commerce checkout route helper
  - move the page route to `/payment/checkout`
  - parse `bill-line` from query in `PaymentCheckoutPage.vue`
  - remove backend `checkoutHref` from bill-detail projection
  - make Bill Detail CTA derive checkout route from selected bill-line id
  - make BillLine Card selectable based on `payableByViewer` only
  - update focused scenario to assert pathname plus query
- Implementation result:
  - frontend now owns the user-facing checkout route
  - backend `BillDetailProjection.lines[]` no longer returns `checkoutHref`
  - Bill Detail CTA now derives checkout location from selected bill-line id
  - `PaymentCheckoutPage.vue` now reads `bill-line` from query
  - `BillLineCard.vue` no longer couples selectability to a backend href field
- Verification result:
  - focused `biome` check passed
  - frontend typecheck passed
  - backend typecheck passed
  - focused RideHailing system scenario passed against
    `/payment/checkout?bill-line=...`
- Prior segment result kept active:
  - local fake WeChatPay fixture is now stable across restarts
  - local development-only `web` payment-provider baseline exists via
    `0081_dev_mock_payment_provider_baseline.sql`
- Next step:
  - continue into the next Payment Checkout slice:
    IA/body redesign or broader target contract discussion
  - implemented stable fake fixture asset and development-only provider seed
  - current local `db:migrate:dev` is blocked by an unrelated historical local
    migration/index collision at `0061_user_telemetry_v2.sql`
  - isolated temporary-database migration proof passed, including the new
    `0081_dev_mock_payment_provider_baseline.sql`
  - next product step can return to Payment Checkout IA / wireframe, or the
    user can ask for commit cleanup first

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

## Current Segment: Typed-Order Timeout Override Owner

- Clarified owner:
  RideHailing unpaid-window correction should not be implemented by adding
  `order.family` checks into payment checkout use cases.
- Approved direction:
  keep payment-side timeout readers family-agnostic and let typed order
  sub-domains override base-order timeout at create time.
- Concrete meaning:
  - `RENTAL` keeps the current unpaid-window timeout behavior
  - `RIDE_HAILING` writes a non-expiring timeout override suitable for final
    bill payment after trip finish
- Explicit non-goals for this segment:
  - do not refactor the shared `TradeOrder.timeout` shape yet
  - do not introduce prepaid/postpaid technical fields on `Bill`
  - do not solve this by scattered family-specific branching inside payment
    checkout
- Implemented result:
  - base-order creation now accepts a typed-order-provided timeout snapshot
  - Rental keeps the standard 30-minute unpaid window
  - RideHailing overrides the timeout snapshot to a non-expiring value so final
    bill payment is not bounded by the standard unpaid window

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

## Current Diagnostic Note: Payment Notify Base URL

- Observed failure:
  `POST /api/payment/:paymentProviderInstanceId/charge?bill-line=...` returned
  HTTP 500 with detail
  `PAYMENT_NOTIFY_BASE_URL is required for WeChatPay notifications`.
- Code-path diagnosis:
  `payment-contract.ts` calls `resolveWeChatPayChargeNotifyUrl()`, which
  delegates to `resolvePaymentNotifyBaseUrl()` in
  `domains/payment/services/payment-provider.ts`.
- Ownership clarification:
  `PAYMENT_NOTIFY_BASE_URL` is runtime environment ownership for backend
  callback origin; it is not stored on `payment_provider_instances`.
- Admin UI clarification:
  Admin Payment page `Charge Notify URL` and `Refund Notify URL` are
  read-only projections built from `PAYMENT_NOTIFY_BASE_URL`; when the env is
  absent they correctly render empty.
- Migration clarification:
  `0081_dev_mock_payment_provider_baseline.sql` seeds provider credentials plus
  upstream `config.endpointBaseUrl`, but it does not and should not persist
  notify URLs because callback origin is system-owned rather than
  provider-instance-owned.

## Current Diagnostic Note: Payment Checkout Runtime Gaps

- Long `paymentTxId` is confirmed:
  `encodePaymentTxId()` currently serializes
  `{ kind, billLineId, paymentProviderInstanceId, attemptCount }` to JSON and
  then base64url, yielding ids around 200+ characters.
- Provider-length concern is *not* currently the same bug:
  WeChatPay-facing `merchantOrderNo` / `out_trade_no` is generated separately
  as a fixed 32-character signed reference, so the long `paymentTxId` is not
  currently sent to WeChatPay.
- Local "still unpaid after pay" diagnosis is currently strongest at runtime
  baseline split rather than shared checkout logic failure:
  - active local provider instance in the database points to
    `https://wechatpay.partner-up.local`
  - current backend notify base env uses `https://api.partner-up.local`
  - current frontend fake bridge env still uses
    `https://wechatpay.partner-up.localhost`
  - direct health probes show `.local` endpoints respond `200` while the
    `.localhost` counterparts are not the active provider runtime
- Mainline regression check:
  the system scenario happy path still passes end-to-end, so the "stays unpaid"
  symptom is not a universal contract failure; local drift is currently the
  first suspect.
- New runtime update:
  - local `VITE_FAKE_WECHATPAY_ORIGIN` has now been corrected to match the
    active portless `.local` runtime
  - local servers were restarted after the env correction
  - the "payment stays unpaid after 5-6 seconds" symptom still reproduces
- Diagnostic consequence:
  the earlier `.local` / `.localhost` mismatch was a real configuration drift,
  but it is no longer sufficient to explain the current unpaid symptom. The
  active diagnosis should now move deeper into bridge -> fake-provider state ->
  backend poll reconciliation rather than staying at environment-baseline level.
- Deeper runtime evidence:
  - `GET https://wechatpay.partner-up.local/__fake_wechatpay/state` showed the
    latest local checkout transaction existed but remained `tradeState = NOTPAY`
  - therefore backend `createChargePrepay` succeeded, but browser-side payment
    completion did not reach the fake provider
  - manually calling
    `POST /__fake_wechatpay/prepays/:prepayId/succeed` advanced the fake
    transaction to `SUCCESS`
  - the referenced `bill_lines` row was then observed as settled in the local
    database, which proves backend notify / settlement is healthy after the
    provider is actually advanced
- Root-cause probe:
  - a real-browser Playwright probe against `https://partner-up.local/`
    confirmed `window.WeixinJSBridge` is installed
  - the same browser can call the fake provider origin directly
  - but invoking the runtime fake bridge returns:
    `get_brand_wcpay_request:fail Failed to execute 'fetch' on 'Window': Illegal invocation`
  - this points to `fake-wechatpay-bridge.ts` passing detached native `fetch`
    as `fetchImpl: fetch` and later calling it as a plain function, which is an
    illegal invocation in the browser runtime
- UX consequence:
  `launchPaymentClientAction()` currently ignores WeixinJSBridge callback
  `err_msg`, so this bridge failure is swallowed. Checkout then starts polling
  a provider transaction that never left `NOTPAY`, which matches the reported
  "still unpaid after 5-6 seconds" symptom.
- Latest discussion direction:
  - next repair segment may be widened beyond a narrow bug fix to include the
    local payment-client UI itself, so development runtime can truly operate
    `pay` / `cancel` rather than only auto-success
  - preferred terminology for the current slice:
    - payment client: `WeixinJSBridge`
    - payment server: selected payment provider / provider adapter
    - `launch-payment-client-action.ts` is only a frontend orchestration seam,
      not the payment client itself
- Open architecture question:
  - current WeChatPay path appears to expose two serialized identifiers for the
    same payment attempt:
    - backend-facing `paymentTxId`
    - provider-facing `merchantOrderNo` / `out_trade_no`
  - both are derived from the same durable attempt tuple
    `{ kind, billLineId, paymentProviderInstanceId, attemptCount }`
  - this may not be "two truths", but it is still a duplicated identity codec
    and should be reviewed as part of the checkout/payment workstream
- Active planning artifact:
  `tasks/ride-hailing-ui-fixes/payment-client-ui-attempt-identity-plan.md`
- Fake JSAPI bridge completeness gap is confirmed:
  runtime fake bridge only calls
  `POST /__fake_wechatpay/prepays/:prepayId/succeed`; there is no mocked
  payment sheet or user-selectable `cancel` / `fail` / `escape` path.
- Payment client interpretation gap is also confirmed:
  `launchPaymentClientAction()` resolves on any WeixinJSBridge callback and
  does not inspect `err_msg`, so even if the fake bridge later grows cancel or
  failure callbacks, the checkout page would not yet distinguish them.
- Polling UX gap is confirmed by implementation:
  `PaymentCheckoutFlow.vue` shows polling through inline notice and binds the
  footer button loading state to each reconciliation request. Because polling
  eligibility depends on `!isReconcilingPaymentTx`, the notice and button label
  oscillate while each poll request is in flight.
