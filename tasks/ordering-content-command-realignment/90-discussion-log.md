# Discussion Log

## 2026-06-01

User opened a new design correction after reviewing current RideHailing and
Rental Ordering Content topology.

User corrections captured:

- Ordering Content, regardless of `productType`, should have a fixed interface:
  input `bindings`, `offerId`; output `items`,
  `productTypedExtraProperties`.
- Ordering Content must decouple from PR and Placement.
- Participants come from `bindings`, not from directly parsing PR.
- `getRentalOrderingFromPlacement` and `getRideHailingOrderingFromPlacement`
  are structurally wrong.
- There should not be a unified backend Rental/RideHailing Ordering read API.
  Rental/RideHailing Ordering Content should independently compose data fetches
  such as Offer detail, SPU/SKU, and PricingApplication needs.
- Ordering Content does not own evaluation. Ordering owns evaluation.
- `CreateOrder(prId?, offerId, items, participants,
  productTypedProperties)` should orchestrate base `trade_orders`,
  product-typed order records, and optional PR attachment.
- Product-typed order creation should not coordinate upward into generic order
  creation.
- Ordering Content does not emit or submit `CreateOrderCommand`; the
  OrderingPage BottomActionBar owns command construction/submission.
- `evaluateRideHailingOrdering` and `evaluateRentalOrdering` are the wrong
  public shape. Target should be `evaluateOrdering(...createOrderCommand)`,
  returning price detail and submit availability for the BottomActionBar.

Packet created to continue discussion without starting implementation.

User added a design constraint:

- OrderingEvaluation's create-availability judgment and explanation should
  reuse the existing action preflight design.

Target contract updated:

- replace bespoke `canCreate` / `disabledReason` with
  `actions.create_order.allowed`;
- use preflight-style `problem.type`, `problem.code`, `problem.title`,
  `problem.detail`, and `nextRelevantAt`;
- keep evaluation advisory while CreateOrder remains authoritative and reuses
  the same decision/problem codes on write rejection.

User corrected participant ownership:

- `participants` are actually Ordering Content output, not something
  OrderingPage derives directly from `bindings`.

Target contract updated:

- `OrderingContentOutput` now includes `participants`;
- topology now routes `participants` through Content output into the
  CreateOrder command;
- `bindings` can initialize participant state, but Content owns the emitted
  participant selection.

User corrected the CreateOrder topology:

- The previous target diagram made CreateOrder's downstream behavior look like
  parallel sibling nodes.
- Rental Order and RideHailing Order should manage order/fulfillment behavior
  that belongs to product-typed order authority.
- Example Rental sequence: create Rental order -> initialize Rental order ->
  create prepaid Bill.
- Example RideHailing sequence: create RideHailing order -> initiate ride
  provider boundary.

Target contract updated:

- CreateOrder is now described as the generic command boundary, common context
  resolver, authoritative preflight user, and family dispatcher.
- `RentalOrder.create` owns the sequential Rental creation flow.
- `RideHailingOrder.create` owns the sequential RideHailing creation and
  provider-initiation flow.
- PR attachment remains PR Core authority, invoked as a step/capability in the
  selected family sequence rather than drawn as an unrelated parallel node.

User corrected the CreateOrder ownership again:

- "init base trade_orders" is the wrong language.
- PR attachment authority is base Trade Order behavior, not product-typed order
  behavior.
- CreateOrder does not need an authoritative preflight step; atomicity comes
  from the create-order transaction.
- `RentalOrder.create` / `RentalOrder.init` and
  `RideHailingOrder.create` / `RideHailingOrder.init` are sibling steps
  orchestrated by Trade Order Base.
- The whole create-order operation is transactional.

Target contract updated:

- Trade Order Base now owns the create-order transaction boundary, base
  `trade_orders` creation, PR attachment behavior, and product-type dispatch.
- Product-typed `create` and `init` steps no longer own base order creation or
  PR attachment.
- Removed "authoritative preflight" wording from CreateOrder.

User corrected product-typed step order and requested a product-design check:

- product-typed `create` and `init` should be serial, not parallel;
- target contract should be checked against issue-231 product design, excluding
  technical design.

Updates:

- target topology changed so Rental/RideHailing `create -> init` is serial in
  each family branch;
- added `25-target-contract-product-check.md`.

Check summary:

- target matches route spine, non-persisted Ordering, PR outside Content, CTA
  ownership, RideHailing Content boundary, and atomic PR attachment direction;
- target conflicts with older issue-231 product wording requiring backend to
  complete a full Ordering read model before frontend enters Ordering Detail;
- target also creates a tension with the older statement that Ordering should be
  decoupled from Offer at frontend/API contract level, because target Content
  input includes `offerId`;
- participants as Content output are acceptable only if treated as command
  intent and validated against bindings/PR authority where applicable.

User corrected the Offer/Ordering and participant authority boundary:

- `offerId` should only be a commercial source reference.
- Ordering entry should be an expanded Offer Detail projection, including
  SPU ids, SKU ids, pricing policy, etc., plus `bindings`, optional `prId`, and
  `offerId` as source reference.
- This correction must flow into CreateOrderCommand and Ordering Content input.
- Content self-composition remains correct, but more exactly: Content displays
  and modifies order items, product-typed extra properties, and participants.
- Frontend participants are authoritative at the Ordering boundary.
- PR participants and order participants must be distinguished. PR participants
  are only one possible source of order participants.

Target contract updated:

- introduced expanded ordering entry payload and `OrderingOfferDetail`;
- changed Content input to `{ source.offerId, offerDetail, bindings }`;
- changed CreateOrderCommand to carry `source.offerId`;
- clarified Content output participants are order participants;
- updated product check to remove the previous claim that Content participants
  are merely command intent rather than authority.

