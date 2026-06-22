# RideHailing Choice-Set SKU And Float Panel Plan

## Purpose

This plan covers the large RideHailing slice that combines:

- SKU card primitive migration
- SKU-level presentation
- multi-select acceptable vehicle SKUs
- `PuFloatPanel` bottom panel migration
- native Order support for a RideHailing choice-set item
- RideHailing order lifecycle dispatch, choice-set resolution, and final billing
  from the resolved ride

This is a review artifact. It is not an implementation start signal.

## Classification

- Primary input route: `Intent`
- Current mode: `Explore` -> `Solidify`
- Implementation mode: blocked until plan review, Impact Handshake, and explicit
  `开始`

The slice changes product semantics, not only UI rendering. Durable truth likely
needs promotion into `docs/10-prd/` for business vocabulary and
`docs/20-product-tdd/ecommerce-contracts.md` for cross-unit contracts before or
with production code.

## Accepted Direction

- Long-term clean model wins over short-term low-risk patches. MVP can keep
  behavior simple, but the domain model should not become less maintainable just
  to reduce immediate blast radius.
- SKU should own full `ProductPresentation`.
- RideHailing vehicle selection is multi-select: the user authorizes a set of
  acceptable vehicle SKUs.
- Create-order stores an unresolved choice-set item.
- RideHailing Order lifecycle dispatch resolves exactly one final vehicle SKU
  or provider vehicle type after the choice-set item has been created.
- Provider dispatch should not be moved out of the create-order transaction for
  this slice. Dispatch is not only a Fulfillment concern; it is also part of
  RideHailing Order lifecycle.
- Post-dispatch provider binding lives only in the choice-set resolution
  snapshot.
- The Ordering UI shows the selected candidate set price range.
- The final Bill is created from the resolved SKU quote / provider final
  settlement amount.
- Resolution does not have to be inside the candidate set. Provider upgrade or
  substitution is real-world behavior and must be recorded, not forbidden.
- RideHailing provider instance is SKU-bound product fact. It should not be a
  required create-time field on `ride_hailing_orders`.
- The create/evaluate command boundary should promote `items` to a generic
  discriminated union instead of hiding RideHailing candidates in
  `productTypedExtraProperties.acceptableSkuIds`.
- First dispatch policy: cheapest quoted candidate first.
- Provider dispatch failure causes order cancellation.
- Do not retry provider dispatch on the next cheapest candidate or another
  provider. A candidate set may include multiple providers and multiple vehicle
  types per provider, but provider create failure is not retried in this model.
- When provider create fails, create-order returns the cancelled order id plus
  enough cancelled status/reason data for the Ordering Page to show a failure
  dialog. For the user, this behaves like order creation failed, even though the
  domain has created then cancelled an order.
- Ordering Page should not navigate to Order Detail for that cancelled
  create-order result.
- If provider substitution outside candidates leads to a higher final
  settlement than the displayed candidate range, Bill keeps the final settlement
  as-is.
- Order Detail is out of scope for this slice. Keep the current Order Detail
  implementation and preserve the compatibility data it already reads.
- `PuFloatPanel` should have three stops:
  - minimized: show more map
  - normal: current bottom-sheet height
  - expanded: minimize map

## Information Collected

### Durable Contract

- `docs/20-product-tdd/ecommerce-contracts.md` currently says SPU owns
  presentation truth, while SKU owns pricing and SKU facts.
- `SkuSelectionPolicy` currently supports only `{ type: "EXACTLY_ONE" }`, which
  conflicts with RideHailing multi-select candidate authorization.
- The same document currently says persisted `trade_orders.items` are SKU
  snapshots plus quantity.
- Ordering Content currently emits selected SKU `items` plus
  `productTypedExtraProperties`.
- Ordering create/evaluate currently use the same command shape:
  `{ source, prId?, participants, items, productTypedExtraProperties }`.
- Current RideHailing contract says Order is created from a quote snapshot,
  provider binding and execution phase live on `ride_hailing_orders`, and final
  Bill is created only after provider final settlement input is committed.

### Backend Current State

