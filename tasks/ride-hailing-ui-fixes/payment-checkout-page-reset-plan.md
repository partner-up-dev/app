# Payment Checkout Workstream Plan

## Overall

### Objective

- rebuild Payment Checkout as a payment-first user surface instead of a
  bill-line-resource-first page
- make frontend own the user-facing checkout route topology
- prepare a stable local payment development baseline for iterative checkout UI
  work
- prepare a development-only fake JSAPI bridge so local checkout can execute
  the client payment step end-to-end

### Classification

- Primary route: `Reality`
- Workstream mode: `Explore` with backend contract and fake JSAPI bridge
  segments completed, and interaction/UI segment opened as the next active
  standalone slice

### Guardrails

- do not let backend own frontend-only route text such as
  `/payment/checkout?...`
- do not widen the current blast radius by mixing page reset, route migration,
  and local provider baseline into one opaque mutation
- do not use `apps/backend/drizzle/` for development-only fake provider seeds
- keep payment execution semantics intact while the UI shell is being reset

### Confirmed Durable Direction

- current user-facing checkout route is wrong-shaped for the intended IA:
  `/bill-lines/:billLineId/checkout`
- `BillDetailPage` should stop depending on backend-authored checkout hrefs
- preferred ownership split before the latest contract correction was:
  - backend owns payable target facts and payment execution facts
  - frontend owns the user-facing checkout route shape
- local payment development baseline needs two coordinated inputs:
  - stable fake WeChatPay fixture
  - development-only provider-instance seed in
    `apps/backend/data-migrations/`
- latest human correction changes the contract direction materially:
  - payment initiation should move under `/api/payment/*`
  - payment should return and later poll an explicit `PaymentTx` resource
  - payment-method discovery should be a separate backend-owned query surface
  - `PaymentTx` stays as a domain concept, but the deleted historical
    `payment_txs` table should not be reintroduced
- official JSAPI contract has now been re-verified:
  - frontend invocation is `WeixinJSBridge.invoke("getBrandWCPayRequest", ...)`
  - payload field casing must match the official docs exactly
  - frontend callback is not final payment truth; backend query/polling still
    decides final state
- current runtime still lacks a development-only fake `WeixinJSBridge`, even
  though:
  - scenario-only stub already exists
  - fake WeChatPay server already supports `prepay -> succeed`
- provider discovery must stay target-agnostic at `GET /api/payment/providers`
- unfinished-provider-binding knowledge must not be surfaced pre-charge through
  the provider list
- current `/payment/checkout?bill-line=...` route shape is sufficient; the
  missing owner-aligned piece is a Billing-owned bill-line read surface that
  can replace the legacy payment-owned checkout aggregate

### Workstream Segments

1. Reset Segment
   clear the current checkout successful-state body so IA can be redesigned
   from a neutral shell
2. Route / Ownership Segment
   migrate from backend-authored `checkoutHref` and path-param bill-line route
   to a frontend-owned checkout route contract
3. Local Mock Provider Baseline Segment
   stabilize fake WeChatPay fixture and seed a development-only local provider
   instance
4. Backend Contract Segment
   moved to standalone artifact:
   `payment-checkout-backend-contract-plan.md`
5. Fake JSAPI Bridge Segment
   introduce a development-only fake `WeixinJSBridge` aligned with official
   WeChatPay v3 JSAPI client invocation semantics
6. Interaction / UI Segment
   moved to standalone artifact:
   `payment-checkout-interaction-ui-plan.md`

### Open Decisions

- fake JSAPI bridge enablement surface:
  - explicit frontend env flag only
  - or env flag plus fake-provider-origin guard
- fake JSAPI non-happy-path scope:
  - success-only in the first segment
  - or include local cancel/fail semantics immediately
- H5 return-flow contract:
  - support raw redirect only
  - or defer H5 until an explicit return-to-app flow is designed
- Billing-owned target read shape for checkout assembly:
  - keep using `billLineId` as the user-facing route key
  - add or reshape a Billing-owned bill-line read surface to replace the
    legacy checkout aggregate
- charge-conflict payload shape:
  - keep generic `PAYMENT_PROVIDER_CONFLICT`
  - or return structured provider summary for dialog recovery UX

### Current Recommendation

- payment method source should be backend-authored even if the initial option
  list has length 1
- provider discovery should stay context-free at `GET /api/payment/providers`;
  target truth belongs to billing-owned reads
- prefer `JSAPI` as the first-class checkout path because:
  - existing scenario path already uses `JSAPI`
  - the active local development baseline now uses `JSAPI`
  - current H5 support only yields a redirect URL and does not yet define a
    polished return-to-app flow