User corrected the entry naming and assembly boundary:

- `OrderingPageEntry` is not a separate concept; it is
  `OrderingEntryPayload`.
- Placement should call the Offer domain service to fetch Offer Detail, then
  assemble `OrderingEntryPayload` with Offer Detail, bindings, optional `prId`,
  and `source.offerId`.

Target contract updated:

- renamed `OrderingPageEntry` back to `OrderingEntryPayload`;
- added Placement entry resolver and Offer domain service call to topology;
- updated impact/open-question/product-check wording.

User accepted the current direction as having no major issue and requested a
written modification plan.

Added:

- `60-modification-plan.md`, covering contract freeze, Placement-built
  `OrderingEntryPayload`, frontend Content extraction, generic evaluation,
  generic CreateOrder, product-typed `create -> init`, removal of
  `from-placement` read paths, verification, and documentation follow-up.

User asked for one final check against the actual project state to confirm the
baseline.

Added:

- `18-current-baseline-confirmation.md`.

Baseline highlights:

- current frontend `OrderingEntryPayload` is still minimal
  `{ offerId, prId?, bindings }`;
- PR Page still resolves bindings and stores the payload directly;
- `/order/new` still calls `GET /api/commerce/ordering/from-placement`;
- public evaluation/create APIs are still product-specific;
- current command schemas already include frontend `participants` and
  `extraProperties`;
- backend read/evaluate/create still re-enters PR;
- product-specific create commands still call `attachOrderToPr`;
- typed order tables now own more family execution facts, with current
  migrations moving fulfillment facts into `rental_orders` and
  `ride_hailing_orders`.

User confirmed the worktree was organized and approved implementation.

Implemented first execution slice:

- Added an Offer-domain Ordering Offer Detail projection and exposed it through
  Placement ordering-entry resolution.
- Changed PR Page placement click to store the Placement-built
  `OrderingEntryPayload` instead of locally assembling minimal
  `{ offerId, prId, bindings }`.
- Changed `/order/new` to consume the expanded entry directly and removed its
  dependency on backend `ordering/from-placement` read models.
- Changed the page-level command to use generic `source.offerId`,
  `participants`, `items`, and `productTypedExtraProperties`.
- Added generic backend `evaluateOrdering(command)` with
  `actions.create_order` preflight-shaped availability plus price output.
- Added generic backend `createOrderCommand` and `POST /api/commerce/orders`.
- Moved the new create path so base `trade_orders` creation and optional PR
  attachment happen in the Trade order base flow before Rental/RideHailing typed
  branch steps.

Verification completed:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm lint:backend`
- `pnpm test:unit:backend`

Sub-agent review completed and found:

- RideHailing generic create initially committed local order state before
  provider initiation; fixed by moving provider initiation and status updates
  inside the generic create transaction so provider failure rolls back local
  base order, typed order, and PR attachment.
- Placement ordering-entry initially trusted `matchingContext.prId` and exposed
  active PR participants without checking the current viewer; fixed by requiring
  the authenticated viewer to be an active participant before returning
  PR-derived order participant defaults.
- Frontend `/order/new` still has page-local Rental/RideHailing content state
  and output assembly rather than extracted concrete Content components. This
  remains a known implementation gap against Slice 2's strongest component
  boundary wording.
- Legacy public family-specific Ordering APIs still exist. They are no longer
  used by the primary frontend route, but have not yet been removed or reduced
  to explicit compatibility wrappers.

Known compatibility residue:

- old `ordering/from-placement`, family-specific evaluate routes, and
  family-specific create routes still exist as compatibility surfaces;
- old product-specific ordering-flow use cases still contain PR-derived read
  and command logic, but frontend primary Ordering no longer calls them.

## 2026-06-01 Implementation Completion

The cleanup slice was completed:

- Extracted concrete `RentalOrderingContent` and `RideHailingOrderingContent`
  components.
- Reduced `OrderingFromPlacementPage` to entry reading, content selection,
  generic command construction, evaluation, BottomActionBar display, and create
  submission.
- Removed legacy public ordering read/evaluate/create routes and frontend hooks.
- Removed legacy product-specific ordering read/evaluate/create use cases from
  Rental and RideHailing ordering-flow files, while preserving live order
  detail, cancellation, fulfillment, quote, and provider-fee behavior.
- Updated durable ecommerce contract docs to describe
  `OrderingEntryPayload`, Offer-owned `OrderingOfferDetail`, Content output,
  generic evaluation, and Trade Order Base create orchestration.

Verification after cleanup:

- backend typecheck passed;
- frontend build passed;
- backend lint passed;
- backend unit tests passed;
- `git diff --check` passed;
- legacy ordering API/use-case name search returned no hits under
  `apps/backend/src` and `apps/frontend/src`.

## 2026-06-01 Final Review Follow-Up

The final sub-agent review found four remaining issues:

- legacy family create helper use cases were still exported and still created
  base `trade_orders`;
- RideHailing provider create could leave an external provider-side order if
  provider creation succeeded but local persistence failed afterward;
- RideHailing evaluation could still return a transport/server error when
  provider quote failed;
- durable ecommerce docs still said provider order id was not persisted.

Applied fixes:

- removed `create-rental-order.ts` and
  `create-ride-hailing-order-foundation.ts` and their barrel exports;
- added best-effort `cancelRide` compensation when provider create has
  succeeded but local create-order persistence fails;
- converted provider quote failures into non-selectable quote options so
  generic evaluation returns an action-preflight denial;
- updated ecommerce docs to state that provider-side order id returned by
  create is stored on `ride_hailing_orders`.
