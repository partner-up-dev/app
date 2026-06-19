# Payment Provider SSOT Refactor

## Objective & Hypothesis

Refactor the payment system so `PaymentTx` no longer persists provider-owned
transaction truth. Provider payment state should be queried or accepted from the
payment provider as the single source of truth, while the backend keeps only the
local contracts needed for bill ownership, user authorization, idempotency,
settlement consequences, and auditability.

Rejected / disputed hypothesis: replacing `PaymentTx` with a smaller local
payment intent plus settlement event may still be insufficiently thorough. Do
not treat that shape as accepted without further discussion.

Current stronger proposal from discussion:

- Delete provider projections/caches from local persistence.
- Query provider when provider-owned state is needed.
- Treat `amountFen`, `currency`, and `expiresAt` as provider order parameters
  or projections rather than local payment transaction facts.
- Move or eliminate local fields such as `merchantOrderNo`,
  `merchantRefundNo`, `requestedBy`, `type`, and `clientId`; if retained, they
  should belong to `BillLine` or a stronger local owner rather than `PaymentTx`.
- Prefer deriving merchant order/refund numbers from stable key material such
  as `billLineId + paymentAttemptId` by hash or another deterministic scheme,
  instead of storing those numbers.
- Superseded candidate: allowing a `BillLine` to correspond to multiple payment
  attempts would require `paymentAttemptSeq` plus provider-instance history, or
  an attempt JSONB/history shape, which reintroduces unnecessary payment attempt
  persistence complexity.
- Current simplification: a `BillLine` should always correspond to one payment
  execution slot / PaymentTx concept. This avoids multi-attempt local history.
- `paymentProviderInstanceId` is set only when a payment execution is initiated.
- If the provider-side execution becomes failed, closed, or expired, the
  BillLine should not be reopened or recreated. Instead, clear the current
  provider binding and let the frontend's next provider choice open a new
  PaymentTx concept for the same BillLine.
- `attemptCount` is local BillLine identity material. It is monotonic and should
  not be reset when provider-side execution fails, closes, or expires. The next
  PaymentTx concept uses `attemptCount + 1` to avoid provider reference
  collision.
- Merchant order/refund number derivation is provider-owned. Payment should ask
  the provider adapter to derive the provider reference from BillLine-local key
  material and provider rules rather than owning the derivation globally.
- Settlement may be persisted directly on `BillLine` as local bill truth, not as
  provider transaction truth. The agreed field name is `settledAt`.

## Guardrails Touched

- Typed input: `Constraint`
- Active mode: `Execute`
- Durable owners touched:
  - `docs/20-product-tdd/system-state-and-authority.md`
  - `docs/20-product-tdd/ecommerce-contracts.md`
  - backend payment entities, repositories, domain use-cases, controllers
  - frontend checkout and bill projections
- Durable docs now state provider systems own provider payment lifecycle truth,
  while BillLine owns provider execution slot identity and settlement
  confirmation.

## Current Understanding

- `PaymentTx` currently combines at least three responsibilities:
  - local charge/refund intent and merchant order/refund number mapping
  - cached provider lifecycle state and provider payload snapshots
  - settlement input used by Bill and Trade consequences
- Removing provider truth persistence must not remove:
  - bill-line authorization and amount integrity
  - stable merchant order/refund number generation
  - idempotent provider callbacks
  - idempotent bill settlement consequences
  - refund linkage to the original successful charge

## Implemented Model

- Superseded: `BillLine.paymentAttemptSeq` multi-attempt model.
- Each `BillLine` has exactly one provider payment execution slot at a time.
- Starting provider payment uses BillLine-local key material including
  `{ providerInstance, billLineId, billLine.kind, attemptCount }`.
- The provider adapter owns merchant order/refund number derivation from that
  tuple.
- Checkout state is assembled dynamically from Bill/BillLine local facts plus a
  provider query for the derived provider reference.
- Provider callbacks parse/verify the provider reference through the provider
  adapter, recover the local tuple, and load the BillLine.
- Provider state should not be copied into local payment state.
- Provider-confirmed settlement is written onto the BillLine as Bill-owned
  settlement truth via `settledAt`, so downstream consequences do not need a
  persisted `PaymentTx` table.
- Persisted `payment_txs` schema and repository have been removed. The forward
  migration backfills settled BillLines from successful old rows, then drops the
  table.

## Field Dynamics

- `paymentProviderInstanceId`
  - Initial state: `null`.
  - Set when a user/operator initiates a provider execution for the BillLine.
  - Remains set while provider execution is pending/action-required.
  - Remains set after `settledAt` is written, as local routing/evidence context
    for the settled execution.
  - Cleared only when provider reports failed/closed/expired and the BillLine is
    eligible for a new execution choice.
- `attemptCount`
  - Initial state: `0`.
  - Incremented exactly when a new provider execution slot is opened.
  - Current provider reference uses the current `attemptCount`.
  - Never decremented or reset; clearing `paymentProviderInstanceId` does not
    change it.
- `settledAt`
  - Initial state: `null`.
  - Written once provider-confirmed success is accepted for the BillLine.
  - For `CHARGE` BillLines, means paid/settled.
  - For `REFUND` BillLines, means refunded/settled.
  - Once set, provider execution should not be retried from the same BillLine.

## Verification

- Provider reference unit coverage:
  - WeChatPay charge/refund references round-trip through the provider adapter.
  - Tampered references, wrong provider instance, wrong kind, and out-of-range
    attempt counts are rejected.
  - References stay within WeChatPay's 32-character merchant reference limit.
- Bill projection unit coverage:
  - Charge/refund settlement totals derive from BillLine `settledAt`.
  - Active provider bindings project as processing/refund-pending without a
    persisted payment transaction.
- Backend provider-backed scenario coverage:
  - Real fake WeChatPay HTTP server receives charge creation.
  - First provider attempt is marked failed by the mock provider, sync queries
    provider state, clears `paymentProviderInstanceId`, and keeps
    `attemptCount = 1`.
  - Second attempt creates a different provider reference, mock provider is
    marked successful, sync queries provider state, writes `settledAt`, and
    leaves `attemptCount = 2`.
  - Scenario asserts the legacy `payment_txs` table is absent.
- Backend commerce scenario coverage:
  - Existing rental order persistence paths still pass.
  - Late payment after a pending termination attempt or cancelled order does not
    start fulfillment.
- Mock provider package coverage:
  - Fake WeChatPay server unit tests pass.
- System browser scenario coverage:
  - Real frontend, real backend HTTP, isolated database, and Playwright
    Chromium path execute the rental ordering flow successfully.
  - The browser flow still reaches checkout, order placement, and order-state
    assertions after removing persisted `PaymentTx`.

## Next Step

Review implementation diff for naming, migration rollout, and the remaining
rollout decision around existing in-flight production `payment_txs` rows before
merge.
