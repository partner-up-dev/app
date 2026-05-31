# P1 Fix Plans

## P1-1: Pricing Application Service Is Not Executed

Status: implemented for the Rental fixed-total path.

### Goal

Make displayed preview price and frozen Order price follow the same Trade-owned
pipeline:

`SKU base -> SPU pricing policy -> Offer pricing policy -> PriceExplanation[]`.

The original issue-231 packet already defines this as a Trade / Order pricing
application service. The exact durable name used in the packet is
`DraftOrderPricingService`; if later code prefers a shorter local name such as
`PricingApplication`, it should be treated as the same service boundary rather
than a new owner.

### Address And Object

- `apps/backend/src/domains/trade/services/`
- `apps/backend/src/domains/trade/use-cases/rental-ordering-flow.ts`
- `apps/backend/src/domains/merchandising/model/pricing.ts`
- `apps/backend/src/domains/merchandising/services/catalog-contract.ts`
- tests under `apps/backend/src/domains/trade/services/`

### State Diff

From:

- Rental pricing reads `sku.pricingModel.amountFen` directly.

To:

- A Trade-owned pricing service accepts Offer, SPU, SKU, and current ordering
  input, executes pricing phases in order, and returns a single pricing result
  used by both evaluate and create.

### Implementation Steps

1. Add `PricingApplication` in Trade. Done.
2. Support MVP `FIXED_TOTAL` SKU base first. Done.
3. Apply SPU pricing rules only when target level is `SKU`. Done.
4. Apply Offer pricing rules for `SKU`, `SPU`, and `ORDER` targets. Done.
5. Use `json-logic-js` for pricing rule conditions behind a Trade-owned helper.
   Done.
6. Emit ordered `PriceExplanation[]` for each applied phase. Done.
7. Replace Rental evaluate/create direct amount reads with the service result.
   Done.
8. Add tests for fixed total, SPU discount, Offer discount, rule `continue`,
   and non-matching rules.
   Done.

### Invariants

- Frontend never submits authoritative pricing.
- Order creation re-reads Product/Offer/SKU truth.
- All money stays integer fen.
- Dynamic Quote execution can be added after fixed-total pipeline lands; do not
  silently accept dynamic quote where a resolved amount is required.

### Verification

- Backend unit tests for pricing service.
- Rental scenario still verifies visible price switch and Order snapshot.
- Add one scenario or backend test proving Offer pricing changes preview and
  frozen total.

## P1-2: Placement Binding Rules Are Missing

Status: implemented for current PR Rental locked fields and Admin visual
editing.

### Goal

Move PR-context locked field authority from Rental hard-code into Placement
metadata and backend resolution.

Placement Admin must also expose visual binding-rule editing. Operators should
not have to paste the whole `bindingRules` array as raw JSON for the common
MVP fields.

### Address And Object

- `apps/backend/src/entities/placement.ts`
- new migration under `apps/backend/drizzle/`
- `apps/backend/src/domains/merchandising/model/placement.ts`
- `apps/backend/src/domains/merchandising/use-cases/create-placement.ts`
- `apps/backend/src/domains/admin-commerce-management/use-cases/update-admin-commerce-placement.ts`
- `apps/backend/src/domains/trade/use-cases/rental-ordering-flow.ts`
- `apps/frontend/src/pages/AdminCommercePlacementOfferPage.vue`
- `apps/frontend/src/domains/admin-commerce/queries/useAdminCommerce.ts`

### State Diff

From:

- Placement has matching and creative only.
- Rental Ordering hard-codes locked PR values.

To:

- Placement stores binding rules.
- Ordering read derives locked values by applying those rules to PR context.

### Implementation Steps

1. Add `bindingRules jsonb not null default []` to `placements`.
   Done as `binding_rules` with the current PR Rental default binding set.
2. Type `PlacementBindingRule = { fieldKey: string; contextPath: string; lock:
   true }`.
   Done with current supported field/path unions.
3. Define Rental bindable field keys for current Ordering:
   `participantCount`, `serviceStartAt`, `serviceEndAt`.
   Done.
4. Add validator that rejects unknown field keys and unsupported context paths.
   Done through controller schema and domain validator.
5. Add resolver that applies binding rules to `PlacementPrContextData`.
   Done.
6. Update Rental Ordering read/evaluate/create to consume resolved bound values
   instead of locally hard-coding all locked fields.
   Done.
7. Add Placement Admin visual editing for binding rules:
   - add/remove binding rows;
   - choose supported `fieldKey` from a select;
   - choose supported PR context source from a select;
   - keep `lock: true` fixed and visible;
   - submit typed `bindingRules` with placement create/update.
   Done.
8. Preserve default behavior for existing placements by backfilling equivalent
   Rental PR bindings in migration or compatibility code.
   Done through migration default and create-form defaults.
9. Add tests for unknown field rejection, locked value derivation, and create
   revalidation.
   Partially done: unit coverage exists for binding validation/resolution; the
   existing Rental system scenario covers create/evaluate compatibility.

### Invariants

- Bound values are display hints and must be re-derived on evaluate/create.
- Placement does not own full Ordering schema or page layout.
- PR access remains PR/Placement-read authority, not rule-engine logic.

### Verification

- Merchandising unit tests for binding validation/resolution.
- Rental Ordering tests proving PR time/headcount locks come from binding.
- Existing Rental browser scenarios remain green.

## P1-3: Unpaid Cancellation Creates Refund Lines