- `product_skus` has no `presentation` column.
- `ProductSku` model, SKU create/update inputs, admin SKU schema, admin product
  workspace, and `OrderingOfferDetailSku` do not include presentation.
- RideHailing dev fixture stores presentation only on the SPU.
- `OrderItemSnapshot` is one fixed SKU snapshot plus quantity.
- `resolveSelectedSku` reads the first command item and enforces quantity 1.
- Trade item helpers such as `getOrderItemSkuName` and
  `getOrderItemPricingAmountFen` assume every order item is a fixed SKU item.
- RideHailing evaluation and create both resolve one selected SKU, then call
  `evaluateRideOptions` with `selectedSkuId`.
- `createRideHailingOrderBranch` currently calls provider `createRide` inside
  the create-order transaction and compensates by cancelling the provider ride if
  the local transaction fails after provider creation.
- `ride_hailing_orders.providerInstanceId` is non-null at create time.
- `ride_hailing_orders.providerOrderId` is also provider binding. If provider
  binding lives only in choice-set resolution, both provider instance and
  provider order id must move out of the RideHailing order row contract.
- RideHailing callback, live detail query, and provider fee confirmation
  currently read provider binding from `ride_hailing_orders`; they will need a
  shared resolution-binding reader.
- Current Caocao adapter `createRide` accepts one provider request param set;
  the caller currently sends one `car_type`.
- `buildRideHailingDetailProjection` derives `selectedVehicleName` from
  `order.items[0]`.
- Final RideHailing bill creation after provider final settlement already
  matches the target timing and should be preserved.
- A DB-backed JobRunner exists and is driven by request-tail and internal
  maintenance tick endpoints, but the reviewed target for this slice does not
  move provider dispatch into a persisted async job.

### Frontend Current State

- `OrderingContentOutput.items` directly reuses `CreateOrderInput["items"]`.
- `RideHailingOrderingContent` owns quote loading and currently keeps
  `selectedRideSkuId: number | null`.
- RideHailing summary currently computes a range over all selectable options,
  while total/explanations come from the single selected option.
- Ordering Page price-change preflight currently compares only `totalFen`; the
  choice-set flow must compare displayed candidate range against evaluated
  candidate range.
- `useCreateOrder` treats all successful transport responses as a created order
  and `OrderingFromPlacementPage` always navigates to `/orders/:orderId` after
  mutation success. The cancelled-order result needs an explicit frontend
  branch before navigation.
- `RideHailingSkuCard` is a custom button card, not `PuCard`.
- The current bottom sheet is custom absolute CSS, not `PuFloatPanel`.
- `CommerceOrderDetailPage` displays one RideHailing selected vehicle name.

### Design-Web 0.4.6

- `PuCard` supports `selectable`, `active`, `disabled`, structured regions, and
  click events.
- `PuCard` guidance says interactive cards must not contain nested interactive
  controls.
- `PuCheckbox` is a boolean native-checkbox primitive.
- `usePuSelect<T>` supports controlled or uncontrolled single/multiple
  selection, `selectedValues`, `isSelected`, `isDisabled`, `toggle`, `select`,
  `deselect`, and `clear`.
- `PuFloatPanel` uses numeric pixel-height stops. Stop height is the full panel
  height including the handle. It has no mask, no teleport, and no body scroll
  lock. The handle owns dragging and keyboard movement.

### Scenario Tests

- Current RideHailing scenario asserts single vehicle selection and selected
  vehicle display on Order Detail.
- Current provider-create-failure scenario expects create-order failure to keep
  the user on `/order/new`.
- Current price-change scenario verifies provider order creation is blocked
  until the preflight price-change dialog is confirmed.

These will need rewording after the choice-set model:

- create-order first materializes a choice-set item, then immediately advances
  RideHailing Order lifecycle through provider dispatch
- provider create failure cancels the order and is not retried against another
  candidate
- provider create failure returns the cancelled order id and failure reason to
  the Ordering Page; the page shows a dialog and stays on the Ordering Page
- Order Detail remains on its current legacy surface in this slice, so tests
  should not require new candidate-set / pending-dispatch UI yet

