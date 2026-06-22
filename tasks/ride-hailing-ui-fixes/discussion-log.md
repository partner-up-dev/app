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
