# Ratified Upstream Decisions

Sir ratified these Phase 5 inputs on 2026-07-20:

1. **D1 — Placement admission:** only a PR creator receives a new-order CTA; an active non-creator may open an
   existing matching order but does not enter a new-order flow.
2. **D2 — Checkout return:** Checkout reconciles backend provider/Bill truth; success returns to Bill Detail, while
   closed, failed, and unknown client returns remain retryable on Checkout.
3. **D3 — settlement correction:** a later authoritative RideHailing correction is an explicit compensating Bill
   adjustment/refund, never a silent rewrite of settled history.

The PRD records D1/D2/D3 as product intent. `5-3` has now source-realized and
verified D2; `ecommerce-contracts.md` records its current technical recovery
contract. D1 and D3 remain later implementation work, so this decision record
must not be read as evidence that their source realization is complete.