## Proposed Model

### Catalog

Add SKU-level `presentation: ProductPresentation`.

Implementation direction:

- Add `product_skus.presentation jsonb not null` with empty presentation default
  for existing rows.
- Add presentation to backend entity/model/input/update/projection paths.
- Keep SPU presentation. SKU presentation is SKU-specific media/detail, not a
  replacement for SPU listing presentation.
- RideHailing SKU card uses SKU hero image first, then falls back to the current
  icon preview.
- Extend `SkuSelectionPolicy` so RideHailing SPUs can declare a choice-set
  selection contract instead of `EXACTLY_ONE`. The policy should express that
  the user may select multiple acceptable SKUs and fulfillment resolves one.
  Sketch:

```ts
type SkuSelectionPolicy =
  | { type: "EXACTLY_ONE" }
  | { type: "CHOICE_SET"; min: number; max?: number | null; resolvesTo: 1 };
```

- Update admin schemas/UI defaults and scenario fixtures so RideHailing SPUs use
  the new policy deliberately instead of relying on UI behavior that contradicts
  the catalog contract.

### Order Item Snapshot

Introduce a native order item union:

```ts
type FixedOrderItemSnapshot = {
  kind?: "FIXED";
  itemId: string;
  sku: SkuSnapshot;
  quantity: number;
};

type ChoiceSetOrderItemSnapshot = {
  kind: "CHOICE_SET";
  itemId: string;
  productType: "RIDE_HAILING";
  candidates: Array<{
    sku: SkuSnapshot;
    quoteSnapshot: RideHailingQuoteSnapshot;
  }>;
  resolution: null | RideHailingChoiceSetResolutionSnapshot;
  quantity: 1;
};
```

`kind?: "FIXED"` keeps existing stored order JSON compatible because old rows do
not have `kind`.

Choice-set truth belongs in Trade Order snapshots because it is the buyer's
binding authorization. RideHailing fulfillment owns provider execution state and
should update the choice-set resolution through a Trade use case, not mutate
order JSON ad hoc.

Order item services must become union-aware:

- fixed-only helpers should explicitly assert `FIXED`
- choice-set helpers should expose candidates, selected candidate, resolution,
  provider binding, and legacy selected-vehicle display
- generic order totals must not accidentally price unresolved choice sets as if
  they were fixed SKU items

### Command Boundary

Target implementation:

- Promote command `items` to a generic discriminated union.
- Rental emits and submits fixed items.
- RideHailing emits and submits one choice-set item.
- `productTypedExtraProperties.acceptableSkuIds` should not be introduced.
- Backend materializes the persisted `CHOICE_SET` item from command item
  candidates and submit-time authoritative quotes.

Sketch:

```ts
type CreateOrderItemInput =
  | {
      kind?: "FIXED";
      skuId: number;
      quantity?: number | null;
    }
  | {
      kind: "CHOICE_SET";
      productType: "RIDE_HAILING";
      candidateSkuIds: number[];
      quantity?: 1 | null;
    };
```

Reasoning:

- It keeps the public create/evaluate command aligned with persisted Order
  semantics.
- It avoids product-specific candidate ownership leaking through
  `productTypedExtraProperties`.
- It makes future "choose one from a set" products possible without another
  command-shape escape hatch.

Create-order response should also become a discriminated union:

```ts
type CreateOrderResult =
  | {
      outcome: "CREATED";
      orderId: string;
    }
  | {
      outcome: "CANCELLED";
      orderId: string;
      reason: OrderingActionProblem;
    };
```

The cancelled branch is a successful transport response. Frontend behavior
branches on `outcome`, not on HTTP error handling.

### Evaluation And Pricing

- RideHailing quote options remain owned by `RideHailingOrderingContent`.
- Footer price range should be derived from selected acceptable candidates only,
  not all visible options.
- Submit-time evaluation should quote only the choice-set candidate SKU ids and
  return:
  - create-order preflight result
  - candidate-set range
  - candidate quote details
