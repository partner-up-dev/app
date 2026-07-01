# Implementation Plan

## Target Model

`PaymentTx` should stop being a persisted entity. A persisted BillLine owns one
provider execution slot at a time:

- `paymentProviderInstanceId`: nullable provider binding for the current or
  settled execution slot.
- `attemptCount`: monotonic local counter used as provider reference key
  material.
- `settledAt`: nullable BillLine settlement truth.

Provider adapters own merchant order/refund number derivation and parsing.
Provider status, provider snapshots, provider transaction ids, prepay ids,
failure codes, amount copies, currency copies, and payment expiry copies should
not be persisted as payment transaction truth.

Runtime `PaymentTx` may remain as an in-memory/provider-facing concept if that
name is useful, but it must not have a database table or repository.

## Impact Handshake

Address and Object:

- Durable docs:
  - `docs/20-product-tdd/system-state-and-authority.md`
  - `docs/20-product-tdd/ecommerce-contracts.md`
- Backend schema:
  - `bill_lines`
  - `payment_txs`
  - payment provider instance schema remains provider registry truth
- Backend code:
  - payment checkout, notifications, refund flow, bill detail, bill settlement
  - trade settlement consequence integration
  - commerce controller route contract
- Frontend:
  - checkout page no longer syncs by `paymentTxId`
  - bill detail line state no longer depends on `latestPaymentTx`

State Diff:

- From: `BillLine 1:N persisted PaymentTx`, where `PaymentTx` mixes local
  attempt, provider cache, provider references, and settlement evidence.
- To: `BillLine 1:1 current provider execution slot`, where provider state is
  queried from provider and confirmed settlement is recorded on BillLine.

Blast Radius Forecast:

- Database migration and data migration.
- Backend API response shape for checkout and bill detail.
- Frontend query hooks and checkout UI.
- Scenario tests that seed or assert `PaymentTx`.
- Refund creation and original-charge lookup.
- Provider callback idempotency and stale callback handling.

Invariants Check:

- A user can only pay their own charge BillLine.
- BillLine amount/currency remain Bill-owned obligation truth.
- A settled charge BillLine cannot be paid again.
- A settled refund BillLine cannot be refunded again.
- Provider references must be deterministic, parseable, tamper-checked, and fit
  provider limits.
- `attemptCount` never decreases.
- Failed/closed/expired provider execution clears `paymentProviderInstanceId`
  only; it does not reset `attemptCount`.
- Late payment settlement must not start fulfillment for an ineligible,
  terminated, or cancelled order.

Verification:

- Backend unit tests for provider reference derivation/parsing.
- Backend unit tests for BillLine settlement derivation.
- Backend scenario tests for checkout, callback settlement, retry after terminal
  provider state, refunds, and late payment after cancellation.
- Frontend unit or scenario coverage for checkout sync by BillLine rather than
  `paymentTxId`.
- Static gate slices after implementation: at least backend type/build and
  targeted scenario tests; full `pnpm check:static` before shipping.

## Execution Slices

### 1. Solidify Durable Contract

Update Product TDD before code:

- `system-state-and-authority.md`
  - Remove backend ownership of `PaymentTx` and gateway-facing payment state.
  - State that provider owns provider payment lifecycle truth.
  - State that BillLine owns local provider execution slot identity and
    settlement confirmation.
- `ecommerce-contracts.md`
  - Clarify Payment owns provider orchestration and provider queries, not
    persisted provider transaction state.
  - Clarify Bill settlement derives from BillLine `settledAt`.

Exit criteria:

- Durable docs no longer claim `PaymentTx` is backend payment truth.
- New BillLine/provider boundary is explicit.

### 2. Add BillLine Payment Slot Schema

Schema changes:

- Add `bill_lines.payment_provider_instance_id uuid null`.
- Add `bill_lines.attempt_count integer not null default 0`.
- Add `bill_lines.settled_at timestamptz null`.
- Reference `payment_provider_instances(id)` if entity import order permits
  cleanly after removing `payment_txs`; otherwise split provider instance schema
  into a non-circular entity module first.

Data migration:

- Backfill `settled_at` from successful charge/refund `payment_txs` where
  present.
- Backfill `payment_provider_instance_id` and `attempt_count` for settled lines
  from the successful persisted tx when this is safe.
- Decide rollout handling for in-flight `PaymentTx` rows before dropping the
  table. If production may contain in-flight rows, add a reconciliation step or
  pause payment initiation during migration.

Exit criteria:

- BillLine can represent the new local slot and settlement truth.
- Existing successful settlements are not lost.

### 3. Provider Reference API

Extend provider ports with provider-owned reference functions:

