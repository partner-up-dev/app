# Current / Target Owner-And-Surface Matrix

## Reading Rule

This is a migration design, not a claim that every target surface already
exists. A target `commands.ts`, `queries.ts`, `contracts.ts`, or `ports.ts`
entrypoint is created only when a real external consumer is ready to cut over.
No generic Commerce barrel is a valid substitute.

| Owner | Current external consumption | Current problem | Target category surface | Earliest cutover |
| --- | --- | --- | --- | --- |
| Merchandising | Trade reads catalog/pricing types, guards, and repositories; controllers/admin use wildcard root | catalog facts, owner-local guards, and persistence access are mixed | `contracts` for snapshots; canonical catalog/admission `query`; admin `commands` | 5-2 for quote intake; 5-6 for admin closure |
| Trade | controllers call order/listing/cancellation; Bill Checkout consumes a billing query; Payment consumes a settlement command; RideHailing still consumes services/models | lifecycle commands, internal pricing helpers, provider snapshots, and repositories leak together | order/listing `commands` and `queries`; settlement command/event; immutable settlement contracts | 5-2, 5-4, 5-5; 5-3 checkout cut complete |
| Fulfillment | Trade invokes prepayment and Rental booking/cancellation behavior; admin invokes fulfillment actions | a direct `use-cases/confirm-rental-booking` edge and overloaded order-id naming | Rental lifecycle `commands` plus termination decision contract | 5-4 |
| Bill | controllers expose Bill reads; Trade/RideHailing construct/reconcile bills; Payment Checkout reads/writes through Bill category surfaces | creation/reconciliation services and persistence are imported by other owners | checkout/detail `queries`; obligation/reconcile `commands`; BillLine execution-slot contract | 5-2, 5-4, 5-5; 5-3 checkout cut complete |
| Payment | controllers use charge/poll/callback/provider category surfaces; Trade triggers refunds; admin reaches a deep config validator | provider execution is mostly owner-local, but admin config validation has no deliberately public contract | charge/refund/provider `commands`; provider catalog/PaymentTx `queries`; provider protocol `ports`; provider config contract if proven | 5-4, 5-6; 5-3 checkout cut complete |
| RideHailing | Trade builds provider ports, listing quotes, dispatch/cancellation; callback controller invokes sync; admin reads config/order workspace | provider port, sync command, provider DTOs, and Trade persistence are interwoven | provider `ports`; sync/cancel-preview `commands`/`queries`; immutable observation contracts | 5-5 |

## Key Classification Decisions

1. `BillTargetAmountSeed`, `SplitRuleSnapshot`, order payment-window facts,
   and provider-observation snapshots are candidate stable contracts only when
   their consumers need the fact independent of owner-local implementation.
2. `materializeChargeLinesFromSplitRule`, pricing helpers, SKU type guards,
   and config validators are *not* automatically public because another module
   currently imports them. Each needs either a narrower command/query or a
   redesigned caller.
3. `RepositoryExecutor`, repositories, Drizzle rows, and persistence-derived
   aliases cannot become a public cross-owner surface. A real shared
   transaction need must be modeled as an explicit transaction port, not a
   convenience executor parameter.
4. Controllers are valid protocol consumers, but must eventually import a
   category entrypoint rather than wildcard domain roots.

## Current Wide-Export Baseline

Each of the following roots currently wildcard-exports `model`, `services`,
and `use-cases`:

- `apps/backend/src/domains/merchandising/index.ts`
- `apps/backend/src/domains/trade/index.ts`
- `apps/backend/src/domains/fulfillment/index.ts`
- `apps/backend/src/domains/bill/index.ts`
- `apps/backend/src/domains/payment/index.ts`
- `apps/backend/src/domains/ride-hailing/index.ts`

They remain compatibility surfaces until real consumers migrate. The Web-facing
root export of `OrderingEntryPayload` / `OrderingOfferDetail` is a distinct
cross-unit consumer and must be included in that later consumer inventory.
