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

## Investigation: RideHailing SKU Card, Multi-Select, And Float Panel

- Requested next slice:
  migrate RideHailing SKU card to package primitives, make the vehicle option
  list use `usePuSelect` with multi-select, and replace the custom bottom sheet
  with `PuFloatPanel`.
- Design-web finding:
  `PuCard` supports `selectable` and `active`, `PuCheckbox` is a boolean native
  checkbox primitive, `usePuSelect` supports single and multiple selection
  state, and `PuFloatPanel` supports bottom-attached draggable height stops.
- Design-web caveat:
  `PuCard` usage guidance says interactive cards must not contain nested
  interactive controls. A card plus checkbox composition must avoid creating
  two independent focusable controls for one option.
- SKU presentation finding:
  current durable merchandising contract gives `presentation` to SPU only.
  `product_skus`, admin SKU input, create/update SKU use cases, and
  `OrderingOfferDetailSku` do not currently expose SKU-level presentation or
  image fields.
- Model concern:
  RideHailing ordering currently has an `EXACTLY_ONE` SKU selection policy and
  order/evaluation commands use concrete `items: [{ skuId, quantity }]`.
  A multi-select vehicle UI should likely represent a quote candidate set /
  user preference set, while the create-order command still needs one selected
  SKU unless the order model is deliberately widened.
- Implementation boundary to confirm:
  this slice may need a small catalog-contract expansion for SKU preview images
  and a frontend summary/output model change so Ordering Shell can receive
  multi-selected quote data without confusing it with the authoritative
  create-order item.
- Human decision:
  SKU should own full `ProductPresentation`, not a reduced preview-only
  presentation field.
- Human decision:
  RideHailing vehicle selection should be multi-select. A user selects multiple
  acceptable vehicle SKUs; dispatch should search for a suitable driver within
  that selected SKU set.
- Interaction decision:
  the `PuCard` + `PuCheckbox` composition should behave as one unified option
  target, avoiding independent nested card and checkbox interactions.

## Model Direction: Choice-Set Order Item For RideHailing

- Human model proposal:
  extend the Order model so it can natively represent the RideHailing shape:
  the user orders a set of acceptable products, while fulfillment ultimately
  grants exactly one product from that set.
- Model correction:
  `productTypedExtraProperties.acceptableSkuIds` is cleaner than overloading
  `items` with multiple ordinary order items, but it may still be too
  product-specific if the same "choose one from this acceptable set" shape is a
  first-class Order concept.
- Emerging order-item distinction:
  ordinary order item means "the user buys/receives this SKU"; RideHailing needs
  a choice-set item meaning "the user authorizes this SKU set, and the system or
  provider resolves one final SKU before or during fulfillment."
- Candidate vocabulary:
  - `ORDER_ITEM_FIXED`: one concrete SKU is ordered
  - `ORDER_ITEM_CHOICE_SET`: several candidate SKUs are ordered as one logical
    item, with one eventually resolved SKU
- Important invariant under discussion:
  billing, order detail, provider dispatch, and audit need both the candidate
  SKU set and the resolved SKU snapshot. The resolved SKU cannot erase the
  accepted candidate set because the user's consent was to a bounded set.
- Open modeling question:
  whether the resolved SKU must exist at create-order time after pre-flight
  quoting, or whether the order can be created with an unresolved choice set and
  resolved later during provider dispatch.
- Human decision:
  choose the unresolved-at-create model. Order creation records the accepted
  candidate SKU set; fulfillment / dispatch later resolves exactly one SKU from
  that set.
- Human decision:
  Ordering UI shows the candidate set price range, not a single resolved SKU
  price.
- Human decision:
  Bill is created from the resolved SKU quote / provider settlement amount,
  not from the unresolved candidate set range.
- Current implementation mismatch:
  existing RideHailing create-order synchronously calls the provider and stores
  one selected SKU immediately. The target model requires creating an
  unresolved choice-set item first, then resolving it through the RideHailing
  order lifecycle dispatch step.
- Human correction:
  resolution should not be constrained to candidates only. Providers may grant a
  better or different vehicle class, such as a free upgrade. Candidate SKUs are
  the user's accepted quote/search basis, while resolution must record whether
  the provider result was inside the candidate set, an upgrade, or another
  provider substitution.
- Artifact:
  saved the target RideHailing Order / Fulfillment / Bill sequence diagram in
  `tasks/ride-hailing-ui-fixes/sequence-diagram.md`.

## Planning: Choice-Set SKU, Dispatch, Billing, And Float Panel

- Human direction:
  this large slice needs a separate plan file and pre-implementation information
  collection before review and coding.
- Classification:
  the slice is now an `Intent`-level product semantics change, not a local UI
  fix. It likely needs durable PRD / Product TDD updates before or with
  production implementation.
- Information finding:
  existing ecommerce contract says SPU owns presentation, persisted order items
  are concrete SKU snapshots, and command `items` are `{ skuId, quantity }`.
  Choice-set order items therefore require a native Trade Order contract change.
- Information finding:
  current `product_skus` has no presentation, and SKU create/update/admin
  schema/ordering projection paths do not expose presentation.
- Information finding:
  current RideHailing create-order calls provider `createRide` inside the
  create-order transaction. The target unresolved model needs an explicit
  dispatch lifecycle step after the choice-set item exists.
- Information finding:
  current `ride_hailing_orders.providerInstanceId` is non-null at create time.
  A mixed-provider candidate set would require either an MVP same-provider
  constraint or a larger provider-resolution model.
- Information finding:
  current Caocao dispatch sends one `car_type`. Multi-select candidate SKUs need
  an explicit local dispatch policy rather than assuming provider-side
  multi-vehicle search.
- Design-web finding:
  `PuFloatPanel`, `PuCard`, `PuCheckbox`, and `usePuSelect` are exported from
  `@partner-up-dev/design-web@0.4.6`; `PuCard` selectable composition must avoid
  nested independent interactive controls.
- Artifact:
  added
  `tasks/ride-hailing-ui-fixes/choice-set-sku-float-panel-plan.md` with the
  collected facts, proposed phases, objections, and review questions.

## Review: Clean Long-Term Choice-Set Model Corrections

- Human principle:
  pursue a long-term clean and stable model. MVP means simpler capability, not
  a less maintainable or more complex domain model.
- Human correction:
  `ride_hailing_orders.providerInstanceId` should be removed as a required
  create-time field. Provider instance belongs to the RideHailing SKU facts and
  should be resolved from the chosen candidate during dispatch.
