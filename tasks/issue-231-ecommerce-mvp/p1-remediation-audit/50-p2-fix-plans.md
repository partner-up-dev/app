# P2 Fix Plans

## Status

P2-1, P2-3, and P2-5 have been implemented after user approval. Remaining P2
items stay plan-only.

## P2-1: Rental Service Policy Window Is Not Enforced

### Problem

Product design defines Rental service policy with service window and booking
lead time, but current runtime mostly relies on SKU facts and PR-bound service
time. `RentalServicePolicy` does not fully express or enforce the allowed
service window.

### Fix Plan

1. Extend Rental `SpuServicePolicy` with service window fields matching the
   packet: allowed weekdays, daily start/end, lead-time minutes.
2. Update Product Admin validation/editing to persist these fields.
3. Revalidate Ordering read/evaluate/create against service policy after
   Placement binding derives PR service time.
4. Return disabled reasons in Ordering when service time is outside product
   policy.
5. Add unit tests for valid window, outside daily window, invalid weekday, and
   lead-time violation.
6. Add one scenario proving an invalid PR service time disables Rental ordering.

### Verification

- Backend merchandising/trade service policy unit tests.
- Frontend typecheck for Product Admin schema changes.
- Rental ordering system scenario for disabled ordering.

## P2-2: Placement Target Kind Is Inconsistent Across Storage And Projection

### Problem

Placement persistence accepts target kinds such as `OFFER | ORDER`, while public
projection is designed to return `ORDERING | ORDER`. This creates vocabulary
drift: stored Placement targets point to durable owner objects, while rendered
targets describe user navigation outcomes.

### Fix Plan

1. Keep stored Placement targets owner-oriented, e.g. `{ kind: "OFFER",
   offerId }`.
2. Introduce an explicit projection mapping:
   `PlacementTarget -> PlacementResolvedTarget`.
3. Ensure public commerce APIs only return `ORDERING | ORDER`.
4. Rename internal helpers/types where needed so persisted target and rendered
   target are not confused.
5. Add tests proving:
   - stored `OFFER` target resolves to `ORDERING` when no active order exists;
   - stored `OFFER` target resolves to `ORDER` when a non-terminal PR-attached
     order exists.

### Verification

- Placement target resolution unit tests.
- Existing PR placement scenario remains passing.

## P2-3: Placement Active Window Is Missing

### Problem

Offer has effective windows, but Placement itself has no active window. The
packet treats Placement as campaign/slot configuration, which should support
time-bounded rollout independent of Offer.

### Fix Plan

1. Add nullable `effectiveFrom` / `effectiveTo` fields to Placement Instance.
2. Add migration and model/controller schema.
3. Update Placement candidate query/resolution to exclude not-yet-active or
   expired placements.
4. Add Placement Admin inputs for active window.
5. Preserve existing behavior with null windows meaning always active.
6. Add tests for null window, future window, expired window, and active window.

### Verification

- Backend placement selection tests.
- Admin typecheck.
- Existing commerce placement scenario remains passing.

## P2-4: Ordering Entry Missing PR Active Participant Access Gate

### Problem

Placement read gates PR-context visibility by active PR participant. The direct
Ordering endpoint from placement currently does not consistently apply the same
gate, so a user with route parameters may reach Ordering read/evaluate outside
the intended PR audience.

### Fix Plan

1. Extract a shared PR-context commerce access guard owned by PR/Commerce
   boundary, not the JSONLogic matching rule.
2. Apply it to:
   - placement read;
   - ordering read from placement;
   - ordering evaluate/create from placement.
3. Return 403/404 consistently according to existing commerce API convention.
4. Add regression tests for non-participant access to ordering read/evaluate.
5. Ensure active participants can still access PR-attached orders.

### Verification

- Backend route/use-case tests for unauthorized ordering access.
- Existing Rental ordering scenario remains passing.

## P2-5: PR Attachment Uniqueness Should Track Non-Terminal Order, Not Attachment

### Problem

Current PR attachment uniqueness is based on non-detached attachment state. The
packet requires at most one non-terminal Order per `(prId, offerId)` to avoid
Placement target ambiguity. Attachment state and Order terminal state are not
the same authority.

### Fix Plan

1. Locate current PR attach uniqueness check and the target-resolution query
   that decides `ORDER` vs `ORDERING`.
2. Change the uniqueness rule to consider attached Order contract state:
   `OPEN` blocks a new order; terminal states such as `CANCELLED`, `FAILED`,
   `EXPIRED`, `COMPLETED` do not.
3. Keep PR attachment rows as relationship history; do not require detaching a
   terminal order just to create a new one.
4. Update Placement target resolution to select the current non-terminal order,
   not merely any non-detached attachment.
5. Add tests:
   - second order blocked while first order is `OPEN`;
   - new order allowed after first order is `CANCELLED`;
   - placement target returns `ORDERING` after terminal order.

### Verification

- Backend PR attachment/order resolution tests.
- Rental cancel then reorder scenario if UI supports it.

## P2-6: RideHailing Chain Is Not Yet Comparable To Rental

### Problem

Issue 231 originally audits Product, Placement, Offer, and Order as reusable
commerce owners. Rental now exercises the full MVP chain; RideHailing still
needs a comparable Product -> Placement -> Offer -> Ordering -> Order ->
Fulfillment chain to validate the owner model beyond Rental.

### Fix Plan

1. Treat this as the active phase5 RideHailing packet owner, not as a small
   patch inside Rental P1 cleanup.
2. Reuse the P1 repairs:
   - PricingApplication for quote/fare resolution;
   - Placement binding rules for PR route/time/headcount context;
   - termination/payment/fulfillment gates for provider cancellation.
3. Implement the smallest end-to-end RideHailing path through current durable
   boundaries before adding provider-specific polish.
4. Keep provider adapter details behind Fulfillment/Provider services.
5. Add system scenario proving RideHailing can create an order and reach
   provider-backed fulfillment without bypassing the shared owners.

### Verification

- Phase5 RideHailing backend/provider tests.
- System scenario for RideHailing ordering and fulfillment.
- Cross-check no Rental-specific assumptions leak into shared Trade services.