- payment should be modeled as:
  - create or resume a provider execution through explicit-provider charge
  - invoke the returned payment-provider client action
  - poll the transient `PaymentTx` resource until terminal state
- checkout should treat bridge callback output as transport-only:
  - any `ok / cancel / fail / throw` branch must reconcile through backend
    `PaymentTx` before showing user-visible payment outcome
- checkout UI should not expose raw provider channel internals such as
  `JSAPI` / `H5` in the main payment-method list
- checkout success should be short-lived and then auto-return rather than
  remain as a long-lived terminal page
- fake runtime JSAPI support should:
  - emulate only `WeixinJSBridge.invoke("getBrandWCPayRequest", ...)`
  - keep backend polling as final payment truth
  - avoid pretending to be a full WeChat JSSDK

## Segment: Fake JSAPI Bridge

### Segment Objective

- make local dev runtime able to execute the JSAPI client step without a real
  WeChat container
- keep the fake bridge aligned with official WeChatPay v3 JSAPI invocation
  semantics
- avoid mixing bridge bootstrap into page IA or checkout interaction UI work

### Segment Status

- Status: completed
- Slice mode used: `Execute`

### Confirmed Truth Before Implementation

- current runtime frontend has no fake `WeixinJSBridge`
- current scenario-only fake bridge already exists
- current fake-provider already supports `prepay -> succeed`
- official JSAPI contract requires:
  - `getBrandWCPayRequest`
  - exact payload casing
  - `WeixinJSBridgeReady`
  - backend query/poll as final payment truth

### Implementation Result

- added a dev-only fake bridge installer at:
  `apps/frontend/src/shared/wechat/fake-wechatpay-bridge.ts`
- installed it during app bootstrap from:
  `apps/frontend/src/app/create-app.ts`
- added frontend env flags:
  - `VITE_FAKE_WECHATPAY_BRIDGE_ENABLED`
  - `VITE_FAKE_WECHATPAY_ORIGIN`
- added focused unit coverage for install and invoke semantics
- fake bridge scope is intentionally narrow:
  - supported:
    `invoke("getBrandWCPayRequest", ...)`
  - excluded:
    full `wx` emulation, H5, and non-happy-path provider-state simulation

### Verification Result

- `pnpm check:type:frontend`
- `pnpm exec vitest run --project frontend-unit apps/frontend/src/shared/wechat/fake-wechatpay-bridge.test.ts`
- remaining reality:
  Payment Checkout page still has no user-visible JSAPI invocation path, so
  local manual “点击支付” proof belongs to the later interaction/UI segment

## Segment: Reset

### Segment Objective

- remove the current successful-state body content from
  `PaymentCheckoutPage.vue`
- preserve the page shell and loading/error/back behavior
- keep the reset reviewable and small before IA and route redesign

### Segment Status

- Status: completed
- Slice mode used: `Execute`

### Confirmed Truth Before Implementation

- current frontend page:
  `apps/frontend/src/pages/PaymentCheckoutPage.vue`
- current frontend route parsing was path-param based:
  - `route.params.billLineId`
- current frontend query owner is bill-line-keyed:
  - `usePaymentCheckout(billLineId)`
- current backend API contract is bill-line-keyed:
  - `GET /api/commerce/bill-lines/:billLineId/checkout`
- current successful-state page hierarchy was bill-line-first:
  - `Checkout` eyebrow
  - order item heading
  - bill-line label plus amount
  - provider section
  - return-to-bill inline action
- user had already removed the header subtitle locally before this segment

### Address And Object

- `apps/frontend/src/pages/PaymentCheckoutPage.vue`
  - clear successful-state body content only
