# 5-2.2 Implementation Design — CreateOrderAttempt And PR Lock

## Owner Model

`TradeOrder` remains the durable buyer/PR/fulfillment contract. A new Trade-owned `CreateOrderAttempt` is its 1:1
command-execution companion: it owns authenticated idempotency, provider-create claim, correlation, replay, and
unknown-outcome recovery. It must not redefine `OrderStatus` or become a second contract/order lifecycle.

## Minimal Durable Shape

The planned row holds `actorUserId`, `idempotencyKey`, versioned command fingerprint, `prId`, `offerId`, `orderId`,
provider instance/external/provider IDs, dispatch submission snapshot, attempt state, replay result/status, provider
request timestamp, completion timestamp, and replay expiry.

Required constraints:

- unique `(actorUserId, idempotencyKey)`;
- unique `orderId`;
- unique `(providerInstanceId, externalOrderId)`;
- provider-scoped unique `providerOrderId` when non-null.

Migration numbering is allocated only by `pnpm db:next-migration drizzle`; no hand-guessed sequence number.

## State And HTTP Projection

```text
PREPARED -> SUBMITTING -> SUCCEEDED
                       \-> FAILED     (known provider business rejection only)
```

`PREPARED` and `SUBMITTING` project as public `PROCESSING`. A network timeout, transport error, HTTP 5xx, or malformed
success result does not become `FAILED`: it remains `SUBMITTING` and is never blindly resent. Terminal replay is a
seven-day SLA; a processing attempt does not expire.

## Execution Sequence

1. Validate authenticated request and canonicalize a versioned command fingerprint.
2. **T1, short transaction:** create local `INITIATING` Trade/Ride foundation; lock the PR row; revalidate PR
   status, creator, active participant, and active `(prId, offerId)` order; append the PR order; then create the
   Attempt and commit. The Attempt's `pr_id` FK is deliberately written only after the PR `FOR UPDATE` lock, so two
   different keys cannot deadlock through competing parent key-share locks.
3. CAS `PREPARED -> SUBMITTING`; only its winner invokes the provider outside a database transaction.
4. **T2, short transaction:** known provider success stores dispatch binding, opens Order/Ride, and marks attempt
   `SUCCEEDED`; known business rejection marks Order/Ride failed/cancelled and attempt `FAILED`.
5. Unknown result remains `SUBMITTING` and returns/replays `202 PROCESSING`.

For one PR/Offer the lock order is local Trade/Ride foundation, then PR row, then Attempt `pr_id` write. A same-key
loser that reaches the now-active PR re-reads the committed Attempt and replays it; a different-key loser keeps the
PR-owned typed conflict. Provider network I/O is never performed while holding the PR lock or a database transaction.

## Replay Contract

| Input | Response |
| --- | --- |
| same key + same fingerprint + terminal result within seven days | original status/body |
| same key + same fingerprint + `PREPARED`/`SUBMITTING` | `202 PROCESSING`, same attempt/order, no provider call |
| same key + different fingerprint | `409 IDEMPOTENCY_KEY_REUSED` |
| expired terminal key | controlled `409 IDEMPOTENCY_KEY_EXPIRED`; never silently execute a new command |

Quote IDs are never idempotency keys. The Web creates a UUID for one explicit click and reuses it only for transport
replay/resume of that click.

## Low-Cost Proof

- same-key concurrency creates one Order and makes one provider request;
- same key/different payload is `409`;
- different keys for one PR/Offer serialize through PR lock into one active order and one controlled conflict;
- accept-then-response-loss is `202 PROCESSING` and repeated POST makes no second provider call;
- known rejection replays without a second provider call; a fresh key is required for a new attempt.