- Human correction:
  do not introduce `productTypedExtraProperties.acceptableSkuIds`. The
  create/evaluate command path should promote `items` to a generic
  discriminated union and support `CHOICE_SET` natively.
- Human decision:
  first dispatch policy is cheapest-first.
- Human decision:
  provider dispatch failure causes order cancellation.
- Human decision:
  if provider substitution outside candidates produces a higher final settlement
  than the displayed quote range, Bill keeps the final settlement as-is.
- Later correction:
  dispatch is not only a RideHailing Fulfillment command, it is also
  RideHailing Order lifecycle. Provider dispatch should stay inside the
  create-order transaction for this slice.
- Artifact update:
  revised `choice-set-sku-float-panel-plan.md` and `sequence-diagram.md` to
  remove `acceptableSkuIds`, promote command item union, remove provider
  pre-binding, and record the resolved review decisions.

## Review: Dispatch Lifecycle And Provider Binding Corrections

- Human correction:
  dispatch is not only a RideHailing Fulfillment command. It is also part of the
  RideHailing Order lifecycle, so this slice should not move provider dispatch
  out of the create-order transaction.
- Human decision:
  post-dispatch provider binding should live only in the choice-set resolution
  snapshot.
- Human decision:
  if provider create fails, cancel the order and do not retry the next cheapest
  candidate, another vehicle type, or another provider. Candidate sets may span
  multiple providers and multiple vehicle types per provider, but provider
  dispatch failure is not retried.
- Human decision:
  provider create failure returns the cancelled order id to the frontend.
  Ordering Page should not navigate to Order Detail; it should show a dialog
  explaining that ordering failed and why. To the user this is a failed order
  creation, while the domain records an order that was created and cancelled.
- Human scoping decision:
  Order Detail is out of scope for this slice. Keep the current legacy Order
  Detail implementation and preserve the data shape it already reads.
- Artifact update:
  revised the plan and sequence diagram to remove the async JobRunner dispatch
  direction, put provider binding only in choice-set resolution, remove retry
  behavior, define the cancelled-order API/UI behavior for provider create
  failure, and exclude Order Detail redesign from this slice.

## Final Review: Implementation Readiness Information

- Plan consistency finding:
  the target model is now coherent, but implementation must start from durable
  model/schema contracts rather than a UI-only primitive migration.
- Catalog contract finding:
  current `SkuSelectionPolicy` only supports `EXACTLY_ONE`. RideHailing
  multi-select candidate authorization needs a native choice-set selection
  policy on the SPU sales policy, otherwise the UI and Order command would
  contradict catalog truth.
- Provider binding finding:
  "provider binding lives only in choice-set resolution" includes both provider
  instance id and provider order id. Current code stores and reads both from
  `ride_hailing_orders`, so callback, live detail query, provider fee
  confirmation, and persistence mapping need a shared resolution-binding reader.
- Order item helper finding:
  current Trade item helpers assume every item has a fixed `sku` and quantity.
  After introducing `OrderItemSnapshot` union, fixed-only helpers must assert the
  fixed kind and choice-set helper functions must own candidates/resolution
  reads.
- Frontend/API finding:
  create-order result should become a discriminated union. Provider create
  failure is a successful transport response with `outcome: "CANCELLED"`,
  cancelled order id, and user-displayable reason. The Ordering Page mutation
  success branch must show a dialog and skip navigation for that outcome.
- Preflight finding:
  RideHailing choice-set price-change preflight must compare displayed/evaluated
  ranges, not `totalFen`. Fixed-order products can keep the current total
  comparison.
- Artifact update:
  added these implementation-readiness findings to
  `choice-set-sku-float-panel-plan.md`.

## Implementation: Choice-Set Backend Foundation Segment 1

- Human start:
  user accepted splitting the large slice into two implementation segments and
  explicitly started the first segment.
- Segment boundary:
  first segment implements durable contract/schema/order lifecycle foundation
  and only the minimum frontend bridge needed to keep Ordering Page working.
  It intentionally does not migrate the RideHailing SKU card to `PuCard`,
  vehicle selection to `usePuSelect`, or bottom sheet to `PuFloatPanel`.
- Implementation decision:
  segment 1 keeps RideHailing UI single-select while sending a `CHOICE_SET`
  command item containing the selected SKU as a one-item candidate set. This
  lets the backend model become correct before the multi-select visual/control
  migration.
- Implementation decision:
  provider create failure is represented as a successful transport response
  with `outcome: "CANCELLED"`, the cancelled order id, and an
  `OrderingActionProblem`. The Ordering Page handles it like a user-visible
  order failure and does not navigate.
- Implementation decision:
  provider binding is now read from the resolved choice-set item in callback,
  live-detail query, and provider-fee confirmation paths. The
  `ride_hailing_orders` row keeps lifecycle snapshots only.
- Compatibility decision:
  Order Detail remains visually unchanged for this segment. Compatibility
  readers project the selected/resolved SKU name from either fixed items or
  choice-set resolution/candidates.
- Test finding:
  old backend scenarios were still asserting provider fields directly on
  `ride_hailing_orders`; those were corrected to assert unresolved choice-set
  foundation and resolved provider binding in item resolution.
- Verification finding:
  backend typecheck, frontend typecheck, focused backend RideHailing scenarios,
  focused browser RideHailing system scenario, DB config checks, whitespace
  check, and directed Biome lint all passed after segment 1.
- Remaining work:
  second segment should handle the original visual/control migration:
  `RideHailingSkuCard` -> `PuCard` + `PuCheckbox`, list selection ->
  `usePuSelect` multiple, actual multi-select candidate ranges, and
  `ordering.ride-hailing.bottom-sheet` -> `PuFloatPanel` with three stops.

## Implementation: Choice-Set Ordering UI Segment 2

- Human start:
  user explicitly started the second segment and requested the slice validation
  and closure work.
- Implementation boundary:
  this segment stayed in the Ordering UI/control layer. It did not further
  change the backend create-order lifecycle or Order Detail redesign scope.
- UI primitive decision:
  `RideHailingSkuCard` now uses `PuCard selectable` as the option control.
  `PuCheckbox` is rendered as a visual state affordance inside the card; the
  checkbox itself does not own a separate option interaction. This preserves a
  single click/keyboard target per vehicle option.
- Preview decision:
  SKU hero image is resolved from `sku.presentation.heroImageAssetIds[0]`, then
  detail image fallback. Because current presentation values are plain strings
  and may be non-displayable asset ids, the frontend only renders direct
  `http(s)`, `data:`, `blob:`, or `/` URLs and falls back to the existing car
  icon otherwise.
