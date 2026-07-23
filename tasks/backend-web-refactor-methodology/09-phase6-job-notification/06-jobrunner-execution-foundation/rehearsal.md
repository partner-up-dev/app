# `6-1` Mental Rehearsal

## Expected Branches

1. **Two producers schedule a fresh held key concurrently.** One inserts; the
   other observes/coalesces the HELD row. Exactly one Job generation exists.
2. **Two later messages coalesce.** Both updates are monotonic; high-water ends
   at the maximum cursor, never the last writer's smaller value.
3. **Stale ACK races a new message.** If scheduling wins, ACK sees raised
   high-water and cannot release. If ACK wins, the later schedule creates a new
   generation.
4. **Execution finishes before ACK.** Job becomes generic terminal while the
   reservation remains HELD; later schedules still coalesce and retention does
   not delete it.
5. **ACK arrives before due execution.** It releases the reservation and
   terminally cancels/skips pending work. A new later message may create a new
   generation.
6. **ACK arrives while handler is running.** The handler rechecks immediately
   before its provider edge. If the external call already started, no false
   exactly-once/cancellation claim is made.
7. **Old handler completes after lease recovery and a new claim.** Its stale
   lease token matches no current `RUNNING` claim, so its completion updates
   zero rows and cannot overwrite the new attempt.
8. **Handler process dies after provider acceptance.** Lease recovery invokes
   the definition again only after its semantic owner determines whether the
   effect is safe; Job itself does not label provider uncertainty.
9. **Telemetry backend fails.** Job control still commits once and no extra
   retry is created solely to recover telemetry.
10. **Legacy Job exists during rollout.** The old type remains registered or is
   decoded through a compatibility definition; it is never failed merely
   because the new generic contract shipped.
11. **Owner generation is scheduled after an old Job is terminal.**
    `ONCE_PER_CAUSE` returns the original Job and cannot create a second task.
12. **ACK cancels before invocation.** The Job becomes `CANCELED`; it is not
    deleted and no synthetic `SKIPPED` attempt is emitted.
13. **Message cursor becomes visible.** The owner transaction has already
    inserted/coalesced the HELD high-water. If this cannot be guaranteed, PR
    integration stops rather than relying on the partial index alone.

## Likely Implementation Traps

- Reusing active-only dedupe instead of a reservation independent of execution.
- Reusing active-only dedupe for terminal-safe owner causation.
- Deleting terminal HELD rows through ordinary retention.
- Updating completion by Job ID without a lease token.
- Performing handler I/O inside the claim transaction.
- Treating `SKIPPED` as sent/delivered.
- Encoding business retry rules in Job type switches.
- Emitting O11y both in handler and runner and double-counting attempts.
- Using a non-monotonic read-then-write for high-water.

## Chosen Default

Keep schema and API additive, keep legacy handlers live until `6-3.3`,
serialize reservation mutations in Postgres, fence claims with a unique token,
and add no console/stdout attempt sink. Do not broaden the slice to
Notification callers or future O11y infrastructure.
