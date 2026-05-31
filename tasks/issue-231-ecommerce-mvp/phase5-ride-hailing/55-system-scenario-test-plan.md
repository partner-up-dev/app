# RideHailing System Scenario Test Plan

Date: 2026-05-31

## Purpose

Prepare the full RideHailing system scenario acceptance test before writing it.

The test is the Phase 5 acceptance gate. It must prove the user-visible path
through the real frontend while still exercising the provider boundary through a
fake Caocao HTTP server.

## Acceptance Boundary

The scenario must run through:

```text
Playwright browser -> Vite frontend -> backend HTTP -> temporary Postgres
  -> RideHailing provider adapter -> fake Caocao HTTP server
  -> Bill / Payment -> fake WeChatPay
```

Allowed direct setup:

- create users, PR, participants, READY status, provider instances, product,
  SKUs, offer, placement, and payment provider through backend scenario builders
  or use cases;
- register a Caocao provider instance whose config points at fake Caocao;
- register fake WeChatPay as the payment provider.

Not allowed for the acceptance path:

- directly calling commerce or ride-hailing backend APIs instead of browser
  actions;
- asserting API response JSON as the main proof;
- mutating RideHailing order state directly from the test after order creation.

Backend probes are allowed only for hidden side effects that have no meaningful
UI surface, such as proving fake Caocao received `feeConfirm`.

## Fixture Topology

Add a workspace package similar to `packages/fake-wechatpay-server`:

```text
packages/fake-caocao-server/
  src/server.ts
  src/routes.ts
  src/state.ts
  src/fixtures.ts
  src/index.ts
```

System scenario global setup should start it and expose it through
`getScenarioEnvironment()`:

```ts
fakeCaocao: {
  origin: string;
  clientId: string;
  signKey: string;
}
```

The provider instance is created with config storage, not env:

```ts
{
  adapterMode: "CAOCAO_OPEN_API",
  caocaoClientId: fakeCaocao.clientId,
  signKey: fakeCaocao.signKey,
  endpointBaseUrl: fakeCaocao.origin,
  callbackBaseUrl: backendBaseUrl
}
```

The fake should support at least:

- `/common/estimatePriceWithDetail`
  - verifies signed params;
  - returns deterministic estimates keyed by `car_type`.
- `/common/orderCarV2`
  - verifies signed form;
  - records `ext_order_id`;
  - returns deterministic `orderNo`;
  - can auto-post a signed callback to the instance callback URL.
- `/common/queryOrderDetailV2`
  - returns a deterministic progression from created/accepted/in-trip/finished
    based on fake state.
- `/common/queryCancelFee` and `/common/cancelOrderV3`
  - enough for the cancellation slice once it lands.
- `/common/feeConfirm`
  - records the side effect for final settlement verification.

Provider callbacks should use the provider-instance callback route. Keep the
legacy alias covered by its backend scenario; the full system scenario does not
need to depend on the alias unless explicitly testing migration compatibility.

## Product / SKU Fixture

Create one active RideHailing SPU:

- `productType: "RIDE_HAILING"`;
- `servicePolicy.type: "RIDE_HAILING"`;
- exact-one SKU selection;
- fixed quantity 1.

Create two active SKUs whose facts are selected by the parent SPU product type:

```ts
{
  rideHailingProviderInstanceId: caocaoProvider.id,
  providerVehicleTypeCode: "EXPRESS"
}
```

```ts
{
  rideHailingProviderInstanceId: caocaoProvider.id,
  providerVehicleTypeCode: "PREMIER"
}
```

Do not put `type` inside SKU facts. Do not introduce a generic
`vehicleClass`.

The visible vehicle label is `<providerName><carType>`, for example:

- `系统曹操快车`;
- `系统曹操专车`.

## Happy Path Scenario

Candidate file:

```text
tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts
```

Scenario name:

```text
commerce_ride_hailing_ordering_completes_provider_backed_trip
```

### Given

- creator user and at least one rider/participant exist;
- creator has fake payment open id binding;
- a route-mode PR is READY and has route facts:
  - origin;
  - optional waypoint;
  - destination;
  - concrete planned route polyline;
- active Caocao provider instance points at fake Caocao;
- active RideHailing SPU/SKUs carry `rideHailingProviderInstanceId`;
- active RideHailing Offer targets the SPU;
- active Placement stores only the Offer target and matches the PR context;
- fake WeChatPay provider is registered.

### When / Then

1. User opens `/pr/:id`.
2. User clicks `pr-detail.commerce-placement.open`.
3. Page lands on generic Ordering entry and renders RideHailing content.
4. Assert Ordering Content:
   - route map is visible;
   - origin, waypoint, destination markers/callouts are visible;
   - planned route is represented;
   - departure row says `现在出发` or `<HH:mm>出发`;
   - riders row says `同乘人`;
   - contact row says `联系方式`.
5. Open and close the editable drawers through UI:
   - departure datetime drawer;
   - riders drawer;
   - contact phone drawer.
6. Assert vehicle quote cards:
   - two cards render;
   - labels use provider display name plus Caocao car type;
   - quote prices are visible per card;
   - parent bottom action bar displays only the aggregate price range.
