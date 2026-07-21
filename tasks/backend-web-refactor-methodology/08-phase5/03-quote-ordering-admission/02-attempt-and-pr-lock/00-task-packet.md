# 5-2.2 Create Attempt And PR Lock

## Objective

Make retry and concurrent submission safe while keeping PR as attachment authority.

## Scope

- durable idempotency record for an authenticated create attempt;
- command fingerprint conflict handling and result replay;
- PR-row serialization for the one active `(prId, offerId)` invariant.

## Rehearsal And Proof

Two same-key requests return the same outcome. A changed payload under that key conflicts. Two concurrent valid
attempts for one PR/Offer produce one active order and no orphan/provider duplicate. Verify with a real database and
a deterministic fake provider.

## Gate

Consumes the selected Quote reuse rule. It must not use quote identity itself as an idempotency key.

## Implementation Log — 2026-07-20

Status: implemented and directly rehearsed.

- Added `create_order_attempts` as the authenticated command-claim and replay record. The unique key is
  `(actor_user_id, idempotency_key)`; Quote ids remain part of the canonical command fingerprint, not the key.
- A replay with the same fingerprint returns the stored terminal result or the same durable `PROCESSING` result.
  Reusing the key with a different fingerprint returns `409 IDEMPOTENCY_KEY_REUSED`.
- Ride order and RideHailing initiating row are created before PR attachment; the PR command locks/revalidates and
  appends before the Attempt `pr_id` FK write. This prevents the PR parent-row key-share/`FOR UPDATE` deadlock found
  by the full scenario suite. Provider I/O runs after that transaction and is never executed while holding the PR
  row lock.
- `attachOrderToPr` locks the PR row with `FOR UPDATE`, then rechecks PR status, creator participation, and the active
  `(prId, offerId)` order invariant before appending the order id.
- The Web create-order adapter sends the required `Idempotency-Key`; Ordering retains one UUID for retries of the
  same command and clears it when command input changes or a definitive response is received.

Direct proof:

- `commerce_create_order_attempt_replays_unknown_outcome_without_second_provider_create` proves exact same-key
  replay and changed-payload conflict against a real database.
- `commerce_create_order_pr_lock_allows_one_provider_create_under_race` runs two different-key submissions
  concurrently and proves one active PR order, one provider create, and one `409` loser; the same-key companion
  scenario proves durable replay without a second provider request.
- `create-order-idempotency.test.ts` covers fingerprint normalization, processing replay, terminal replay, changed
  payload rejection, and expired terminal replay behavior.

Verification run:

- passed: backend typecheck; fake CaoCao typecheck; focused backend unit (`44/44`); fake CaoCao unit (`25/25`);
  focused backend scenario (`3/3`); database migration lint; Drizzle schema check; scoped format; `git diff --check`.
- shared-worktree Web typecheck is blocked outside this subtask by the concurrent 5-5 read-model work in
  `RideHailingOrderContent.vue`: lines 667/675/698 narrow provider observation to `never` before reading
  `navigationRoute`/`phase`.
- scoped lint reaches this implementation but is blocked by the concurrent Rental runtime-retirement edit in
  `create-order.ts`: `validateRentalQuoteContext`, `resolveRentalSelectionFromQuote`, and
  `createRentalOrderBranch` are now unused. They were deliberately not removed by 5-2.2/5-2.3.
