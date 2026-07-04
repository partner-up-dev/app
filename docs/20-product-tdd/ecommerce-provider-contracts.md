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

### Final Settlement Source

- For the currently integrated CaoCao surface, `ride_hailing_orders.finalSettlementInput` is derived from `queryOrderDetailV2.orderFeeVo.totalFee`.
- `finalSettlementInput.amountFen` binds `orderFeeVo.totalFee`.
- `orderFeeVo.companyPayAmount` is not the current settlement source.
- `queryFinalSettlement()` is a dedicated adapter read that internally calls `queryOrderDetailV2` and reads `orderFeeVo.totalFee`.
- Provider order-detail sync must not directly materialize `finalSettlementInput`; terminal settlement capture still goes through the provider final-settlement query contract, even if the adapter reuses the same provider endpoint under the hood.

### Cancellation Fee Boundary

- User-side RideHailing cancellation from Order Detail must query CaoCao's cancellation-fee preview before sending the destructive cancellation command.
- If the previewed cancellation fee is greater than zero, frontend must show the amount and require explicit confirmation before cancellation.
- The cancellation-fee preview must not be reused as post-cancel final settlement truth.