- Price-change preflight should compare displayed candidate range to evaluated
  candidate range. Single `totalFen` comparison is no longer sufficient.
- If no acceptable candidate is selectable or quoteable, create-order is blocked.
- `evaluateRideOptions` needs a candidate filter for submit-time
  evaluation/create. The option-list endpoint can still quote all visible
  options for browsing; submit-time evaluation must quote only the selected
  choice-set candidates.

### Dispatch Lifecycle

Do not move provider `createRide` out of the create-order transaction for this
slice.

Meaning:

- `create-order` remains the command boundary that persists the buyer-side
  binding contract and advances RideHailing Order lifecycle through immediate
  provider dispatch.
- The internal sequence is:
  - persist Trade order with unresolved `CHOICE_SET` item
  - persist the RideHailing order lifecycle row
  - choose the cheapest quoted candidate
  - read provider instance from the chosen SKU facts
  - call provider `createRide`
  - write the choice-set resolution with provider binding
  - update RideHailing lifecycle phase and base order status
- Dispatch is not purely a Fulfillment concern. RideHailing Fulfillment owns
  provider execution semantics, while RideHailing Order lifecycle owns the
  order-state transition. Trade owns the choice-set item as buyer-contract
  evidence.
- Keeping the provider call inside the create-order transaction preserves the
  current synchronous lifecycle shape, but it also keeps the known external
  side-effect-in-transaction tradeoff. Preserve the current compensation pattern
  for provider-created/local-write-failed cases.

Target implementation:

- Create the Trade order, unresolved choice-set item, and RideHailing order in
  one transaction.
- Dispatch immediately inside the same create-order lifecycle.
- The dispatch step:
  - reads the unresolved choice-set item
  - selects the cheapest quoted candidate
  - reads provider instance from the selected SKU facts
  - calls provider `createRide`
  - writes post-dispatch provider binding only into the choice-set resolution
  - updates RideHailing `executionPhase`
  - sets base order status from `INITIATING` to `OPEN` when provider dispatch is
    accepted
- If provider create succeeds but local update fails, preserve the current
  best-effort compensation pattern by cancelling the provider ride.
- If provider create fails, cancel the order and record the RideHailing
  execution failure/cancellation reason.
- The create-order API response for this path should be a successful transport
  response that includes the cancelled order id, cancelled status, and
  user-displayable failure reason or reason code. The frontend treats this as a
  user-visible create-order failure.
- Do not retry against the next cheapest candidate, another vehicle type, or
  another provider.

### Resolution Semantics

Resolution snapshot should record:

- resolved SKU snapshot when the provider result maps to a known SKU
- provider vehicle type code/name when no SKU maps cleanly
- provider order id
- source, such as `DISPATCH_POLICY`, `PROVIDER_ACCEPTED`, or
  `PROVIDER_CALLBACK`
- candidate relation:
  - `IN_CANDIDATES`
  - `PROVIDER_UPGRADE`
  - `PROVIDER_SUBSTITUTION`
- reason/provider snapshot when outside the candidate set

Do not enforce membership in the candidate set.

### Provider Capability Constraint

Current Caocao integration sends one `car_type` to `orderCarV2`.

Therefore, multi-select does not automatically make the provider search multiple
vehicle types. Dispatch implements cheapest-first over selected candidates
locally to pick one candidate for provider `createRide`. If that provider create
fails, the order is cancelled; the command does not retry the next cheapest
candidate or another provider.

### Provider Instance Constraint

Current `ride_hailing_orders.providerInstanceId` is required at create time.

Target implementation:

- Remove the create-time required `ride_hailing_orders.providerInstanceId`.
- Provider instance is read from the selected candidate SKU facts during
  dispatch.
- After dispatch, provider binding is recorded only on the choice-set resolution
  snapshot: provider instance id, provider type, provider order id, and provider
  snapshot as needed.
- `ride_hailing_orders` keeps lifecycle/execution state and ride snapshots, but
  it should not own post-dispatch provider binding.
- `ride_hailing_orders.provider_order_id` should move to the resolution snapshot
  together with provider instance id. Callback/query/payment-confirmation paths
  should read provider binding through a shared Trade/RideHailing helper rather
  than directly from `ride_hailing_orders`.
