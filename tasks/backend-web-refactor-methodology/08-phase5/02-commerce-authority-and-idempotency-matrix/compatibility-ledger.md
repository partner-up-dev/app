# Compatibility Ledger

## Core Owner Deep Imports (AST-Verified)

The 5-1 AST import scan found these ten `model`, `services`, or `use-cases`
paths among the six core Commerce families. This is the pre-cutover baseline,
not permission for a new broad public barrel.

| Consumer | Current producer path | Symbols | Target classification | Owning later slice |
| --- | --- | --- | --- | --- |
| RideHailing final-settlement consequence | `bill/services` | `materializeChargeLinesFromSplitRule` | Bill command or obligation-materialization contract | 5-5 |
| RideHailing final-settlement consequence | `trade/services` | `resolvePricingFromExecutionSnapshot` | Trade pricing contract/query | 5-5 |
| RideHailing provider sync | `trade/model` | choice-set, dispatch, execution snapshots | Trade immutable observation contract | 5-5 |
| RideHailing provider sync | `trade/services` | cancellation close / choice-set lookup | Trade command/query, not service export | 5-5 |
| Payment settlement consequence | `trade/use-cases/apply-bill-settlement-to-order` | settlement consequence | explicit Trade command or settlement event/port | 5-3 — complete |
| Bill payable-line policy | `trade/model` | `OrderStatus`, `OrderTimeout` | Trade settlement/payment-window contract | 5-3 — complete |
| RideHailing provider observation | `trade/model` | driver, vehicle, execution snapshots | Trade immutable observation contract | 5-5 |
| Trade Offer Listing | `ride-hailing/model` | provider vehicle quote | RideHailing provider quote contract/port | 5-2 |
| Trade create-order | `bill/services` | unpaid check / charge materialization | Bill eligibility query and Bill obligation command | 5-2 |
| Trade Rental flow | `fulfillment/use-cases/confirm-rental-booking` | booking confirmation | Fulfillment command | 5-4 |

## Admin Adapter Edges

Admin composition currently also consumes deep model/service/use-case paths.
These are not bundled into core cutovers:

- AdminRideHailing → Trade cancellation command and order snapshot types;
- AdminRideHailing → RideHailing provider config/callback-url validation;
- AdminPayment → Payment provider config types and deep WeChatPay validation;
- AdminCommerce → owner persistence and policy helpers across Merchandising,
  Trade, Bill, and Rental fulfillment.

`admin-payment-management`'s config validator is particularly important: it
is not currently root-exported, and exposing the helper merely to eliminate a
deep path would widen Payment's public API without a real semantic contract.

## Compatibility Rules

For each row, later execution must record:

1. all production, controller, script, test-kit, and type-only consumers;
2. the replacement category surface and its semantic owner;
3. a zero-consumer removal condition;
4. focused owner proof and an affected user journey before deletion.

The 5-1 AST scan observed 34 core-family import declarations and 19 admin
adapter declarations in total. Repository/row bypasses are broader than the
ten path family above and are deliberately deferred to the vertical owner slice
that can replace them safely.

## 5-3 Cutover Update

| Baseline edge | Replacement and semantic owner | Consumer result | Proof / residual |
| --- | --- | --- | --- |
| Payment settlement consequence → `trade/use-cases/apply-bill-settlement-to-order` | `trade/commands` exposes the Trade-owned settlement command | Payment has no remaining deep use-case import | focused provider scenario plus callback-backed browser journey; durable outbox recovery remains open |
| Bill payable-line policy → `trade/model` | Bill's payable rule consumes a local structural payment-window context; Checkout obtains those facts from `trade/queries` | no `trade/model` import remains in the Bill/Payment/controller checkout scan | Bill payable-rule unit proof; the older Bill Detail raw-Trade repository read is a separate compatibility edge, not retired here |
| Payment Checkout → `BillLineRepository` | Bill checkout/execution queries and commands | charge, poll, callback, and settlement consequence no longer use raw BillLine persistence | focused source inventory; `create-refund-execution` remains a separate refund-flow compatibility edge |
