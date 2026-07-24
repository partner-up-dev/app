# Vocabulary / Authority Conflict Matrix

| Term family | Current collision | Target semantic distinction | Slice / proof |
| --- | --- | --- | --- |
| Quote | `CommerceQuote` is the persisted authorization/freshness token, while provider estimate has `providerQuoteId` | `CommerceQuote` / `OfferQuoteId` authorizes create; `ProviderEstimate` or `ProviderQuoteSnapshot` is nested provider observation only | `5-2`: expiry/reuse and provider-id misuse proof |
| Placement admission | D1 previously differed from the Web/backend entry flow | `PlacementAdmissionOutcome`: `EXISTING_ORDER`, `CREATOR_ELIGIBLE`, `NON_CREATOR`, `INACTIVE` | `5-2`: complete three-branch proof; F-03 feedback lifetime repair is separately complete |
| Order versus attempt | Trade Order is a durable binding; unknown provider create currently lacks a separate identity | `CreateOrderAttempt` is command/idempotency/recovery state, not the buyer's Trade Order | `5-2`: response-loss and replay/provider-request-count proof |
| Provider order identity | `providerOrderId` and `externalOrderId` are both called order IDs | provider id is provider query/cancel/final-settlement key; external id is client correlation token | `5-2`/`5-5`: callback/query/cancel round trip |
| Observation versus execution | API exposes local execution fields and a `live` provider projection; UI chooses different sources | `executionSnapshot` is durable local projection; `providerObservation` is latest non-authoritative source observation | `5-5`: stale observation cannot regress snapshot |
| Settlement | provider final fare and BillLine payment confirmation both use settlement language | `ProviderFinalSettlementObservation` → `BillTargetAmountSeed` → `BillLineSettlementConfirmation` | `5-5`: first terminal commit/duplicate consequence proof; D3 deferred |
| Payment attempt | BillLine tuple is canonical attempt; browser lookup hint is also called attempt | business attempt is only `(kind, billLineId, providerInstanceId, attemptCount)`; browser has `PaymentTxLookupHint` | `13-read-model-cache-convergence`: complete; no hint decides success |
| Rental booking | durable docs/source still describe active booking while R0 selects retirement | R0 is runtime retirement; no replacement booking semantics are invented | `5-4`: runtime ingress proof complete; retained-Bill payment ingress is a separate Sir-deferred divergence |

## Historical Durable-Document Conflict — Superseded

At C0, `system-state-and-authority.md` said RideHailing provider binding lived
in Trade choice-set resolution snapshots, while entity/source and
`ecommerce-contracts.md` located it in
`ride_hailing_orders.dispatchBinding`. C0 correctly required source
characterization and focused promotion rather than a wording-only edit.

Commit `171319de` subsequently made that promotion. The Phase 8 `8-5` audit
then traced both binding writers and all provider execution, cancellation,
reconciliation and projection readers. Current source,
`system-state-and-authority.md` and `ecommerce-contracts.md` agree:
RideHailing storage owns `dispatch_binding`; Trade choice-set resolution owns
only the final vehicle/quote. No source, schema or durable wording change is
required in `8-5`; this section remains historical evidence.