- `providerOrderId` alone is not enough to query/cancel/confirm later because
  the system still needs to know which provider adapter/instance to use. Those
  follow-up paths must load the order's choice-set resolution to recover the
  provider binding.
- Mixed-provider candidate sets are allowed by the command model, but dispatch
  chooses one concrete SKU/provider according to cheapest-first. Provider
  instance is therefore resolved with the chosen SKU and stored in the
  resolution snapshot.

### Billing

- Preserve current final-bill timing: provider final settlement input commits
  first, then bill is materialized once.
- Bill label/description should use the resolved SKU/provider vehicle when
  available.
- Bill amount continues to use final provider settlement.
- Candidate range remains quote/authorization context, not bill truth.

- If provider substitution outside candidates produces a final settlement above
  the displayed candidate range, Bill still keeps the final settlement as-is.
  The candidate range remains quote/authorization context, not a cap.

### Frontend

- Migrate RideHailing selection state to `usePuSelect<number>({ multiple: true })`.
- Initialize defaults from quote options, probably the cheapest selectable
  candidate.
- Submit a `CHOICE_SET` item containing selected candidate SKU ids.
- If create-order returns a cancelled RideHailing order result, keep the user on
  Ordering Page and show a dialog explaining that ordering failed and why.
- Update price-change preflight comparison to use candidate range for
  RideHailing choice-set output. Keep fixed-order products on the existing total
  comparison.
- Use `PuCard selectable active disabled` for the SKU card root.
- Compose `PuCheckbox` as a visual selection affordance without creating two
  independent option controls. If necessary, render it disabled/read-only inside
  the card and let the card be the single interactive target.
- Use SKU hero image first; fallback to the current car icon preview.
- Replace custom bottom sheet with `PuFloatPanel position="absolute"`.
- Compute panel stops from container/layout height rather than hardcoding
  viewport-wide magic values.
- Keep the control row as a sibling layer at the bottom.
- Adjust route-map fit padding when panel stop changes.
- Do not redesign Order Detail in this slice. Preserve the existing detail page
  implementation and keep providing the legacy selected-vehicle data it expects.

## Implementation Phases

### Phase 0: Durable Truth And Tests Shape

- Update PRD/business vocabulary for "acceptable vehicle set" and "resolved
  ride vehicle".
- Update ecommerce Product TDD for SKU presentation, choice-set order item,
  SKU selection policy, submit-time evaluation range comparison, create-order
  result union, RideHailing dispatch lifecycle, provider-binding ownership, and
  billing.
- Update scenario expectations before broad code changes where practical.

### Phase 1: SKU Presentation Expansion

- Add DB migration for `product_skus.presentation`.
- Update SKU model/entity/repository-adjacent inputs.
- Extend `SkuSelectionPolicy` to support `CHOICE_SET` and update admin SPU
  validation/defaults for RideHailing.
- Update admin SKU create/update schema and UI workspace projections.
- Update ordering offer detail projection.
- Update RideHailing fixture/test builders with SKU presentation.
- Verification:
  - backend typecheck
  - frontend typecheck if admin/frontend projection is touched
  - merchandising/catalog unit tests as needed

### Phase 2: Native Choice-Set Order Model

- Add `OrderItemSnapshot` union and helpers for fixed vs choice-set items.
- Keep legacy fixed items compatible.
- Add Trade repository method for resolving a choice-set item and storing
  provider binding inside the resolution snapshot.
- Add shared helpers to read the resolved RideHailing provider binding from the
  order item resolution.
- Add create/evaluate command item union schemas.
- Add create-order result union with `CREATED` and `CANCELLED`.
- Migrate frontend `OrderingContentOutput.items` away from the old fixed-only
  command item shape.
- Preserve Order Detail compatibility by projecting the legacy selected vehicle
  from the resolved choice-set where needed.
- Verification:
  - backend unit tests for item helpers and resolution mutation
  - backend typecheck

### Phase 3: RideHailing Evaluation/Create Contract

