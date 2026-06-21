# Discussion Log

## Slice: Packet Reset And Collaboration Protocol

- Created a clean task packet for incremental RideHailing Ordering UI and Order
  Detail UI fixes.
- Confirmed collaboration protocol:
  - perform Impact Handshake before every production-code fix
  - wait for explicit `开始` before implementation
  - do not auto-commit unless explicitly requested
  - raise objections when requested changes may damage functionality,
    ownership boundaries, maintainability, readability, or established UI
    contracts

## Slice: RideHailing Ordering Content Layout

- Implemented and committed:
  `f7ac1aa3 fix(ride-hailing): align ordering content layout`.
- Naming decision:
  `RideHailingOrderingContent` should match the Ordering page shell assembly
  concepts: header, content, and footer / bottom action bar.
- Layout decision:
  RideHailing content should use a no-padding Ordering shell; content and footer
  should sit directly adjacent.
- Layout decision:
  `ordering.ride-hailing.drawer-control-row` is a sibling of
  `ordering.ride-hailing.bottom-sheet`, anchored at the content bottom and
  visually separated with `surface-container`.

## Investigation: Current Evaluation And SKU Ownership Model

- Observed model concern:
  changing the selected RideHailing SKU currently feeds into ordering
  evaluation, which re-evaluates and replaces the whole RideHailing options
  payload.
- Clarified current implementation:
  - Ordering parent page evaluation owns price summary, create-order
    availability, error notice text, and RideHailing evaluated option payload.
  - Current RideHailing SKU list has two effective sources: catalog SKU
    candidates from `offerDetail.spus[].skuOptions`, and provider-priced
    options from `/api/commerce/ordering/evaluate`.
  - Switching selected RideHailing SKU changes evaluation input, which triggers
    a full evaluate request and replaces the evaluated options array.
- Problem statement:
  candidate discovery, selected SKU state, quote refresh, price summary, and
  create-order pre-flight validation are currently coupled through one
  evaluation model.

## Decision: Target Evaluation And RideHailing SKU Model

- `evaluationOrderInput` should be produced and evaluated only after the user
  clicks the submit / create-order button.
- Evaluation should act as create-order pre-flight:
  - if key data such as quoted price has changed from what the page displayed,
    show a dialog asking whether the user wants to continue with the changed
    terms
  - if blocking reasons exist, such as PR readiness or other create-order
    pre-flight failures, show a dialog with only an acknowledgement action
  - after a successful evaluation, request create order
- `ordering-footer-action-bar__price-summary`, including price and price detail,
  should come from Ordering Content output, not from parent-page evaluation.
- RideHailing SKU list data ownership belongs to `RideHailingOrderingContent`.
- Parent-page evaluation should not include `rideHailing.options` and should
  not feed evaluated options back into `RideHailingOrderingContent`.

## Slice: Submit-Time Preflight And RideHailing SKU Ownership

- Impact Handshake accepted with explicit `开始`.
- Implementation decision:
  parent page still builds the same create-order command shape, but only calls
  `POST /api/commerce/ordering/evaluate` inside the submit handler.
- Implementation decision:
  RideHailing content owns quote option loading through a dedicated
  `POST /api/commerce/ordering/ride-hailing/options` endpoint keyed by
  `offerId + route`, not by selected SKU.
- Implementation decision:
  Ordering Content emits a local price summary for the footer and price-detail
  drawer; the parent page no longer reads footer price from evaluation output.
- Implementation decision:
  evaluate still performs authoritative submit-time pre-flight and pricing, but
  its response no longer contains product-specific RideHailing option lists.
- Runtime finding:
  moving the quote query into `RideHailingOrderingContent` caused setup-time
  evaluation of `rideRouteForSubmit`; its route conversion helper had to be
  declared before the computed chain to avoid a JavaScript temporal dead zone.
- Verification result:
  the focused RideHailing system scenario passes after the TDZ fix.

## Investigation: RideHailing Ordering Map Appears Gray

- Observed report:
  RideHailing Ordering page map appeared gray in the user's browser, while
  price, SKU list, and selected SKU behavior looked correct.
- Browser reproduction finding:
  local Playwright reproduction loaded Tencent Maps SDK, direction JSONP, map
  canvas, controls, attribution, and endpoint labels without failed requests.
- Warning finding:
  the Vue warning about `data-testid` on `PuDialog` is unrelated to the map; it
  comes from passing an inheritable attribute to a dialog component whose root
  cannot inherit attributes automatically.
- Final classification:
  the gray-map observation was confirmed by the user to be a browser-client
  issue, not a product-code or shared-map implementation issue.
- Follow-up decision:
  do not change shared map code for this observation. Keep the remaining active
  need focused on adding the RideHailing preflight price-change scenario.

## Slice: RideHailing Preflight Price-Change Scenario

- Impact Handshake accepted with explicit `开始`.
- Scenario need:
  RideHailing must cover the case where the page displays one provider quote,
  then submit-time pre-flight receives a changed quote and asks the user whether
  to continue.
- Test-support decision:
  the cleanest way to create this state is a fake Caocao admin-only estimate
  mutation route. This avoids adding artificial hooks to production commerce or
  provider adapter code.
- Scenario decision:
  assert not only that the price-change dialog appears, but also that no fake
  provider order exists before the user confirms. This proves the pre-flight
  confirmation gates order creation rather than merely appearing in parallel.
- Selector decision:
  the scenario does not use `ordering.preflight-dialog` because `PuDialog`
  cannot inherit that `data-testid` reliably. It asserts visible dialog text and
  the `继续下单` action instead.
