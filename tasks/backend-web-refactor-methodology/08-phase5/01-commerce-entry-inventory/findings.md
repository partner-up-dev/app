# 5-0 Findings

## Observed Owner Topology

- The Product TDD names `merchandising`, `trade`, `fulfillment`, `bill`, and `payment` as the core Commerce owner
  families; `ride-hailing` is the provider-execution boundary.
- Current user transport is split between `/api/commerce` and `/api/payment`. `commerce.controller.ts` provides
  listing, order, bill, and cancellation routes; `payment.controller.ts` provides provider catalog, charge, and
  transient payment-transaction reads; `payment-provider.controller.ts` receives provider notifications.
- Web `commerce` currently aggregates placement, ordering, order/bill, cancellation, checkout-target, and order
  polling query adapters. Web `payment` owns provider catalog, charge/poll adapters, and payment-client action.

## Evidence-Backed Complexity Signals

These are prioritization signals, not a mandate to split files:

| Surface | Signal | Why it matters |
| --- | --- | --- |
| `apps/backend/src/domains/trade/use-cases/create-order.ts` | 1,178 lines | composes quote resolution, PR attachment, bill initialization, Rental/RideHailing init, and provider dispatch |
| `apps/backend/src/domains/trade/use-cases/offer-listing.ts` | 667 lines | joins catalog, quote issuance, provider availability, and quote persistence |
| `apps/backend/src/domains/trade/use-cases/cancel-ride-hailing-order-from-order-detail.ts` | 676 lines | combines cancellation decision, provider sync, settlement, and consequences |
| `apps/backend/src/domains/ride-hailing/services/caocao-provider.ts` | 1,222 lines | provider protocol adapter; must remain a provider boundary rather than leak into Trade |
| `apps/web/src/domains/commerce/queries/useCommerce.ts` | 702 lines | aggregates unrelated owner adapters and embeds RideHailing poll policy |

## Boundary Debt To Baseline, Not Assume Away

- All six core backend domain roots currently wildcard-export `model`, `services`, and `use-cases`; this is broader
  than the durable four-category public-surface rule.
- A first focused scan confirms direct `services` or `use-cases` paths in both core and admin code. Core examples are
  Rental→Fulfillment booking confirmation, Payment→Trade settlement consequence, Trade→Bill line materialization,
  and Bill→Trade unpaid-window types. Admin examples include AdminPayment→Payment WeChatPay config validation and
  AdminRideHailing→Trade cancellation. This list is deliberately not claimed exhaustive.
- `5-1` must classify all remaining direct `model` and `services` dependencies. A nested path is not automatically
  wrong, but every cross-owner dependency needs a category, owner, and removal/retention condition. In particular,
  the AdminPayment validation helper is not currently root-exported, so replacing its path blindly would widen the
  Payment public surface rather than close a boundary.

## Existing Proof Assets

- Backend has focused tests for placement/catalog, pricing/status/termination, Bill state/reconciliation,
  Fulfillment, Payment, and CaoCao adapters.
- Commerce System scenarios contain 9 Rental and 8 RideHailing journeys. They cover Placement→order, unpaid
  obligation, PR admission, quote expiry, dispatch failure, vehicle availability, cancellation fee, and cancellation
  entry.
- Web focused proof is sparse around Commerce aggregation and admin management; adding a broad source refactor
  without first isolating a behavior seam would be high verification cost.

## Evidence Limits

- Historical task packets are leads only. Several predate the current durable unpaid-obligation and provider-final-
  settlement rules; Phase 5 must use current durable contracts and source/verification evidence as authority.
- Local code cannot prove deployed WeChatPay notify or CaoCao edge routing; those belong to `5-7`.