- Make RideHailing submit one `CHOICE_SET` command item.
- Quote only choice-set candidates during submit-time evaluation/create.
- Create unresolved choice-set item first.
- Create the RideHailing order lifecycle row.
- Dispatch synchronously inside create-order after the unresolved choice-set
  exists.
- Remove provider binding columns from the RideHailing order foundation path:
  create-time provider instance and post-dispatch provider order id move to the
  choice-set resolution.
- Verification:
  - backend unit/scenario tests for command validation, price range,
    cheapest-first candidate selection basis, provider-binding-in-resolution,
    cancellation on provider create failure, and cancelled create-order response

### Phase 4: RideHailing Dispatch And Resolution

- Add a RideHailing dispatch lifecycle helper/use case invoked by create-order.
- Implement cheapest-first candidate dispatch policy with no fallback retry.
- Call provider, write provider binding into the choice-set resolution, update
  execution phase, and preserve compensation on partial failure.
- Cancel the order when provider create fails.
- Update Caocao callback handling to refine resolution if callback/query reveals
  a different provider vehicle type.
- Preserve final bill creation timing.
- Verification:
  - dispatch unit tests
  - callback/final bill tests
  - fake Caocao scenario path

### Phase 5: Ordering UI And Float Panel

- Migrate vehicle list to `usePuSelect` multiple.
- Migrate card to `PuCard` plus `PuCheckbox` composition.
- Use SKU hero image fallback chain.
- Output selected candidate ids and candidate range.
- Replace custom sheet with `PuFloatPanel`.
- Verification:
  - frontend typecheck
  - focused browser check for panel stops, card selection, price range, and map
    fit padding

### Phase 6: End-To-End Scenario Update

- Update RideHailing ordering scenario to cover:
  - multi-select candidate set
  - selected candidate price range
  - submit-time range price-change confirmation
  - create-order creates an unresolved choice-set first and resolves it during
    immediate RideHailing dispatch
  - provider create failure returns a cancelled order id but Ordering Page shows
    a failure dialog and does not navigate to Order Detail
  - existing Order Detail still shows the resolved/legacy selected vehicle
  - final settlement creates bill
  - provider dispatch failure cancels the order
- Verification:
  - focused RideHailing system scenario
  - backend/frontend typecheck
  - lint slices for changed files

## Resolved Review Decisions

- Do not keep `ride_hailing_orders.providerInstanceId` as a required create-time
  field.
- Do not keep post-dispatch provider binding, including provider order id, on
  `ride_hailing_orders`; provider binding lives in choice-set resolution.
- Do not introduce `productTypedExtraProperties.acceptableSkuIds`.
- Promote command `items` to a generic discriminated union.
- Extend the catalog SKU selection policy for RideHailing choice sets instead of
  leaving RideHailing SPUs as `EXACTLY_ONE`.
- Dispatch remains inside the create-order transaction as part of RideHailing
  Order lifecycle for this slice.
- First dispatch policy is cheapest-first.
- Provider dispatch failure cancels the order.
- Provider create failure is not retried against the next cheapest candidate or
  another provider.
- Provider create failure returns a cancelled order id to the frontend, and the
  Ordering Page shows a failure dialog instead of navigating to Order Detail.
- Provider substitution outside candidates bills final settlement as-is.
- Order Detail is out of scope for this slice; keep the current implementation
  and preserve its compatibility projection.

## Remaining Implementation Detail

- Exact create-order response field names are still implementation details, but
  the payload must let the frontend distinguish a normal created order from a
  cancelled RideHailing order and show the cancellation reason without a detail
  page navigation.

## Implementation Progress

Segment 1 is implemented and uncommitted:

- Durable ecommerce contract updated.
- SKU presentation schema/model/admin/order-detail projection foundation added.
- `SkuSelectionPolicy` now supports `CHOICE_SET`.
- `OrderItemSnapshot` and create/evaluate command items now support fixed and
  RideHailing choice-set variants.