Status: implemented.

### Goal

Make Bill reconciliation refund only settled customer-paid basis.

### Address And Object

- `apps/backend/src/domains/trade/use-cases/finalize-rental-order-termination.ts`
- `apps/backend/src/domains/bill/use-cases/reconcile-bill-to-target-amount.ts`
- `apps/backend/src/domains/bill/model/bill.ts`
- `apps/backend/src/domains/payment/services/bill-payment-state.ts`
- `tests/scenario/commerce/rental-ordering.scenario.test.ts`
- backend unit tests for Bill reconciliation / Rental cancellation pricing

### State Diff

From:

- Cancellation target total creates adjustment lines without conditioning refund
  on successful payment.

To:

- Cancellation derives `BillLineSettlementProjection` first. If paid charge is
  zero, no refund line is created.

### Implementation Steps

1. Load BillLines and successful charge PaymentTxs during termination
   finalization.
   Done in Trade orchestration, before Bill reconciliation is called.
2. Derive paid charge total per participant or per charge line, using existing
   BillLine-scoped PaymentTx authority.
   Done by reusing `deriveBillPaymentState` as the source for
   `BillLineSettlementProjection`.
3. Pass paid basis into Bill reconciliation.
   Done through `lineSettlements`.
4. Update reconciliation rule:
   - unpaid order: mark target state without refund lines;
   - partially paid order: refund only paid amount above target;
   - fully paid order: existing refund behavior bounded by paid amount.
   Done for REFUND allocations; this change intentionally does not add a new
   waived/voided charge BillLine kind.
5. Update unpaid cancellation scenario expectation from extra refund lines to
   no refund lines.
   Done.
6. Add backend unit tests for unpaid, partial paid, and fully paid cancellation.
   Done at Bill reconciliation level.

### Invariants

- Bill owns obligation lines.
- Payment owns successful money movement.
- Refund PaymentTx can only target a refund BillLine backed by paid charge.

### Verification

- Bill reconciliation unit tests.
- Payment state unit tests if paid-basis helper is added.
- Rental unpaid cancellation scenario updated and passing.
- Paid cancellation refund scenario still passing.

## P1-4: Rental Cancellation Is Not Fulfillment-Gated

### Goal

Respect Fulfillment authority when cancellation requires supplier/operator
handling.

### Address And Object

- `apps/backend/src/domains/trade/use-cases/request-rental-order-termination.ts`
- `apps/backend/src/domains/trade/use-cases/finalize-rental-order-termination.ts`
- `apps/backend/src/domains/trade/use-cases/rental-ordering-flow.ts`
- `apps/backend/src/domains/fulfillment/use-cases/*`
- Admin/operator Fulfillment page and API if manual decision is exposed
- scenario tests for cancellation states

### State Diff

From:

- User cancel immediately finalizes with approved decision.

To:

- Trade admits cancellation request.
- If policy/live fulfillment requires handling, Order remains pending until
  Fulfillment returns approve/deny.
- Only approved fulfillment decision lets Trade finalize cancellation and Bill
  consequences.

### Implementation Steps

1. Add cancellation decision classifier using frozen cancellation policy,
   current time, and current Rental Fulfillment state.
2. For no-handling paths, keep immediate approval.
3. For handling-required paths, create pending termination attempt and expose
   operator action on Rental Fulfillment Ops.
4. Add Fulfillment use case returning normalized
   `FulfillmentTerminationDecision`.
5. Wire operator approve/deny into Trade finalization.
6. Reflect pending/denied/approved state in Order Detail projection.
7. Add tests for immediate local cancel, pending operator cancel, denied cancel,
   and approved operator cancel.

### Invariants

- Order owns termination attempt and final contract state.
- Fulfillment owns service-side reversibility truth.
- Bill materializes only after Trade translates approved decision to target
  amount.

### Verification

- Trade termination unit tests.
- Fulfillment decision unit tests.
- Browser scenario for pending cancellation if UI scope includes it.

## P1-5: Payment Settlement Can Start Fulfillment After Cancellation

### Goal

Prevent late payment convergence from starting forward fulfillment for terminal
or cancelling orders.

### Address And Object

- `apps/backend/src/domains/trade/use-cases/apply-bill-settlement-to-order.ts`
- `apps/backend/src/domains/payment/use-cases/payment-settlement-consequence.ts`
- tests under Trade/Payment services

### State Diff

From:

- Settlement consequence checks paid state and family, but not Order contract
  state.

To:

- Settlement consequence starts Rental Fulfillment only for eligible open
  orders.

### Implementation Steps

1. Gate `applyBillSettlementToOrder` by `order.status === "OPEN"`.
2. If a pending/cancelled/terminal order receives late payment convergence,
   return an explicit no-op result.
3. Ensure no Rental Fulfillment is created for cancelled orders.
4. Add tests for:
   - paid open order starts fulfillment;
   - paid cancelled order no-ops;
   - duplicate paid sync remains idempotent.
5. Review whether pending termination should block fulfillment before
   `CANCEL_REQUESTED` is introduced.

### Invariants

- Payment success remains authoritative money movement.
- Payment success does not override contract termination.
- Fulfillment starts only from a valid forward-performance contract.

### Verification

- Unit test for `applyBillSettlementToOrder`.
- Existing paid Rental fulfillment scenario remains passing.
- Add late-payment-after-cancel regression test if feasible in backend scenario.