7. Select a non-default vehicle card.
8. Click parent create-order action.
9. Assert navigation to RideHailing Order Detail:
   - map-first detail content is visible;
   - selected ride type is shown from the base item/pricing snapshot;
   - passengers/contact and route summary are visible;
   - status is not a raw Caocao event name.
10. Fake Caocao callback/detail progression updates the UI:
    - accepted state shows driver and vehicle information;
    - in-trip/finished state updates status copy and route/live surface.
11. When final settlement exists, Order Detail exposes Bill Detail link.
12. User opens Bill Detail and pays through Payment Checkout using fake
    WeChatPay.
13. User returns to Bill/Order UI and sees paid/settled state.
14. Hidden-side-effect probe may verify fake Caocao recorded `feeConfirm`.
15. User goes back to the PR and clicks the placement again.
16. Assert Placement resolves to the existing Order Detail, not a new Ordering
    page.

## Provider Hard Failure Scenario

Scenario name:

```text
commerce_ride_hailing_provider_create_failure_allows_retry_without_open_order
```

Purpose:

- prove the topology that prevents a provider create failure from leaving a
  user-visible successful open order.

Path:

1. Given the same PR / Offer / SKU setup, but fake Caocao is configured to fail
   `orderCarV2` before a provider order exists.
2. User opens Ordering through Placement.
3. User selects a vehicle and clicks create order.
4. Assert the UI shows a creation failure and remains retryable.
5. User returns to PR and clicks the placement again.
6. Assert it opens Ordering again, not Order Detail.

Backend probes may additionally prove:

- base order is `FAILED`;
- typed RideHailing provider creation status is `FAILED`;
- PR attachment has been detached;
- no Bill exists.

These probes are supplementary; the visible user promise is still the main
acceptance signal.

## Data-TestId Contract

Ordering:

- `ordering.ride-hailing.page`
- `ordering.ride-hailing.route-map`
- `ordering.ride-hailing.route-polyline`
- `ordering.ride-hailing.route-point.origin`
- `ordering.ride-hailing.route-point.waypoint`
- `ordering.ride-hailing.route-point.destination`
- `ordering.ride-hailing.route-point.edit.origin`
- `ordering.ride-hailing.departure-time`
- `ordering.ride-hailing.departure-drawer`
- `ordering.ride-hailing.riders`
- `ordering.ride-hailing.riders-drawer`
- `ordering.ride-hailing.contact`
- `ordering.ride-hailing.contact-drawer`
- `ordering.ride-hailing.vehicle-card`
- `ordering.ride-hailing.vehicle-card.selected`
- `ordering.ride-hailing.quote-price-range`
- `ordering.ride-hailing.create-order`
- `ordering.ride-hailing.create-error`

Order Detail:

- `order-detail.ride-hailing.page`
- `order-detail.ride-hailing.route-map`
- `order-detail.ride-hailing.status`
- `order-detail.ride-hailing.selected-vehicle`
- `order-detail.ride-hailing.driver`
- `order-detail.ride-hailing.vehicle`
- `order-detail.ride-hailing.passengers`
- `order-detail.ride-hailing.route-summary`
- `order-detail.ride-hailing.cancel`
- `order-detail.ride-hailing.bill-detail-link`
- `order-detail.ride-hailing.fee-confirmed`

Keep the generic page test ids such as `order-detail.page`,
`bill-detail.page`, and `payment-checkout.page` for cross-family shell tests.

## Implementation Readiness

The full scenario cannot pass until Slice 4 through Slice 10 exist:

- RideHailing Ordering read/evaluate;
- RideHailing frontend Ordering Content;
- provider-backed create order;
- callback/detail state application;
- RideHailing Order Detail backend/frontend;
- final settlement, Bill, Payment consequence, and feeConfirm.

It is still useful to write the system scenario as an acceptance spec once Slice
4 and Slice 5 establish the route and selectors. Before that, a full executable
test would mostly be speculative selector debt.

## Scenario Test Written

Added on 2026-05-31:

- `packages/fake-caocao-server/`
  - fake Caocao HTTP boundary with signed request verification, deterministic
    estimates, order create, detail progression, cancellation fee/cancel, and
    feeConfirm recording.
- `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - happy path through PR Placement, RideHailing Ordering UI, quote cards,
    create order, RideHailing Order Detail, provider progression, Bill Detail,
    Payment Checkout, feeConfirm side effect, and existing-order routing.
  - provider create failure path proving retry remains on Ordering and no
    user-visible open order is accepted as success.

The scenario is intentionally ahead of implementation. It should fail on the
current codebase at the user-visible RideHailing Ordering boundary until Slice 4
and Slice 5 introduce the backend read/evaluate route and frontend content.

Verification after writing:

- `pnpm --filter @partner-up-dev/fake-caocao-server typecheck` passed.
- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm exec vitest run --project system-scenario tests\scenario\commerce\ride-hailing-ordering.scenario.test.ts`
  failed intentionally at `ordering.ride-hailing.page` for both scenarios. This
  confirms the browser flow can reach PR Placement and the current missing
  implementation boundary is RideHailing Ordering, not scenario setup or fake
  provider bootstrapping.
