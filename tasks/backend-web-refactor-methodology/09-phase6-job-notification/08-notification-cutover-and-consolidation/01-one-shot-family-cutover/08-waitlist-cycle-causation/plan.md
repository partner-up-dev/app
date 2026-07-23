# `6-3.1c-1` Plan

1. Allocate the next global schema migration prefix, add nullable
   `partners.waitlist_cycle_id`, backfill current `PENDING` rows, and add the
   partial uniqueness guard. Reflect the column in the Partner entity.
2. Make only pending-entry transitions allocate a fresh UUID. Preserve it on
   promotion, clear it on direct active reactivation, and replace it for every
   later waitlist entry.
3. Extend the typed generic waitlist payload/context with
   `waitlistCycleId`. New PR source always supplies it; the private durable v1
   decoder still parses an old generic task without it only so dispatch can
   terminally safe-skip it.
4. Include cycle identity in Notification's private causal key and make the PR
   dispatch projection require the active slot's matching cycle for new tasks.
5. Add the same-slot re-entry scenario, a stale-vs-current dispatch proof and
   a JobRunner v1 decoder proof; then run migration checks, focused owner
   tests, backend checks and scenarios.

## Cheapest Credible Proof

Use the existing same-slot reuse path rather than a fake slot: promote once,
exit, re-enter the waitlist, promote again, and assert two causal Jobs with
different cycle IDs. Resolve the old task against the current row and assert a
skip before the channel receives it. Separately feed a pre-cycle generic v1
payload through JobRunner's registered durable schema and prove it becomes a
safe terminal skip instead of `INVALID_PAYLOAD`.