- derive charge reference from `{ billLineId, kind, providerInstanceId,
  attemptCount }`.
- derive refund reference from the same local key material.
- parse and verify a provider reference back into local key material.

WeChatPay constraints:

- `out_trade_no` / `out_refund_no` derivation must fit WeChatPay length limits.
- Encoding should be reversible enough to recover `billLineId`, `kind`, and
  `attemptCount`, with tamper detection.
- Unit tests must cover round trip, tamper rejection, wrong-kind rejection, and
  max-length output.

Exit criteria:

- Payment domain no longer knows merchant number algorithms.
- Callback handling can locate a BillLine without a persisted mapping table.

### 4. Replace PaymentTx Repository Usage

Remove `PaymentTxRepository` from payment and trade flows.

Checkout:

- Resolve BillLine/Bill/Order authorization as today.
- If `settledAt` is set, return paid/refunded projection.
- If `paymentProviderInstanceId` is set and unsettled, derive provider reference
  and query provider for dynamic status.
- If provider state is failed/closed/expired, clear
  `paymentProviderInstanceId` while preserving `attemptCount`, then allow a new
  frontend-selected provider execution.
- Starting a new execution atomically sets provider binding and increments
  `attemptCount`, then calls provider create/prepay.
- Unknown provider-create errors should not blindly clear the binding; later
  query/callback should recover if provider accepted the request.

Notifications:

- Parse and verify provider reference through provider adapter.
- Load BillLine by parsed id.
- Verify provider instance/kind/attempt alignment.
- On confirmed success, write `settledAt` idempotently and trigger Bill/Order
  settlement consequence.
- Do not persist provider status or payload.

Refund:

- Find original charge by `refundOfBillLineId` and `settledAt`.
- Use original charge BillLine provider binding and attempt count to derive the
  original merchant order reference.
- Set refund line provider binding and increment its `attemptCount` when
  opening refund execution.

Exit criteria:

- No production use-case depends on persisted `PaymentTx`.
- Provider state is read from provider, not local cache.

### 5. Bill And Trade Settlement

Replace `deriveBillPaymentState({ lines, txs })` with BillLine-based
settlement:

- Charge line is paid when `kind = CHARGE` and `settledAt is not null`.
- Refund line is refunded when `kind = REFUND` and `settledAt is not null`.
- Pending/action-required/failed checkout statuses are dynamic provider-query
  projections, not settlement truth.

Update trade settlement consequence:

- Apply prepaid consequence when all charge BillLines are settled.
- Preserve current guards for non-open orders and pending termination attempts.

Exit criteria:

- Bill settlement no longer needs `PaymentTx`.
- Late successful payment cannot bypass order eligibility guards.

### 6. API And Frontend Contract

Backend route changes:

- Remove or deprecate `/api/commerce/payments/:paymentTxId`.
- Replace sync by payment id with BillLine-scoped sync/action, for example
  `/api/commerce/bill-lines/:billLineId/payment/sync`.
- Keep charge creation BillLine-scoped.

Frontend changes:

- `PaymentCheckoutPage` no longer stores or syncs by `paymentTxId`.
- Checkout active payment projection is BillLine-scoped.
- Bill detail removes `latestPaymentTx` and `activePaymentTxId` assumptions.
- UI retry action appears only when provider projection says terminal failure
  and BillLine is unsettled.

Exit criteria:

- Frontend has no `PaymentTxId` dependency.
- User-visible checkout behavior remains intact.

### 7. Remove PaymentTx Persistence

After code no longer reads or writes `payment_txs`:

- Remove `payment_txs` entity.
- Remove `PaymentTxRepository`.
- Remove payment tx model types that only served persistence state.
- Add forward-only schema migration to drop `payment_txs` after any required
  data migration has run.
- Clean scenario builders and tests that seed `PaymentTx`.

Exit criteria:

- `rg "PaymentTx|payment_txs|paymentTxId"` only finds obsolete changelog/task
  references or intentionally renamed runtime concepts.

## Open Implementation Questions

- Exact provider reference encoding for WeChatPay under length limits.
  - Implemented as 32 characters:
    - `PC`/`PR` prefix
    - 22-character base64url BillLine UUID
    - 3-character base36 attempt count
    - 5-character HMAC signature over provider instance, BillLine, kind, and
      attempt
- Whether stale success callbacks for a previously cleared provider binding
  should settle the BillLine, no-op, or enter operator review.
- How deployment should treat existing in-flight persisted `PaymentTx` rows.
- Whether `paymentProviderInstanceId` should remain after settled refund/charge
  forever as local routing evidence, or be cleared after a retention window.

## Implementation Status

