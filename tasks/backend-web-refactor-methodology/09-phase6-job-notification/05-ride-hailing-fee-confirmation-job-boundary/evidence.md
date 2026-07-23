# D6-F-01 Evidence

## Current Sequence

There are two distinct upstream facts:

1. RideHailing terminal observation queries the provider's final fare, commits
   `ride_hailing_orders.finalSettlementInput`, and first materializes the final
   Bill.
2. Later, payment callback or active reconciliation observes provider payment
   success.
3. Bill's compare-and-set persists `BillLine.settledAt` for the exact payment
   execution tuple.
4. Only a new `SETTLED` transition invokes
   `applyPaymentSettlementConsequence`.
5. That command verifies all Bill charge lines are paid, resolves the
   RideHailing order and calls `confirmRideHailingProviderFeeAfterPayment`.
6. The RideHailing path reloads the provider binding and provider instance,
   then calls `confirmFee({ providerOrderId })`.

Therefore provider fee confirmation is a post-payment-settlement consequence.
It is not a prerequisite for Bill settlement.

## Path-Backed Facts

- New settlement invokes the consequence:
  `apps/backend/src/domains/payment/use-cases/payment-notifications.ts` and
  `payment-execution.ts`.
- Provider final-fare observation and the atomic RideHailing/final-Bill commit
  are owned by `sync-ride-hailing-order-with-provider.ts` and
  `ride-hailing-reconciliation-transaction.ts`; they precede user payment.
- The consequence rejects an unsettled/non-charge line and delegates by Bill:
  `apps/backend/src/domains/payment/use-cases/payment-settlement-consequence.ts`.
- RideHailing eligibility and the final-settlement-input prerequisite are
  checked before fee confirmation:
  `apps/backend/src/domains/trade/use-cases/apply-bill-settlement-to-order.ts`.
- The provider call reloads `dispatchBinding.providerOrderId` and its provider
  instance from authoritative RideHailing state:
  `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`.
- The CaoCao adapter sends `order_id` plus optional allowance amounts and does
  not send an application idempotency key:
  `apps/backend/src/domains/ride-hailing/services/caocao-provider.ts`.
- The repository's CaoCao OpenAPI marks both `allowance_amount` and
  `cao_allowance_amount` required. The Trade-facing port exposes only optional
  `allowanceAmountFen`, the current call supplies neither allowance, and request
  normalization removes undefined fields. No current durable fact is named as
  the authority for those two values.
- The current provider port exposes `confirmFee`, but no fee-confirmation
  status query/receipt contract:
  `apps/backend/src/domains/ride-hailing/model/provider.ts`.
- Phase 5 F-02 proves the failure window: BillLine settlement commits, the
  synchronous consequence throws, and later exact-attempt reconciliation
  reports `ALREADY_SETTLED` without rerunning the consequence.

## Current State Inventory

There is no current fee-confirmation intent entity/table or independent
fee-confirmation lifecycle. The business inputs already live with their
owners:

- paid/settled payment truth: Bill/BillLine;
- RideHailing provider order and provider instance binding: RideHailing;
- provider adapter configuration: RideHailing provider instance;
- fee-confirmation result/uncertainty: target RideHailing owner-local state;
- generic task execution/retry state: target Job.

Current `jobs` is not yet sufficient unchanged: it has active-only dedupe, a
void/throw handler contract and no per-owner-generation creation contract.
Phase 6 must evolve those generic mechanics, but it must not add a business
reconciliation status or operator business transition to Job.

The allowance-parameter gap is also not evidence for an intent. It is a
provider-command contract and business-fact ownership decision that must be
closed before the Job handler can be specified.
