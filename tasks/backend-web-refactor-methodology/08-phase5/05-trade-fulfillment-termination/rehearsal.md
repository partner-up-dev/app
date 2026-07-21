# 5-4 Rehearsal

1. A customer or Admin user tries every former Rental order/booking/fulfillment action: the backend rejects it before
   it creates an Order, Bill, payment attempt, provider request, or booking mutation.
2. A direct API caller bypasses the removed UI: the same backend boundary rejects the operation.
3. A RideHailing placement/order/payment journey follows the unchanged active path.
4. A generic Order/Bill read continues to work for active RideHailing records; no Rental-only UI or route pretends
   that fulfillment remains available.
5. The source inventory reaches zero for production Trade→Fulfillment Rental imports and public Rental fulfillment
   routes before an implementation artifact is deleted.

Unexpected branch: a supposed shared component still relies on a Rental-only type or query. Stop at that import,
classify it, and either move it behind an active generic contract or keep the artifact as an explicitly documented
compatibility window. Do not re-introduce Rental write behavior merely to make a typecheck pass.
