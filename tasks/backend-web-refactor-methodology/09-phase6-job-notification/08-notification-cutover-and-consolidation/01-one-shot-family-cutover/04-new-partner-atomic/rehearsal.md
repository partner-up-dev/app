# `6-3.1d` Rehearsal

- Reconstructing recipients after commit can notify a participant who was not
  present at the original join. Read the active roster after the slot write in
  the same serializable transaction, exclude the entrant, de-duplicate user
  IDs, and let Notification filter current active-user/OpenID/credit facts in
  that same transaction.
- A reusable Partner row is not an event identity. Direct reactivation and
  waitlist promotion each generate a durable `admissionCycleId`; it stays on
  the row through exit/release, is replaced only by a later active admission,
  and fences delayed dispatch as well as once-per-cause creation.
- Capture `joinedAtIso` once for an admission operation, outside a retrying
  transaction callback. A serializable retry may regenerate an uncommitted
  cycle, but it must leave neither that cycle's source write nor its Jobs.
- The named Notification port may create several recipient Jobs inside the
  PR-owned transaction, but it accepts no Job type, timing, provider or
  dedupe input from PR. Any per-recipient writer failure aborts the whole
  admission; a retry only sees the final committed recipient set.
- Source-time preference/credit decides whether a task exists, preserving the
  current subscription semantics. Dispatch rechecks preference/credit,
  recipient membership and the original admission cycle before provider I/O;
  it must not treat that later check as a substitute for atomic fan-out.
- A generic accepted send consumes only a limited-channel credit. It must not
  silently erase the preference fact merely because that credit reached zero;
  known recipient permission revocation remains the explicit path that clears
  both facts. The legacy handler retains its historical behavior only while it
  drains old rows.
- The generic task must render the existing New-Partner provider template
  without retaining a delivery/opportunity record. The legacy handler and its
  cancellation path are a compatibility drain only.
