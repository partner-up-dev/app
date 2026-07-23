# `7-4B` Rehearsal

1. Generate the migration prefix rather than trusting the packet's current
   `0095` expectation.
2. Copy the deterministic context semantics from the latest forward fact
   definition, not from an older pre-correction migration.
3. Restrict by exact event name and version before extracting fields.
4. Guard positive integer text before `bigint`/`integer` casts; malformed
   historical values become null.
5. Derive `step_key` with an exhaustive event-name `CASE`.
6. Insert route/auth events both before and after the behavior event; prove the
   future context is never borrowed.
7. Insert same-time context rows with controlled UUID/event ordering; prove
   the tie-break.
8. Compare response objects from one fixture before changing the production
   reader.
9. Insert all Registry event names into the migration scenario and assert only
   the six intended names appear in the view; this catches SQL/TypeScript
   allowlist drift without inventing a second production catalog.
10. Change query/entity/model in one coherent pass, then run the narrow unit
   and Postgres gates.
11. Remove temporary test-only compatibility helpers only after parity remains
    expressible by the frozen fixture.

If malformed rows cannot be represented because ingest rejects them, insert
them directly in the migration fixture: the purpose is historical-data
robustness, not ingest behavior.
