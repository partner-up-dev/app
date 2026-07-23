# Ecommerce Provider Contracts

This file owns provider-specific ecommerce details that shape cross-unit user experience, billing, settlement, or cancellation semantics. It is not a provider adapter manual; backend code owns low-level request construction and retry mechanics.

## CaoCao RideHailing Contract

### Multi-Candidate Dispatch

- CaoCao supports multi-candidate dispatch through `/common/orderCarV2` with `is_simultaneously_call=1` and `service_type_price`.
- The CaoCao adapter submits all selected RideHailing candidates instead of choosing a cheapest fallback locally.
- If create fails, the local order is cancelled and the Ordering Page receives the `CANCELLED` create-order result; the system does not retry another candidate/provider inside the same create command.

### Provider Order Identity And Execution Snapshot

- The provider-side order id returned by create is stored in the RideHailing dispatch binding together with provider instance identity.
- Provider order-detail reads own execution truth: execution phase, driver snapshot, vehicle snapshot, and other ride-lifecycle facts come from provider order-detail reads.

### Observation And Reconciliation Boundary

- A provider callback, browser reconcile command, or cancellation preflight is
  only a trigger to read current provider truth; callback payload alone is not
  RideHailing execution or settlement truth.
- Provider I/O is outside database locks. The reconciliation boundary receives
  only normalized execution/fare facts, rechecks the dispatch binding under
  lock, and acquires local locks in the fixed Trade then RideHailing order.
- The terminal-fare commit may create the first final Bill in that same short
  transaction. It exposes no generic executor/repository API and no raw
  provider payload to Trade or Bill.
- Provider order-detail and final-settlement queries remain separate semantic
  reads even when one provider adapter implements both through the same remote
  endpoint.

### Final Settlement Source

- For the currently integrated CaoCao surface, `ride_hailing_orders.finalSettlementInput` is derived from `queryOrderDetailV2.orderFeeVo.totalFee`.
- `finalSettlementInput.amountFen` binds `orderFeeVo.totalFee`.
- `orderFeeVo.companyPayAmount` is not the current settlement source.
- `queryFinalSettlement()` is a dedicated adapter read that internally calls `queryOrderDetailV2` and reads `orderFeeVo.totalFee`.
- Provider order-detail sync must not directly materialize `finalSettlementInput`; terminal settlement capture still goes through the provider final-settlement query contract, even if the adapter reuses the same provider endpoint under the hood.
- If a later authoritative fare differs after a final Bill already exists, the
  current reconciliation result is `correctionRequired`; it does not create an
  adjustment or refund automatically.

### Post-Settlement Fee Confirmation

- Fee confirmation is a typed Job consequence of the first qualifying local
  Bill settlement, including an all-zero final Bill settled at creation. It is
  distinct from provider final-fare observation and final-Bill creation.
- The settlement transaction creates one terminal-safe `ONCE_PER_CAUSE` Job.
  Its business payload contains only local `orderId`; the handler reloads the
  RideHailing provider binding before provider I/O, which runs outside the
  settlement transaction.
- CaoCao's official `POST /v2/common/feeConfirm` contract requires
  `order_id`. Both `allowance_amount` and `cao_allowance_amount` are optional,
  and the current request explicitly omits both rather than inventing zero
  values or subsidy ownership.
- The public contract does not promise fee-confirm-specific idempotency after
  a lost response. Generic Job retry may therefore repeat an already-applied
  provider operation; that duplicate-effect risk is explicitly accepted.
- No fee-confirmation-specific receipt/query or parallel RideHailing
  business/recovery lifecycle is introduced. Settled rows before the forward
  cut-off remain unchanged.

### Cancellation Fee Boundary

- User-side RideHailing cancellation from Order Detail must query CaoCao's cancellation-fee preview before sending the destructive cancellation command.
- If the previewed cancellation fee is greater than zero, frontend must show the amount and require explicit confirmation before cancellation.
- The cancellation-fee preview must not be reused as post-cancel final settlement truth.