- `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - narrow checkout assertions to page reachability and return navigation
- task packet logs
  - record the reset result and verification

### State Diff

- From:
  Payment Checkout rendered a bill-line-first successful-state layout.
- To:
  Payment Checkout is an intentionally cleared shell, preserving route
  reachability and page framing only.

### Blast Radius Forecast

- frontend page shell
- focused RideHailing system scenario
- no backend contract mutation in this segment

### Invariants

- preserve invalid-id handling
- preserve loading state
- preserve error state
- preserve bill-detail fallback for the back button
- do not overwrite the user's subtitle-removal change
- do not change payment execution behavior in this reset segment

### Verification Plan

- `pnpm exec biome check apps/frontend/src/pages/PaymentCheckoutPage.vue tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts -t "commerce_ride_hailing_ordering_reaches_order_detail"`

### Implementation Steps

1. Remove the current successful-state body content from
   `apps/frontend/src/pages/PaymentCheckoutPage.vue`.
2. Keep the page shell behaviors in place:
   invalid-id, loading, error, and back navigation.
3. Remove scenario assertions that depend on the old successful-state body
   structure.
4. Keep scenario coverage for:
   checkout route reachability, page shell visibility, and return navigation to
   Bill Detail.
5. Run the focused verification plan and record the result in this packet.

### Implementation Result

- removed the current successful-state body content from
  `apps/frontend/src/pages/PaymentCheckoutPage.vue`
- preserved:
  - invalid-id notice
  - loading state
  - error state
  - back navigation to bill detail fallback
- intentionally removed the old bill-line-first content hierarchy:
  - `Checkout` eyebrow
  - bill-line label plus amount card
  - provider section
  - return-to-bill inline action card
- narrowed the focused RideHailing scenario checkout assertions to:
  - route reachability
  - checkout page shell visibility
  - back navigation to Bill Detail
- aligned one stale scenario locator from `Back` to the real accessible label
  `返回上一页`

### Verification Result

- `pnpm exec biome check apps/frontend/src/pages/PaymentCheckoutPage.vue tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts -t "commerce_ride_hailing_ordering_reaches_order_detail"`

## Segment: Route / Ownership

### Segment Objective

- move the user-facing checkout route to `/payment/checkout?bill-line=...`
- stop backend bill-detail projection from owning frontend route text
- keep checkout transport temporarily bill-line-scoped while UI ownership moves
  to the frontend

### Segment Status

- Status: completed
- Slice mode used: `Execute`

### Confirmed Truth Before Implementation

- current frontend route is path-param based:
  `/bill-lines/:billLineId/checkout`
- current frontend page parses `route.params.billLineId`
- current frontend checkout data query remains bill-line-keyed:
  `usePaymentCheckout(billLineId)`
- current backend API contract remains bill-line-keyed:
  `GET /api/commerce/bill-lines/:billLineId/checkout`
- current bill detail projection includes frontend-owned route text:
  `lines[].checkoutHref`
- current frontend bill-detail CTA consumes that backend-authored route text
- current `BillLineCard` selectable state is also coupled to `checkoutHref`
- current focused system scenario asserts the old pathname shape

### Address And Object

- `apps/frontend/src/app/router.ts`
  - move the user-facing checkout page route to `/payment/checkout`
- `apps/frontend/src/domains/commerce/`
  - add a frontend-owned checkout route helper
- `apps/frontend/src/pages/PaymentCheckoutPage.vue`
  - parse checkout target from query instead of path params
- `apps/frontend/src/pages/CommerceBillDetailPage.vue`
  - build checkout navigation from payable line facts, not backend href text
- `apps/frontend/src/domains/commerce/ui/bill-detail/BillLineCard.vue`
  - make selectable state depend on `payableByViewer` only
- `apps/backend/src/domains/payment/use-cases/get-bill-detail.ts`
  - remove `checkoutHref` from the bill-detail projection
- `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - assert the new route shape and preserve back-navigation coverage
- task packet logs
  - record the segment result and verification

### State Diff

- From:
  backend bill-detail projection includes `checkoutHref`, and frontend exposes
  `/bill-lines/:billLineId/checkout`.
- To:
  backend returns payable facts only, and frontend owns
  `/payment/checkout?bill-line=...`.

### Blast Radius Forecast

- bill-detail -> checkout navigation
- checkout page route parsing
- bill-detail line selectable gating
- focused RideHailing system scenario
- no change to backend checkout execution endpoints in this segment

### Invariants

- preserve the current backend checkout query endpoint:
  `GET /api/commerce/bill-lines/:billLineId/checkout`
- preserve current charge creation and payment sync endpoint shapes
- preserve current bill-detail single-select payment behavior
- preserve current checkout page reset shell:
  invalid-id, loading, error, and back-navigation
- do not widen this segment into checkout body redesign or target-model
  generalization

### Verification Plan

- `pnpm exec biome check apps/frontend/src/app/router.ts apps/frontend/src/domains/commerce/routing/payment-checkout-route.ts apps/frontend/src/pages/PaymentCheckoutPage.vue apps/frontend/src/pages/CommerceBillDetailPage.vue apps/frontend/src/domains/commerce/ui/bill-detail/BillLineCard.vue apps/backend/src/domains/payment/use-cases/get-bill-detail.ts tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts -t "commerce_ride_hailing_ordering_reaches_order_detail"`

### Implementation Steps

