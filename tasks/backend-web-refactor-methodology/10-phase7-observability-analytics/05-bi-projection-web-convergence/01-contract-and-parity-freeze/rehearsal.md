# `7-4A` Rehearsal

1. Start with pure Backend model fixtures because they are the cheapest
   formula oracle.
2. Use fixed UTC instants and include events exactly at `startAt`, just before
   `endAt`, and exactly at `endAt`.
3. Deliberately create a later-step journey missing from an earlier step so
   the current conversion-above-100% behavior is frozen rather than “fixed”.
4. Add missing and malformed dimensions separately: missing should preserve
   current exclusion, malformed accepted-ledger data is exercised at the fact
   boundary in `7-4B`.
5. In Web tests, spy on all four endpoints while navigating each route; this
   detects accidental eager fetching during page decomposition.
6. Assert route/query/test-ID constants rather than large markup snapshots.
7. Verify `/bi` after successful login has neither the seed code nor a stale
   query object.

If characterization reveals nondeterministic ordering, normalize only the
test comparison first and record the production ambiguity. Do not silently
select a new metric order.
