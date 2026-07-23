# `6-3.2a` Rehearsal

- Any recipient write failure rolls back the author message; logging a partial
  failure would recreate the old split brain.
- The durable task remains the existing semantic `{ prId }` template payload.
  The immutable `windowStartCursor` is generic Job-reservation state and is
  passed through the claimed execution context; this avoids duplicating Job
  lifecycle state inside a business payload while still letting dispatch
  recompute only this window's content.
- Notification derives the private stable `PR / recipient` creation key,
  fixed five-minute `runAt`, and source-time eligibility. PR supplies only a
  locked active roster plus message facts and never reads provider config or
  Job keys.
- Missing PR-message channel configuration, inactive/OpenID-less recipients,
  or absent preference/credit create no held reservation. The availability
  check belongs to Notification's channel port, not a new PR → infra edge.
- A new message path writes no inbox, wave, opportunity, or Delivery row.
  The existing response shape may use a synthetic immediate thread projection
  during overlap; it must not persist a new inbox marker.
- An ACK that wins before handler invocation causes final reservation recheck
  to skip; an already-started provider call is not falsely described as
  exactly-once cancellation.
- A content edit's generated system message uses the same atomic message
  transaction after the pre-existing content transaction commits. Widening it
  into a generic cross-owner transaction is out of scope.