- Selection decision:
  `usePuSelect<number>({ multiple: true })` owns selected RideHailing SKU ids.
  The default selected candidate is the provider/default selectable option or
  the cheapest selectable option. Tapping another card adds it to the candidate
  set instead of replacing the existing candidate.
- Pricing consequence:
  with 快车 default-selected and 专车 added, the footer shows the candidate range
  `￥36.00~52.00`; preflight range comparison detects changes as range changes,
  such as `￥36.00~52.00 -> ￥36.00~61.00`.
- Dispatch consequence:
  because the backend dispatch policy is cheapest-first, a candidate set
  containing 快车 and 专车 resolves to 快车 unless quotes change the ordering.
  The system scenario now asserts this explicitly.
- Float-panel decision:
  `PuFloatPanel` replaces the custom bottom sheet. The three stops are computed
  from the Ordering Content container height, and map fit padding follows the
  active stop. The drawer control row remains a sibling absolute layer at the
  bottom.
- Verification finding:
  frontend typecheck, focused RideHailing system scenario, directed Biome lint,
  and `git diff --check` passed after segment 2.

## Review: SKU Card Layout Remediation

- Human correction:
  Segment 2's `RideHailingSkuCard` layout is not correct. The card should not
  be a horizontal three-column list item shaped as
  `[preview][vehicle summary][price / checkbox]`.
- Human correction:
  this is not a new slice. It is a continuation of the current choice-set SKU /
  float-panel slice, and can be tracked as Segment 3: SKU Card Layout
  Remediation.
- Target layout:
  the card should be a left/right layout:
  `flex-row(meta-flex-col(flex-row(name, info-icon-btn), preview), price-flex-col(estimated-text, flex-col(amount, checkbox)))`.
- Target alignment:
  the price column is `items-end`; both amount and checkbox are right-aligned.
- Human correction:
  checkbox belongs below the price amount, not in the name row and not beside
  the amount.
- Human correction:
  there is no separate product concept called `vehicle summary`; it should be
  treated as the SKU name.
- Human correction:
  `status/reason` should not exist inside the card. Unavailable RideHailing
  vehicle options should be hidden by the list layer, not rendered as disabled
  cards with reason text.
- Invariants for remediation:
  keep `PuCard selectable`; keep `PuCheckbox` as visual state only; keep the
  card as the single interactive target; keep multi-select `usePuSelect`; keep
  SKU preview fallback; keep existing semantic test ids stable.
- Implementation status:
  remediation was later started explicitly and implemented as Segment 3.

## Implementation: Choice-Set SKU Card Layout Remediation Segment 3

- Human start:
  user explicitly started Segment 3 after the task packet was updated.
- Implementation boundary:
  this segment only changed the RideHailing SKU card display and its immediate
  caller. It did not change the choice-set order model, provider dispatch,
  `PuFloatPanel`, or Order Detail scope.
- Layout decision:
  `RideHailingSkuCard` now uses the reviewed left/right structure:
  meta column with SKU name + info icon and preview, plus a right-aligned price
  column with estimated text, amount, and checkbox below the amount.
- Interaction decision:
  the info icon remains visual-only rather than an actual nested button because
  the card itself is the single selectable target.
- Interaction decision:
  the checkbox remains a visual `PuCheckbox` state affordance controlled by
  `usePuSelect`; it does not own independent selection state.
- Content decision:
  the card no longer receives or displays `disabledReason`. Unavailable quoted
  options continue to be filtered out by `visibleRideQuoteOptions`, so status /
  reason text does not become a card concept.
- Responsive decision:
  the 420px media rule no longer hides the preview. On narrow widths the preview
  shrinks but remains visible.
- Verification finding:
  formatting, directed lint, frontend typecheck, focused RideHailing system
  scenario, and `git diff --check` passed after Segment 3.

## Exploration: RideHailing Dynamic SKU Loading

- Human next-slice intent:
  RideHailing SKU availability should become dynamic. Which RideHailing SKUs are
  listed depends on route and departure time. The proposed direction is querying
  the provider for available vehicle types based on those dynamic factors.
- Human interaction requirement:
  when Ordering entry includes a `departureAt` binding, `RideHailingOrderingContent`
  should not silently adopt it. After mount it should open a dialog asking
  whether to use the imported departure time. The default is no, meaning
  "depart now" and submitted `departureAt: null`.
- Offer detail source:
  PR Page resolves a placement ordering entry through
  `POST /api/placements/:instanceId/ordering-entry`, stores the returned
  `OrderingEntryPayload` in `sessionStorage`, and navigates to `/order/new`.
  The backend ordering-entry use case reads `placement.offerId`, resolves
  bindings from matching context, then calls `getOrderingOfferDetail`.
- Offer detail projection:
  `getOrderingOfferDetail` reads the active Offer, then reads each active SPU
  from `offer.spuIds`, filters by offer product type, reads active SKUs under
  those SPUs, and returns SPU/SKU projection data: ids, status, sales/service
  policy, presentation, SKU facts, SKU pricing model, cancellation summary, and
  offer pricing/terms.
- Current frontend chain:
  `RideHailingOrderingContent` receives catalog `offerDetail` from the Ordering
  entry. It builds `rideBaseOptions` by flattening all active catalog
  `spu.skuOptions` from the offer. It then builds `quoteOptionsInput` with
  `{ source.offerId, route }` and calls `useRideHailingQuoteOptions`.
- Current query behavior:
  `useRideHailingQuoteOptions` calls
  `POST /api/commerce/ordering/ride-hailing/options` and keys the query by the
  full input object. Because the input currently contains route but not
  departure time, route changes can refetch options while departure-time changes
  cannot.
- Current list replacement behavior:
  once the quote-options query returns any options, `rideQuoteOptions` uses the
  provider/evaluated options instead of catalog fallback options. If quoted
  options exist, `visibleRideQuoteOptions` hides non-selectable options.
- Current backend chain:
  `/ordering/ride-hailing/options` validates only `{ source.offerId, route }`
  and calls `quoteRideHailingOrderingOptions({ offerId, route })`.
- Current backend option source:
  `quoteRideHailingOrderingOptions` resolves the offer, then
  `evaluateRideOptions` enumerates every active RideHailing catalog SKU attached
  to the offer. It filters only by optional `candidateSkuIds` for submit-time
  paths; browsing/options mode has no candidate filter.
- Current provider interaction:
  each catalog SKU maps to provider facts
  `{ rideHailingProviderInstanceId, providerVehicleTypeCode }`. The backend then
  calls the provider estimate endpoint once per SKU with that SKU's
  `car_type` plus origin/destination coordinates.