- RideHailing create-order now creates an unresolved choice-set item, dispatches
  cheapest-first inside the create-order lifecycle, writes provider binding into
  choice-set resolution, and returns `CANCELLED` on provider create failure
  without retrying other candidates.
- `ride_hailing_orders` no longer owns provider binding columns.
- Callback, live detail, fee confirmation, and legacy Order Detail compatibility
  read through choice-set resolution / candidates.
- RideHailing Ordering Content initially emitted a one-candidate `CHOICE_SET`
  bridge while the UI remained single-select.
- Price-change preflight compares candidate ranges.

Segment 2 is implemented and uncommitted:

- RideHailing vehicle cards migrated to `PuCard selectable` + visual
  `PuCheckbox`.
- Selection state migrated to `usePuSelect` multiple.
- Ordering UI exposes and submits actual multi-select candidate sets.
- Candidate-set range is derived from selected candidates only.
- SKU hero/detail image is used when it is a directly displayable URL, with the
  current car icon preview as fallback.
- Custom bottom sheet replaced with `PuFloatPanel`.
- Float panel has minimized, normal, and expanded stops computed from the
  content container height.
- Route-map fit padding follows the active panel stop.
- System scenario verifies multi-candidate range and cheapest-first resolution.

Segment 3 is implemented and uncommitted after human review:

- Corrected `RideHailingSkuCard` from the Segment 2 list-item-like layout to
  the reviewed card layout.
- Implemented card layout:
  `flex-row(meta-flex-col(flex-row(name, info-icon-btn), preview), price-flex-col(estimated-text, flex-col(amount, checkbox)))`.
- Price column, amount, and checkbox are right-aligned (`items-end`).
- Checkbox sits below the price amount.
- Removed the card-internal `status/reason` display concept; unavailable vehicle
  options remain hidden at the list layer.
- Treated the text concept as SKU name only; do not introduce a separate
  `vehicle summary` product concept.
- Preserved `PuCard selectable`, visual-only `PuCheckbox`, single card
  interaction target, multi-select model, preview fallback, and semantic test
  ids.
- Verification passed:
  - `pnpm exec biome format --write apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue`
  - `pnpm exec biome lint apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue`
  - `pnpm check:type:frontend`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `git diff --check`

## Final Plan Review Notes

- Plan direction is coherent after the latest corrections. No model-level
  blocker remains before an Impact Handshake.
- Implementation should not begin as a pure UI primitive migration. The
  required first production changes are durable contract/schema/model changes:
  SKU presentation, SKU selection policy, choice-set item union, and create-order
  result union.
- Biggest backend blast-radius surfaces:
  - `apps/backend/src/controllers/commerce.controller.ts` command schemas and
    inferred route response types
  - `apps/backend/src/domains/trade/model/order.ts`
  - `apps/backend/src/domains/trade/use-cases/create-order.ts`
  - `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`
  - `apps/backend/src/domains/trade/services/order-items.ts`
  - `apps/backend/src/domains/trade/services/order-persistence.ts`
  - `apps/backend/src/domains/ride-hailing/use-cases/handle-caocao-order-status-callback.ts`
  - `apps/backend/src/entities/product-sku.ts`
  - `apps/backend/src/entities/ride-hailing-order.ts`
  - `apps/backend/drizzle/`
- Biggest frontend blast-radius surfaces:
  - `apps/frontend/src/domains/commerce/model/ordering-content.ts`
  - `apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue`
  - `apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue`
  - `apps/frontend/src/pages/OrderingFromPlacementPage.vue`
  - `apps/frontend/src/domains/admin-commerce/**`
  - `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
- Verification should include at minimum:
  - backend unit coverage for order item helpers, choice-set resolution, and
    provider binding reader
  - backend tests for provider-create failure producing a cancelled order result
  - frontend typecheck for Hono RPC response/input inference
  - focused RideHailing system scenario updated for multi-select, range
    preflight, cancelled create result dialog, legacy Order Detail projection,
    and final billing

## Suggested Next Step

All planned implementation segments for this choice-set SKU / float-panel slice
are complete locally. Next step is human review and commit packaging if the
result is accepted.
