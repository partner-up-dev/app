# `7-4C` — Analytics API And Query Convergence

## Status

**Complete on 2026-07-23.** Sir ratified the 31-day maximum. All four
endpoints now use the shared offset-aware, half-open range resolver; invalid,
equal/reversed, and over-limit ranges return Problem Details. The lifecycle
projection treats ISO values as `timestamptz`.

## Objective

Give all Analytics reads one temporal boundary and reduce repeated
in-memory/query complexity without changing metric meaning.

## Concrete Work

1. Replace the endpoint-specific schemas with one offset-aware instant-range
   schema used by Overview, Create, Join and Discovery.
2. Return 4xx Problem Details for invalid offsets, equal/reversed ranges and
   an approved over-limit range.
3. Preserve half-open SQL intervals.
4. Reconcile missing-parameter defaults so Backend and Web behavior is
   deliberate, not an accidental seven-day/thirty-day mismatch.
5. Correct PR lifecycle timestamp handling so ISO instants are never
   reinterpreted as server-local `timestamp without time zone`.
6. Keep lifecycle/state metrics on authoritative business tables.
7. Evaluate fact readers one at a time for SQL filtering/grouping:
   - first Discovery;
   - then Create/Join if the same pattern is clearer;
   - Retention only if its cohort/lookahead semantics stay explicit.
8. Preserve pure response composition where it makes formulas easier to test.
9. Record query-plan and output-parity evidence for every aggregation moved.

## Settled Range

Interactive maximum: 31 days. An unbounded row-loading endpoint is outside the
target.

## Exit

- one shared request contract;
- consistent 4xx behavior;
- explicit timezone/half-open semantics;
- no changed metric formula;
- every aggregation change has parity and plan evidence; and
- unclear optimization remains deferred rather than forced.

See [`rehearsal.md`](./rehearsal.md).