- Selectability source:
  `selectable=false` is not a provider response field in the current model. It
  is backend-local interpretation. The backend returns `selectable=false` when
  the mapped provider instance is missing/inactive or when the provider estimate
  call throws/fails. Successful estimate parsing produces `selectable=true`.
- Current departure-time gap:
  `departureAt` already flows from PR `startAt` into Ordering bindings and into
  create-order extras, but it is not part of quote-options input, provider
  estimate params, query key, or options endpoint schema.
- Current provider abstraction gap:
  `RideHailingProviderPort.estimate` is a thin raw-params method. It has no
  provider-owned "list available vehicle options for route/time" capability.
  Dynamic availability currently emerges only by trying known catalog SKUs and
  marking failed estimates as non-selectable.
- Current provider quote / vehicle interfaces:
  the app-level provider port has `estimate`, `createRide`, `queryOrderDetail`,
  `cancelRide`, `queryCancelFee`, `confirmFee`, and callback parsing. There is
  no typed "list available vehicle types" method. The Caocao adapter maps
  `estimate` to `GET /common/estimatePriceWithDetail` and maps `createRide` to
  `POST /common/orderCarV2`.
- Current estimate IO:
  input is raw provider params. The app currently sends `car_type`, `flat`,
  `flng`, `tlat`, and `tlng`. Output is provider-raw `unknown`; Trade parses
  price from `estimateAmountFen | estimatePriceFen | estimate_price | price`
  and vehicle display name from `carTypeName | car_type_name`.
- Current create-ride IO:
  input is local `orderId` plus raw provider params. The app currently sends
  `callback_url`, `car_type`, `flat`, `flng`, `tlat`, and `tlng`; the adapter
  adds `ext_order_id`. Output is normalized to `{ providerOrderId,
  externalOrderId, providerSnapshot }`.
- Current fake-provider gap:
  fake Caocao stores static estimates keyed by car type. Its estimate response
  does not vary by route or departure time, and there is no dynamic availability
  control beyond changing a car type's estimate amount or forcing next create
  failure.
- Options endpoint timing and return:
  `/ordering/ride-hailing/options` is called by TanStack Query when
  `RideHailingOrderingContent` has non-null `quoteOptionsInput`. The query key
  includes the full input object, so it refetches when `offerId` or route input
  changes. It currently returns `{ quoteExpiresAt, options }`, where each option
  is a backend `RideQuoteOption` containing local SKU id/SPU id, provider and
  vehicle labels/codes, selected/selectable flags, disabled reason, estimate
  amount, quoted amount, and price explanations.
- Initial objection / boundary:
  provider-driven dynamic SKU discovery must still reconcile with catalog SKU
  ownership. Orders, billing, and SKU presentation require local SKU identity,
  so provider-returned vehicle types need a clean mapping to local SKUs rather
  than becoming anonymous frontend options.

## Model Direction: Dynamic RideHailing Product Listing

- Human model direction:
  the long-term clean model is to query the Provider for available vehicle
  classes by SPU + route + departureAt, then merge provider availability/quote
  facts with local RideHailing SKU catalog facts. A RideHailing SKU is listed
  only when:
  - provider estimate/availability returns that vehicle type for the dynamic
    route/time
  - the corresponding local SKU exists and is `ACTIVE`
- Human correction:
  do not continue returning `selectable=true/false` to the frontend for
  unavailable RideHailing SKUs. Unavailable options should be absent from the
  listing result.
- Human objection:
  Provider Port `estimate` returning `Promise<unknown>` is not a clean boundary.
  The Provider Port should define a standard app-level estimate/listing shape,
  and each adapter should translate provider-specific responses into that
  shape.
- Human routing concern:
  `/ordering/ride-hailing/options` is semantically misnamed for the target
  model. A more unified Product Listing query interface may be preferable. That
  interface could route by product type internally or perform product-specific
  pre/post processing, but the exact route boundary needs review against current
  Product Catalog and Offer responsibilities.
- Current Catalog/Offer boundary finding:
  user-facing ordering has no standalone public Product Catalog route today.
  Product/SPU/SKU/Offer authoring is admin-owned under admin commerce routes.
  User-facing product truth enters ordering through Placement's
  `OrderingEntryPayload.offerDetail`, and dynamic RideHailing option loading is
  currently under Commerce Ordering.
- Current Offer model finding:
  Offer is a commercial wrapper over one or more SPUs of the same product type.
  It owns product type, SPU ids, terms version, active window, and pricing
  policy. SPU/SKU own catalog facts/presentation/base pricing/service policy.
- Implication:
  even if the provider query is conceptually "SPU + route + departureAt", the
  public listing request likely still needs `offerId` or an Offer-scoped source
  so pricing policy, terms, and offer membership remain authoritative. The
  listing use case can then resolve offer -> SPUs -> product-specific listing
  query.
- Departure-time UX refinement:
  imported `departureAt` binding should remain available in the departure-time
  drawer as a one-tap apply action even when the initial dialog default keeps
  `departureAt` null / "depart now".

## Model Direction: Offer-Owned Product Listing Query

- Human decision:
  the unified listing query should use `offerId` as its public entrypoint. This
  means the query is not only "list product catalog"; it should include listing
  prices because Offer owns commercial pricing policy and membership.
- Human sketch:
  the conceptual pipeline is:
  - `offerId -> SPU -> SKUs`
  - product-type-specific mask logic takes local SKUs plus product-specific
    context, such as RideHailing route/departureAt, and returns listed SKUs
  - pricing is resolved behind a product-type-specific path
- Modeling concern:
  for RideHailing, provider availability/mask and provider quote are the same
  provider interaction. Splitting mask and price into two physical calls would
  be redundant.
- Working model:
  keep mask and pricing as conceptual phases, but implement them through a
  product-specific listing resolver that may do both in one pass. For
  RideHailing, `Offer + SPUs + route + departureAt` calls the Provider once per
  mapped vehicle type or through a future provider listing method, joins
  returned provider vehicle quotes to local ACTIVE SKUs, applies Offer pricing,
  and returns priced listed SKUs. This satisfies the target without forcing two
  provider calls.
- Ownership direction:
  the unified query is Offer-owned. Offer resolves the commercial context,
  active window, SPU membership, terms, and pricing policy, then dispatches to
  product-type-specific listing logic for dynamic availability and base quote
  facts.