1. Add a frontend-owned checkout route helper under the commerce domain.
2. Move the checkout page route from `/bill-lines/:billLineId/checkout` to
   `/payment/checkout`.
3. Update `PaymentCheckoutPage.vue` to read `bill-line` from route query while
   keeping `usePaymentCheckout(billLineId)`.
4. Remove backend `checkoutHref` from the bill-detail projection.
5. Update Bill Detail page CTA to use the frontend route helper.
6. Update BillLine Card selectable gating to depend on `payableByViewer`.
7. Update the focused system scenario to assert the new pathname and query
   shape.
8. Run the focused verification plan and record the result.

### Implementation Result

- added frontend-owned checkout route helper at
  `apps/frontend/src/domains/commerce/routing/payment-checkout-route.ts`
- moved the checkout page route from `/bill-lines/:billLineId/checkout` to
  `/payment/checkout`
- changed `PaymentCheckoutPage.vue` to parse `bill-line` from route query
- removed backend `checkoutHref` from `BillDetailProjection.lines[]`
- changed Bill Detail CTA to build checkout navigation from the selected
  bill-line id
- changed `BillLineCard.vue` selectable gating to depend on `payableByViewer`
  only
- updated the focused RideHailing system scenario to assert:
  - pathname `/payment/checkout`
  - non-empty `bill-line` query value
  - back-navigation to Bill Detail remains intact

### Verification Result

- `pnpm exec biome check apps/frontend/src/app/router.ts apps/frontend/src/domains/commerce/routing/payment-checkout-route.ts apps/frontend/src/pages/PaymentCheckoutPage.vue apps/frontend/src/pages/CommerceBillDetailPage.vue apps/frontend/src/domains/commerce/ui/bill-detail/BillLineCard.vue apps/backend/src/domains/payment/use-cases/get-bill-detail.ts tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts -t "commerce_ride_hailing_ordering_reaches_order_detail"`

## Segment: Local Mock Payment Provider Baseline

### Segment Objective

- make local payment checkout work without manual admin provider setup
- keep the baseline stable across local process restarts

### Segment Status

- Status: completed
- Slice mode used: `Execute`

### Confirmed Truth

- current fake WeChatPay fixture is process-ephemeral:
  `packages/fake-wechatpay-server/src/fixtures.ts`
- a development-seeded provider instance would drift unless that fixture is
  made stable first
- current checkout provider selection already has a stable client id:
  `web`
- development-only provider seed belongs in:
  `apps/backend/data-migrations/`

### Planned Address And Object

- `packages/fake-wechatpay-server/`
  - provide a stable dev fixture source
- `apps/backend/data-migrations/`
  - add a development-only provider-instance seed
- task packet logs
  - record the baseline decision and verification

### Planned Verification

- focused backend/static checks for changed files
- `pnpm db:migrate:dev`
- local fake WeChatPay provider boot sanity
- checkout path can resolve an active provider for client `web`

### Segment Start Preconditions

- confirm default local charge mode:
  current recommendation is `JSAPI`
- confirm stable fake fixture source strategy:
  current recommendation is repo-committed fake-only fixture data

### Implementation Result

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

### Verification Result

- `pnpm --filter @partner-up-dev/fake-wechatpay-server typecheck`
- `pnpm --filter @partner-up-dev/fake-wechatpay-server test`
- `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
- `pnpm --dir apps/backend db:lint`
- `git diff --check`
- current local `db:migrate:dev` remains blocked by a pre-existing local issue
  in historical migration `0061_user_telemetry_v2.sql`
- isolated temporary-database `db:migrate:dev` passed and applied `0081`

## Segment: Backend Contract

- tracked in standalone artifact:
  `payment-checkout-backend-contract-plan.md`

## Segment: Interaction / Contract

### Segment Objective

- define what the checkout CTA actually does after click
- define runtime state transitions after provider SDK handoff
- define how the frontend reflects locked provider choice when an in-progress
  `PaymentTx` already exists

### Segment Status

- Status: pending
- Slice mode used: `Explore`

### IA Decisions Already Locked Before Wireframe

- the page remains payment-first
- Hero may reuse a simplified BillLineCard shape
- Hero should hide payer and checkbox
- payment method selection should use `PuCell + PuRadio + usePuSelect`
- bottom CTA remains the page's single primary action

### Follow-up

- this segment is now superseded by the standalone artifact:
  `payment-checkout-interaction-ui-plan.md`
- reason:
  IA, wireframe, route shape, frontend query-owner migration, and minimal
  backend dialog-alignment concerns are too coupled to keep as a stub inside
  the broad workstream file
