# 5-2 Decision Matrix

## Decisions Already Made

| Topic | Current durable rule | Implementation consequence |
| --- | --- | --- |
| D1 non-creator entry | only creator starts a new PR-scoped order; an active non-creator may open an existing matching order | Web must stop routing non-creator/no-order to `/order/new`; backend remains final authority |
| Quote expiry | expiry refreshes the listing and requires a second explicit click | retain `ORDERING_QUOTE_EXPIRED` rather than silently retrying |
| Unpaid obligation | positive unsettled charge in an open payment window blocks creation for every intended participant | retain Bill-owned pre-create eligibility; do not move it to Web |
| PR/Offer invariant | at most one non-terminal order per `(prId, offerId)` | make the existing rule concurrency-safe at the PR owner boundary |

## Decisions Needed From Sir

| Decision | Options | Recommendation | Why it matters |
| --- | --- | --- | --- |
| Rental scope | runtime clean cut-off; retain order/payment without fulfillment; or a read-only placeholder | **Selected: runtime clean cut-off.** No production Rental order exists; schema/migration deletion remains separate. | retaining order/payment after fulfillment ends creates an unsafe paid-without-service path; `5-2` can remain RideHailing-focused |
| Quote reuse | retain reusable freshness/authorization quote; or consume/reserve it after successful create | **Selected: retain current reusable quote.** Idempotency belongs to the create attempt, not the quote. | consuming a quote changes the existing pricing/refresh model and needs new reservation UX |
| provider create response is unknown | return a retryable failure; or present a durable “processing” outcome until reconciliation resolves it | **Selected: durable processing, never blind retry.** | an accepted provider create with a lost response can otherwise produce duplicate rides |

## Architecture Decisions I Will Make

| Topic | Chosen direction | Low-cost proof |
| --- | --- | --- |
| Placement entry | backend returns an explicit entry outcome; Web routes only from that outcome; existing active order remains readable to any active participant | creator/no-order, non-creator/existing, non-creator/no-order browser cases |
| PR/Offer concurrency | lock the PR owner row inside the attachment transaction, recheck active matching orders, then append; no duplicate `prId` column or generic association table | two concurrent creates yield one attached order and one controlled conflict/return |
| request idempotency | authenticated `Idempotency-Key`, bound to a canonical command fingerprint and durable result; same key/different input is a conflict | repeat same key creates one local/provider order; conflicting replay is 409 |
| key retention | retain completed create attempts for seven days; an active PR order remains discoverable after that | replay within window returns original outcome; later entry finds existing order |
| public order scope | public customer create remains PR-scoped; direct non-PR helpers stay test/admin-only | controller rejects absent `prId`; existing user flows remain PR entry based |
| unpaid ownership | Trade calls a Bill category eligibility query instead of Bill service/repository internals | existing unpaid/expired browser and backend scenarios remain green |
| unknown provider outcome | persist an attempt/correlation and expose a durable processing state; only callback, later authoritative reconciliation, or support resolution may complete it | accept-then-timeout never sends a second provider create; no automatic retry is introduced |

## External Capability Gate

The RideHailing port currently has deterministic external order identifiers but no query-by-external-id capability.
That does **not** block the selected safe UX: persist the attempt, show processing, and never send a second create.
It does block automatic reconciliation if no callback arrives. A provider-idempotent create or authoritative lookup
by external id is therefore a future automation capability gate, not a reason to replace the durable processing
state with a retryable failure.