- Boundary reminder:
  the listing result is display/draft truth. Under the later quote-identity
  model, create-order should still re-read Offer/SPU/SKU truth, but price
  freshness is enforced by validating submitted quote identity rather than
  silently re-quoting dynamic provider prices.

## Model Direction: Quote Identity Instead Of Price-Diff Preflight

- Human correction:
  a better stale-price model is for Offer Listing to return quote/estimate
  identity, not only display prices. Create-order should submit the selected
  quote/estimate ids. If the quote is expired, backend should reject with a
  quote-expired result; frontend refreshes listing and the user explicitly
  clicks order again.
- Reasoning:
  this is cleaner than comparing frontend displayed price with submit-time
  evaluation price. The quote identity becomes the authoritative draft-price
  boundary, and expiration/change handling aligns with RideHailing provider
  quote semantics.
- Consequence:
  the current submit-time price-change preflight dialog becomes unnecessary for
  RideHailing. Price freshness is enforced by quote identity validity rather
  than price comparison.
- Open modeling detail:
  if a provider returns a durable quote token/estimate id, the listing resolver
  should preserve it and pass it through dispatch/create when required. If a
  provider only returns raw estimate data, the app can mint a local quote id
  bound to offer, route, departureAt, SKU/provider vehicle, provider snapshot,
  price, and `expiresAt`.
- Choice-set consequence:
  create-order should carry product-type-independent quote identity for the
  selected candidate set. The preferred payload keeps order item semantics as
  `FIXED.quoteId` or `CHOICE_SET.candidateQuoteIds`; backend asks the Quote
  domain to resolve Offer, SKU, route/departureAt, price, quote ownership, SKU
  activity, expiry, and quote-set coherence before dispatch.
- Remaining non-price validation:
  PR/order lifecycle blockers may still be validated at create-order time, but
  they do not require a separate price preflight endpoint. They can return
  ordinary blocked/create-failed dialog states.

## Review: Commerce-Native Quote Identity Corrections

- Human correction:
  quote id should be a higher-level commerce/order concept, not RideHailing
  specific. Order and pricing should natively support quote id.
- Human correction:
  create-order should avoid repeating quote-owned data such as route,
  departureAt, SKU ids, and Offer. These should resolve from submitted quote
  identity.
- Boundary note:
  quote identity should own commercial/listing facts: Offer, SKU, product
  context such as route/departureAt, provider quote snapshot, and price.
  Customer/fulfillment facts such as participants, riders, and contact phone
  still need explicit ownership and should not be casually hidden inside quote.
- Human decision:
  quote-expired should be an HTTP 409 problem detail with a stable code, not an
  HTTP 200 `CreateOrderResult` branch.
- Human decision:
  quote snapshots should be persisted to the database.
- Human decision:
  the new listing route should be
  `POST /api/commerce/offers/:offerId/listing`.
- Artifact update:
  revised `offer-listing-quote-identity-plan.md` so quote identity is
  product-type-independent, quote snapshots are DB-backed, create-order is
  quote-bound, expired quote uses HTTP 409, and the route shape is fixed.

## Review: Quote Validity Ownership And Plan Topology

- Human correction:
  quote validity checks such as quote existence, not expired, issuing Offer
  still active, referenced SKU still active, SKU membership, and listing-context
  coherence should be owned and encapsulated by the Quote domain. Order should
  not perform these checks one by one.
- Naming finding:
  `QUOTE_SET` is a poor command item kind because it names the freshness
  mechanism instead of the order item semantics. The cleaner shape keeps
  `FIXED` and `CHOICE_SET` as item kinds, and carries quote identity as
  `quoteId` or `candidateQuoteIds`.
- Naming finding:
  `CommerceQuoteSnapshot` is too persistence-shaped for the domain concept.
  The working domain name is `OfferQuote`; the database may persist snapshots,
  but the application should treat quote as an object that can be resolved and
  validated.
- Naming finding:
  `listingId` is ambiguous. `listingSessionId` better communicates that it
  groups one Offer Listing response/context.
- Boundary finding:
  broad `unknown` quote snapshots are acceptable as database JSON envelopes,
  but they must be decoded behind the Quote boundary before Order, Pricing, or
  RideHailing lifecycle consumes them.
- Topology finding:
  Offer Listing mints quotes by joining Offer, Product Catalog,
  product-specific resolver, Provider, and pricing. Create Order consumes
  validated Quote-domain results and turns them into order items / lifecycle
  rows. Bill reads resolved order/fulfillment facts and should not decide quote
  validity.
- Artifact update:
  revised `offer-listing-quote-identity-plan.md` with a Quote Domain topology
  diagram, updated sequence diagram, Quote validity ownership, command naming
  correction, and naming/boundary review sections.

## Review: Ordering Shell Boundary And Resolved Listing Decisions

- Human correction:
  `OrderingContent` should not call Create Order. That responsibility belongs
  to the Ordering Page / shell submit flow. Product-specific Ordering Content
  owns listing, selection, and price-summary output, then emits a quote-bound
  draft to the shell.
- Human decision:
  when quote expires after create click, frontend refreshes listing and
  preserves selected SKU ids when the refreshed listing still contains matching
  SKUs. The user still needs a second explicit create click.
- Human decision:
  create-order quote-only payload should not include participants, riders, or
  contact phone. If those facts remain necessary, they need Quote/listing
  session ownership or another explicit pre-create owner rather than returning
  to create-order input.
- Human decision:
  Rental should migrate to the unified Offer Listing endpoint in this slice,
  using a thin fixed-item resolver if no dynamic Rental mask is needed.
- Naming refinement:
  fixed listed items also carry quote ids, so `OfferListedItem.kind: "QUOTE"`
  is misleading. The plan now uses `FIXED` and `CHOICE_CANDIDATE`.
- Artifact update:
  revised `offer-listing-quote-identity-plan.md` sequence/topology to route
  create-order through Ordering Page / shell, resolved the Rental and
  quote-expiry selection questions, and tightened the quote-only create-order
  payload boundary.

## Implementation: Offer Listing And Quote Identity

- Impact Handshake accepted with explicit `开始`.
- Backend implementation:
  - Offer Listing now owns quote issuance through
    `POST /api/commerce/offers/:offerId/listing`.
  - Quote identity is persisted in `commerce_quotes` and is not RideHailing
    specific.
  - Quote validity is centralized in a Quote-domain resolver. It validates
    existence, expiry, active Offer/SKU/SPU, Offer membership, item kind, and
    choice-set grouping before Order sees product facts.
  - Create-order product item payloads are quote-only:
    `FIXED.quoteId` or `CHOICE_SET.candidateQuoteIds`.
  - Create-order derives participants, Rental registrants/contact, RideHailing
    riders/contact, route, departureAt, price, Offer, and SKU facts from
    validated quote/listing snapshots.
  - Old backend submit-time evaluation and RideHailing options surfaces were
    removed rather than kept as parallel legacy API semantics.
