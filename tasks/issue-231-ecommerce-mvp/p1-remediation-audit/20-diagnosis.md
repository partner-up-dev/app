# Diagnosis

## Accepted P1 Findings

### P1-1: Pricing Pipeline Is Not Executed

Design expectation:

- Trade/Order pricing should execute an explicit pipeline:
  `SKU base pricing -> SPU pricing policy -> Offer pricing policy`.
- Price explanations should capture SKU base, SPU policy, and Offer overlay
  effects.

Observed reality:

- Rental ordering resolves price from `sku.pricingModel.amountFen`.
- The persisted SPU and Offer pricing rules are not applied at runtime.
- Dynamic Quote DSL is typed but not validated or executed in current ordering.

Impact:

- Admin can configure pricing rules that do not affect customer price.
- Order snapshots may freeze a price that contradicts configured commercial
  truth.

### P1-2: Placement Binding Rules Are Missing

Design expectation:

- Placement owns context-to-ordering binding rules:
  `{ fieldKey, contextPath, lock: true }`.
- Placement validates field keys and bindability against the derived Ordering
  field definition.

Observed reality:

- `placements` has no `bindingRules`.
- Rental Ordering hard-codes locked PR-derived values such as participant count
  and PR time.

Impact:

- Placement is not the authority for locked PR-bound fields.
- Adding another ordering family will likely duplicate hard-coded binding logic.

### P1-3: Unpaid Cancellation Creates Refund Lines

Design expectation:

- Refund obligations are based on settled customer payment.
- If no charge was paid, cancellation should not create refund BillLines.

Observed reality:

- Rental cancellation finalization reconciles Bill to a target amount without
  first deriving paid basis.
- The current unpaid cancellation scenario expects extra BillLines.

Impact:

- Bill can materialize refund obligations where no external money movement
  happened.
- This weakens Bill/Payment separation and creates accounting noise.

### P1-4: Rental Cancellation Is Not Fulfillment-Gated

Design expectation:

- Rental cancellation is policy-first and fulfillment-gated.
- Fulfillment should decide service-side reversibility when operator or supplier
  handling is required.

Observed reality:

- User cancellation directly passes an approved decision in the Order Detail
  flow.
- There is no public path for supplier/operator denial or pending handling when
  policy requires it.

Impact:

- Cancellation can terminate the contract without the execution-side authority
  that the packet assigns to Fulfillment.

### P1-5: Payment Settlement Can Start Fulfillment After Cancellation

Design expectation:

- Payment convergence should apply settlement consequences only when the Order
  can still accept those consequences.
- A cancelled contract must not start forward fulfillment.

Observed reality:

- `applyBillSettlementToOrder` checks paid state and family, but not that the
  order is still `OPEN`.

Impact:

- A late successful charge can start Rental Fulfillment for an already cancelled
  Order.

## Important Non-P1 But Related Findings

- Product `RentalServicePolicy` lacks `serviceWindow`; service policy is not
  fully enforced.
- Placement target persistence currently allows `OFFER | ORDER`, while public
  projection resolves `ORDERING | ORDER`.
- Placement has no active window.
- `GET /api/commerce/ordering/from-placement` does not apply the same active
  participant access gate as Placement read.
- PR attachment uniqueness is based on non-detached attachment rather than
  non-terminal Order.
- RideHailing is not yet implemented as a comparable chain.
