# Phase 5 Decision Brief

## Decisions I Can Make as Architecture Choices

1. **Start with `5-1`, a calibration slice.** Its deliverable is an owner/idempotency matrix plus an exact
   compatibility ledger. It does not reorganize business behavior merely to improve directory shape.
2. **Keep the canonical Payment attempt as a tuple with projections.** The durable identity is
   `(kind, billLineId, paymentProviderInstanceId, attemptCount)`. A backend resource identifier and a
   provider-constrained merchant reference are two codecs for that one attempt, not two business identities.
   This avoids forcing an unsafe single token or restoring persisted `PaymentTx` state just for a codec.
3. **Treat the current `/api/commerce/bill-lines/:billLineId` checkout-target route as a transport-family question,
   not proof that Bill does not own the read.** Any cutover must first establish a Bill-owned projection and its
   Web adapter; it must not rename URLs as a substitute for an authority change.

## Decisions Requiring Product Direction

### D1 — Non-creator Placement entry

**Ratified, not source-realized.** Only the creator receives a new-order CTA; other active participants may open an
already-created PR order but never enter `/order/new` for a new one. The source work is deliberately deferred in
`5-2`; its remaining gates are create-attempt idempotency, concurrent PR/Offer uniqueness, and a bounded cutover
plan rather than another product-direction decision.

### D2 — Checkout return and retry journey

**Ratified and source-realized by 5-3.** The PRD and ecommerce contract now
record the same-session recovery boundary; focused fake-provider and browser
proof are linked from the 5-3 packet.

Rule: **Bill Detail → Checkout → payment client → backend reconciliation; success returns to the Bill;
closed/failed/unknown client return remains on Checkout with an explicit retry affordance; no client callback itself
settles a bill.**

### D3 — RideHailing final-settlement correction

**Pending product direction; intentionally not source-realized in Phase 5.** Phase 5 will not rewrite a settled
historical Bill and will expose only a correction-required result when a later provider fare disagrees with the
committed final settlement. The recommended default is to defer compensating Bill adjustment/refund until its
identity, allocation/refund behavior, customer communication, and recovery model are separately authorised. This
corrects an earlier packet statement that incorrectly called a compensating-flow policy ratified.

## Non-decision Evidence Requests

`5-7` will separately need staging/provider evidence for WeChatPay notify and the CaoCao callback edge. It is not a
choice about source design and should not block local `5-1`–`5-6` planning.