- Frontend implementation:
  - Ordering Content owns unified listing queries and emits quote-bound draft
    output plus footer summary.
  - Ordering Page / shell owns create-order mutation and no longer performs
    price preflight/evaluate.
  - Quote-expired create failure refreshes listing, preserves matching
    selected SKU ids, and requires another explicit create click.
  - Imported `departureAt` binding now opens a prompt that defaults to "now";
    the drawer keeps a one-tap action to apply the imported time.
- Human follow-up:
  the imported departure prompt must show the concrete imported departure
  date/time value so the user can decide whether to use it. The prompt now
  displays the formatted imported timestamp in the dialog description.
- Human follow-up:
  the departure-time Drawer should also provide a one-tap way to switch back to
  "现在出发". The Drawer now has a `现在出发` action whenever a concrete
  departure time is active, clearing `departureAt` back to null.
- Test/diagnostic finding:
  `PuDialog` does not inherit arbitrary `data-testid` attributes because of
  its rendered root/teleport shape. This slice removed those attributes from
  affected dialogs and updated scenarios to assert via dialog role/text.
- Verification result:
  RideHailing and Rental system scenarios pass with the unified listing and
  quote-only create-order path.
- Non-blocking lint note:
  UI naming audit still reports `RideHailingOrderingContent` because it treats
  "Content" as weak. The name is intentionally retained because it was reviewed
  as the correct shell concept alongside header and footer.

## Review: Offer Listing And Quote Identity Test Gaps

- Human question:
  whether tests cover the case where provider estimate reports some
  RideHailing vehicle types unavailable and the Ordering Page omits those SKUs.
- Finding:
  the production listing path already catches failed provider estimates and
  omits those local SKU rows, but fake Caocao only supported price mutation and
  could not express per-vehicle estimate unavailability.
- Test-gap review:
  the important missing branches were:
  - partial provider unavailability should hide the unavailable vehicle type
  - quote-expired refresh should preserve matching selected SKU ids but prune
    selected SKUs that disappeared from the refreshed listing
  - all provider-unavailable vehicle types should leave no vehicle cards and
    disable create
  - quote validity should reject inactive Offer/SKU behind the Quote boundary
  - `CHOICE_SET` candidate quote ids must not mix different listing sessions
- Implementation decision:
  add fake Caocao estimate availability controls rather than reintroducing a
  frontend `selectable=false` concept. This keeps unavailable RideHailing SKUs
  absent from the listing result, matching the accepted model.
- Verification result:
  the new backend quote-domain scenario and the expanded RideHailing system
  scenario both pass.

## Review: Ordering Error Feedback Channel

- Human correction:
  `ordering-floating-notice-layer` should be removed because it permanently
  overlays other UI information while Dialog already explains create-order
  failure reasons.
- Finding:
  the floating notice component was only used by `OrderingFromPlacementPage` as
  a duplicate display of `createOrderMutation.error`.
- Decision:
  keep create-order feedback single-channel through Dialog. Quote expired,
  provider create failure, PR blocker, and generic create-order errors continue
  to open an acknowledgement Dialog, without a persistent floating notice.

## Review: RideHailing SKU List Loading State

- Human correction:
  RideHailing SKU list should show a loading skeleton with `PuSkeleton`.
- Design decision:
  the loading state belongs inside the SKU list region, not over the whole
  Ordering Page. The map and bottom control row should remain stable while
  quote options load.
- Interaction decision:
  show skeletons only during initial listing load when there are no visible
  quote options. During background refetch, keep the existing cards visible to
  avoid selection/list flicker.

## Explore: Ordering Entry Decoupling

- Human observation:
  `OrderingFromPlacement` is a product of over-coupling Order and Placement.
  Placement should resolve the context needed by Ordering, then hand off through
  Pinia / Bindings-like intermediate state instead of leaving the Ordering route
  named and wired as Placement-specific.
- Finding:
  `/order/new` already behaves as a generic Ordering route, but the route
  component is still named `OrderingFromPlacementPage.vue`.
- Finding:
  `OrderingFromPlacementPage.vue` itself does not call Placement APIs. It reads
  a serialized `OrderingEntryPayload` from raw `sessionStorage`.
- Finding:
  `PRPage.vue` is the real frontend coupling point. It receives
  `placement-click` from `ButtonPlacement`, then checks existing PR orders,
  resolves Placement ordering entry, writes the handoff payload to
  `sessionStorage`, and navigates to `/order/new`.
- Finding:
  backend `resolvePlacementOrderingEntry` is already a Placement boundary
  operation and already resolves binding rules, PR-derived route/time/participant
  enrichment, and Offer detail.
- Finding:
  `OrderingSupportPage.vue` duplicates raw ordering-entry storage parsing.
- Direction:
  keep backend Placement ordering-entry as the binding-resolution authority, but
  move frontend click orchestration into Button Placement or a composable called
  only by Button Placement. Add a Commerce/Ordering-owned Pinia handoff store
  and rename the page to generic `OrderingPage`.
- Artifact:
  added `ordering-entry-decoupling-plan.md` with topology, target model,
  candidate Impact Handshake, invariants, and verification.
- Human decision:
  the full ButtonPlacement click flow belongs in ButtonPlacement or a dedicated
  `usePlacement...` composable, not PR Page. This includes existing-order
  lookup, Placement ordering-entry resolution, Ordering handoff write, and
  `/order/new` navigation. PR Page may pass `matchingContext` and `prId`.
- Implementation:
  added a Commerce/Ordering Pinia handoff store for `OrderingEntryPayload`,
  moved Button Placement click orchestration into
  `usePlacementOrderingEntryFlow`, and renamed the route component to generic
  `OrderingPage.vue` while keeping `/order/new` stable.
- Boundary correction:
  docs now phrase `prId` as not being a separate Placement matching parameter;
  PR-derived facts may still be present inside `matchingContext`, and PR Page may
  pass explicit `prId` to Button Placement for existing-order lookup.

## Solidify: Durable Docs Promotion

- Human request:
  review all completed slices and update durable docs where task-packet truths
  have become stable product or cross-unit technical truth.