- Durable Product TDD updated for provider SSOT and BillLine-owned settlement.
- BillLine schema now carries `paymentProviderInstanceId`, `attemptCount`, and
  `settledAt`.
- Persisted `payment_txs` entity/repository has been removed; migration backfills
  successful old settlements, then drops the table.
- Payment checkout, sync, notifications, refund execution, Bill projection, and
  trade settlement now operate from BillLine plus live provider query.
- Commerce API sync is BillLine-scoped.
- Frontend checkout no longer syncs by `paymentTxId`.
- Runtime provider model was renamed away from `payment-tx` terminology.

## Acceptance Plan

Static checks are intentionally omitted from this section. Acceptance should
prove behavior, not implementation filenames.

### Provider Reference Ownership

Test that provider references are derived and parsed only through the provider
adapter:

- Creating a charge passes BillLine-local key material into the adapter and
  does not persist a merchant order number.
- Creating a refund passes BillLine-local key material into the adapter and does
  not persist a merchant refund number.
- A derived reference round-trips back to the original BillLine id, kind,
  provider instance id, and attempt count.
- A tampered reference is rejected before any BillLine settlement mutation.
- A reference with the wrong BillLine kind is rejected.
- The WeChatPay reference output fits provider length constraints.

### Fresh Charge Flow

Test a charge BillLine with no provider binding:

- Before payment starts, checkout shows no active provider execution and allows
  payment if Bill, Order, and viewer rules allow it.
- Starting payment with a selected provider writes
  `paymentProviderInstanceId`, increments `attemptCount` from `0` to `1`, leaves
  `settledAt` null, and calls the provider with amount/currency read from the
  BillLine.
- The returned client action is usable by checkout, but provider status,
  provider snapshots, transaction ids, and merchant order numbers are not
  persisted.
- Reloading checkout for the same pending execution queries provider using the
  same derived reference and does not increment `attemptCount` again.

### Successful Charge Settlement

Test provider-confirmed charge success:

- A valid provider callback locates the BillLine from the derived provider
  reference.
- The BillLine is marked settled by writing `settledAt`.
- Replaying the same successful callback is idempotent and does not duplicate
  fulfillment or settlement consequences.
- Once all charge BillLines for a Bill are settled, the order settlement
  consequence runs exactly once when the order is eligible.
- If the order has a pending termination attempt, is cancelled, or is otherwise
  ineligible, late payment success does not start fulfillment.

### Failed Closed Expired Charge Recovery

Test terminal provider states that are not success:

- Checkout/query sees provider failed, closed, expired, or provider-not-found
  state and clears `paymentProviderInstanceId`.
- Clearing provider binding does not reset or decrement `attemptCount`.
- The same BillLine can start a new provider execution after frontend provider
  selection, and the new execution increments `attemptCount`.
- If the same provider is selected again, the new derived reference differs from
  the previous one.
- The BillLine remains unsettled until provider-confirmed success.

### Authorization And Eligibility

Test existing product invariants still hold:

- A user cannot pay another user's charge BillLine.
- A user cannot start payment for a refund BillLine through the user checkout
  charge flow.
- A closed Bill or non-open Order blocks payment initiation.
- A settled BillLine cannot open a new provider execution.
- A missing or disabled provider instance cannot be bound to a BillLine.

### Refund Flow

Test refund execution without persisted PaymentTx:

- A refund BillLine can start refund execution only when its original charge
  BillLine is settled.
- The original charge provider reference is derived from the original charge
  BillLine's provider binding and attempt count.
- The refund BillLine writes its own `paymentProviderInstanceId`, increments
  its own `attemptCount`, and remains unsettled until provider-confirmed refund
  success.
- Successful refund callback writes `settledAt` on the refund BillLine.
- Replaying a refund success callback is idempotent.
- A failed/closed/expired refund clears provider binding without resetting
  `attemptCount`, allowing a new refund execution selection later.

### Bill Projection

Test Bill and checkout projections:

- Bill paid totals are derived from charge BillLines with `settledAt`.
- Bill refunded totals are derived from refund BillLines with `settledAt`.
- Pending, action-required, failed, and expired display states come from live
  provider query projection, not from persisted payment status.
- Bill detail no longer exposes or depends on latest/active persisted payment
  transaction ids.
- Checkout sync is BillLine-scoped and does not require a payment transaction
  id.

### Migration And Existing Data

Test migration behavior with representative old rows:

- Successful old charge rows backfill `settledAt` onto their charge BillLine.
- Successful old refund rows backfill `settledAt` onto their refund BillLine.
- Non-success old rows do not mark BillLines settled.
- Backfilled BillLines retain enough provider binding and attempt count context
  to derive their provider reference if needed.
- Existing successful settlement consequences are not duplicated by migration.
