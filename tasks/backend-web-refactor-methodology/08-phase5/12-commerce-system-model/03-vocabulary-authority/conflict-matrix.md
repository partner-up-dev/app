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

## Known Durable-Document Conflict

`system-state-and-authority.md` currently says RideHailing provider binding lives in Trade choice-set resolution
snapshots, while current entity/source and `ecommerce-contracts.md` locate dispatch binding in
`ride_hailing_orders.dispatchBinding`. C0 treats this as a source-versus-durable truth conflict to resolve through
characterization and a subsequent focused promotion—not a wording-only edit. It remains a future reconciliation
item after Phase 5 local closure; do not treat it as a completed durable promotion.