- Promotion decision:
  do not promote component-level UI implementation details such as `PuCard`,
  `PuFloatPanel`, or `PuSkeleton` into durable docs. Those remain source-level
  implementation facts unless they become cross-unit contracts.
- Promotion decision:
  promote stable user-visible commerce behavior into PRD:
  - PR-attached ordering enters through Button Placement and assembles on
    `/order/new`
  - Offer Listing is the user-visible quote surface
  - expired quotes refresh listing, preserve matching selection when possible,
    and require another explicit create click
  - RideHailing users authorize a selected candidate set, see a candidate price
    range, and unavailable provider vehicles are omitted
  - RideHailing provider-create failure keeps the user on `/order/new` with a
    failure dialog
- Product TDD correction:
  `system-state-and-authority.md` had stale wording that put RideHailing
  provider binding on `ride_hailing_orders`. It now separates RideHailing
  execution fields on `ride_hailing_orders` from provider binding in the Trade
  order choice-set resolution snapshot.
- Ecommerce contract refinement:
  `/order/new` is now named as the PR-attached ordering assembly route in the
  journey chain. `offerDetail` is clarified as an ordering projection, not a
  user-facing Offer Detail page or dynamic quote authority.

## Diagnose: RideHailing Order Detail Mock Lifecycle Control

- Human observation:
  after order creation, the fake RideHailing order moves too quickly from
  dispatching to in-trip and pending-payment states, which makes manual Order
  Detail state review difficult.
- Finding:
  fake Caocao has no timer-based lifecycle. The rapid movement comes from
  `queryOrderDetailV2`: every provider detail read calls
  `FakeCaocaoState.advanceOrderDetail`.
- Finding:
  backend `buildRideHailingDetailProjection` queries provider detail every time
  Order Detail is loaded if provider binding exists.
- Finding:
  frontend `CommerceOrderDetailPage` polls RideHailing order detail every
  1500 ms until a bill exists.
- Consequence:
  opening Order Detail causes the frontend polling loop to drive fake provider
  state through `CREATED -> ACCEPTED -> IN_TRIP -> FINISHED`; the fake server
  then posts callbacks and final settlement creates a bill.
- Target direction:
  make fake provider detail reads read-only by default and add explicit fake
  admin/test-control routes to set or advance order phase and post callbacks.
- Planning artifact:
  added `order-detail-mock-control-plan.md`.
- Human proposal:
  add a dev-only "advance phase" button around the RideHailing Provider Instance
  Admin editing surface.
- Review:
  this is feasible, but the Provider Instance card is provider-level while fake
  orders are order-level. A no-argument button needs a target policy.
- Recommended target policy:
  advance the latest non-terminal fake Caocao order behind the selected provider
  endpoint, and return/display the affected provider order id and phase.
- Human correction:
  the button was intended for the main "编辑 Provider Instance" card, not the
  left selectable Provider Instance card.
- Updated UI direction:
  add a separate dev-only main-area card for fake lifecycle controls, rather
  than nesting the action inside either the left selection card or the edit form
  card.
- Human correction:
  Frontend Admin should call fake Caocao directly. Do not introduce a backend
  admin proxy endpoint for advancing fake phases.
- Boundary note:
  with direct frontend calls, `import.meta.env.DEV` gating keeps the control out
  of production UI, but it is not a server-side security boundary. This is
  acceptable for fake-provider developer tooling as long as the target route is
  the fake endpoint from the selected Provider Instance config.
- Implementation:
  fake Caocao provider detail reads are now read-only; explicit fake control
  routes own phase set/advance and callback posting.
- Implementation:
  RideHailing Provider Instance Admin has a separate dev-only "开发调试" card
  that directly calls the selected Provider Instance endpoint to advance the
  latest non-terminal fake order.
- Verification note:
  fake server unit tests cover explicit phase advancement and latest
  non-terminal targeting, while the RideHailing system scenario now asserts
  repeated Order Detail polling does not auto-advance the fake provider order
  beyond the create-time accepted callback.

## Explore: RideHailing Order Detail Content Redesign

- Human request:
  update Order Detail Page and RideHailing Order Content. Order Detail Page
  should use no-padding `PuPageScaffold`, and RideHailing Order Content should
  follow the old uniapp RideHailing page reference because the current
  implementation is structurally wrong.
- Finding:
  current Web code has no extracted `RideHailingOrderContent` component. The
  RideHailing detail surface is inline inside `CommerceOrderDetailPage.vue`.
- Finding:
  current RideHailing detail uses a CSS fake map and generic fact cards. This
  is the main mismatch with the RideHailing interaction model.
- Reference interpretation:
  the uniapp file is a RideHailing ordering page, not an order-detail page. The
  transferable model is full-screen map plus bottom panel, not its exact
  ordering-specific controls.
- Implementation direction:
  split RideHailing detail into a Commerce-domain
  `RideHailingOrderContent.vue` component that owns the full-screen `RouteMap`
  and bottom `PuFloatPanel`, while `CommerceOrderDetailPage.vue` keeps route
  parsing, querying, polling, and Rental detail behavior.
- API detail:
  `PuPageScaffold` supports `padding="none"`; this should be used instead of a
  page-local no-padding class/variable trick.
- Implementation:
  `CommerceOrderDetailPage.vue` now uses the actual no-padding scaffold API and
  keeps Rental-specific document padding in its own body wrapper.
- Implementation:
  `RideHailingOrderContent.vue` is a Commerce-domain component that owns the
  full-screen `RouteMap`, bottom `PuFloatPanel`, and RideHailing-specific
  status/fact/payment display. The page still owns order querying, route
  parsing, polling, and Rental mutations.
- Review note:
  the uniapp reference was treated as a topology reference, not a literal
  content copy, because it is an ordering page while the active target is Order
  Detail.

## Explore: RideHailing Order Detail Map And Live Route

- Human request:
  continue on `RideHailingOrderContent`, focusing on map and route behavior
  across RideHailing phases:
  - dispatching should center the origin and show a searching ripple
  - accepted / picking up should show provider route polyline and vehicle marker
  - arrived at pickup should center the vehicle marker and hide polyline
  - in trip should show provider remaining route and vehicle marker, without
    already-driven route
  - finished / cancelled should show the persisted planned driving route
- Finding:
  current web `RideHailingOrderContent` always passes
  `ride.route.drivingPlan?.polyline` to `RouteMap` as planned route geometry.
- Finding:
  lower-level `SharedMap` already accepts arbitrary `markers`, `polylines`, and
  `activeGeometry`, and the Tencent adapter already has a `routeDriver` marker
  style backed by `/route-map/map-marker-driver.png`.
- Finding:
  `RouteMap` is a generic route-domain wrapper and currently does not accept
  RideHailing live markers/polylines as extra geometry.
- Finding:
  backend Order Detail projection exposes `executionPhase`, driver/vehicle
  text, and loose provider live detail, but not provider route polyline,
  vehicle coordinates, or vehicle heading.
- Finding:
  current local `RideHailingExecutionPhase` has no `ARRIVED_AT_PICKUP`, so it
  cannot drive the requested marker-only arrived state without a lifecycle
  model change.
- Finding:
  official Caocao docs expose separate driver location and driver pickup /
  dropoff route APIs. This supports promoting live geometry into typed provider
  port methods instead of inferring route geometry from raw order detail.
- Reference note:
  uniapp detail uses dynamic navigation only for on-the-way states and treats
  server navigation polyline as the current / remaining route; already-driven
  history is a separate grey polyline.
- Plan:
  added `order-detail-ride-hailing-map-plan.md`.

## Execute: RideHailing Order Detail Map Backend Segment

- Segment split:
  human approved splitting the slice into backend first, frontend second, and
  then manual validation.
- Backend boundary:
  this segment intentionally avoids frontend map rendering changes. It only
  prepares the typed provider/live-geometry data needed by the future frontend
  segment.
- Provider-port decision:
  `queryOrderDetail` should not leak raw provider response shape across domain
  boundaries. The adapter now owns raw Caocao parsing, and Trade consumes typed
  provider detail/location/route snapshots.
- Callback mapping decision:
  official Caocao lifecycle events are now mapped explicitly. Non-lifecycle
  provider events preserve the current local execution phase instead of being
  guessed into a lifecycle state.
- Official-event correction:
  the backend callback scenario now uses event `6` for final settlement /
  service end. Event `25` is treated as a non-lifecycle provider event and no
  longer advances execution phase by itself.
- Projection decision:
  `RideHailingOrderDetailProjection.live` exposes typed and sanitized live
  fields. Provider raw snapshots remain internal to provider/bill audit data
  and are not returned to the frontend detail payload.
- Resilience decision:
  provider order detail remains required when a provider binding exists, but
  live geometry queries are optional. A location/route endpoint failure should
  degrade the map, not fail the entire Order Detail page.
- Fake-provider decision:
  fake Caocao now stores order origin/destination from `orderCarV2` params so
  driver position and provider route responses can be deterministic and tied to
  the created order.

## Execute: RideHailing Order Detail Map Frontend Segment

- Boundary decision:
  `RouteMap` gained generic extra geometry inputs only. RideHailing phase
  semantics remain in Commerce RideHailing Order Detail code.
- View-model decision:
  the phase-to-map behavior is implemented as a pure helper next to
  `RideHailingOrderContent` so the frontend can test lifecycle geometry
  without relying on Tencent map canvas internals.
- Dispatching decision:
  `DISPATCHING` centers the route origin marker through `activeGeometry:
  route-point-0`. The temporary CSS absolute ripple was removed because it was
  not truly bound to the route origin marker; a correct marker-bound ripple
  should wait for shared map overlay or marker-decoration support.
- Accepted / in-trip decision:
  provider route polylines are treated as current remaining navigation routes.
  The frontend does not trim them unless future provider evidence shows Caocao
  returns historical full-trip trails.
- Fallback decision:
  accepted without live geometry falls back to planned route; arrived without a
  driver coordinate centers the origin; in-trip without provider route shows
  the driver marker with a muted planned-route fallback.
- Effective-phase correction:
  map rendering must use local persisted `ride.executionPhase` only. Provider
  live phase/status may be useful raw data, but it must not advance map state
  ahead of the order lifecycle. This prevents a persisted `DISPATCHING` order
  from showing accepted-provider geometry, losing the origin marker focus, and
  hiding the dispatch ripple.
- Raw-panel decision:
  the `PuFloatPanel` content is temporarily reduced to raw JSON for manual
  diagnosis of order state, RideHailing projection, provider live data, bill,
  payment, and computed map view-model.
- Scenario decision:
  the system scenario asserts stable semantic `data-map-mode` values while
  manually posting fake Caocao phase callbacks. It does not assert canvas pixels
  or SDK layer internals.

## Diagnose: Single Marker Fit Padding Under PuFloatPanel

- Observation:
  in `DISPATCHING`, the route origin marker looked too close to the bottom of
  the visible map area after accounting for the absolute `PuFloatPanel`
  overlay.
- Root cause:
  RideHailing correctly passed bottom-heavy `fitPadding` into `RouteMap`, but
  the Tencent provider used `easeTo(center)` for a single active coordinate.
  That single-point branch ignored padding entirely. Padding was only honored
  by the multi-coordinate `fitBounds` branch.
- Secondary note:
  panel stop height is still an estimate of the visual overlay height. That may
  explain small future polyline-frame deviations, but it was not the primary
  cause of the origin marker being centered against the full map container.
- Decision:
  fix the shared provider's single-coordinate fit path by using a tiny
  `fitBounds` area with the same padding and single-point max zoom cap. Keep
  RideHailing-specific offset logic out of the map caller.

## Review: RideHailing Order Detail PuFloatPanel Content

- Scope correction:
  after the map/live-route segment, `RideHailingOrderContent` still shows raw
  JSON in `PuFloatPanel` for diagnosis. The next content segment should replace
  that raw panel with the reviewed order-detail content only.
- Header decision:
  the panel top is the Status Hero. It contains status title and description on
  the left, with the cancel-order action immediately to the left of the more
  operation button on the right when cancellation is available.
- Dispatching-only SKU decision:
  only while dispatching, the content immediately after Status Hero is the
  placed RideHailing SKU candidate list. It should reuse the same visual shape
  as `RideHailingSkuCard`, but in read-only mode: non-selectable and without a
  checkbox.
- Shared SKU card decision:
  `RideHailingSkuCard` may gain a readonly display shape. Default Ordering Page
  behavior must remain selectable with checkbox.
- Ride facts decision:
  after the dispatching-only SKU list there is a larger spacing, then ride
  facts that are independent of order lifecycle and always visible.
- Ride facts structure:
  ride facts are exactly two sections:
  - `路线`: section title plus a route item list in the same style as PR Facts
    Card route items
  - `乘车人`: section title plus rider list items in the same style as the
    RideHailing OrderingContent rider drawer
- Explicit exclusions:
  do not add provider facts, bill/payment facts, driver facts, route summaries,
  extra eyebrows, extra cards, or other content in this segment.
