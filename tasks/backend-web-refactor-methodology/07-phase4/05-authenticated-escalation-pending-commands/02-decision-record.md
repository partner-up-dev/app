# 4-4 Decision Record

## D1 — Transport Reports; Process Escalates

`lib/rpc` will expose a response-reporting registration seam rather than importing an OAuth process. `AppRoot` wires
the browser process to that seam. The process may schedule a response-bound fallback for existing protected commands
that have no command-owned continuation. This breaks the static SCC while preserving current compatible escalation.

## D2 — A Command Claims Its Own Response Only After Persisting Intent

For the five named PR continuations, command code first writes the typed action and then invokes the process helper
with the actual `Response`. The helper claims/cancels that response's delayed fallback and begins the same OAuth
single-flight. A fallback with no claim begins OAuth without pretending there is replay state.

## D3 — At-Most-Once Continuation Delivery

Preserve and name current clear-before-handler semantics. Requeue/retry is rejected for this slice: `EXIT` and
`PUBLISH` have non-idempotent or state-sensitive effects, and a hidden retry would be more surprising than an
explicit fresh user action. This is not a server-side exactly-once claim.

## D4 — Exact Pending Set And Waitlist Payload

`PR_JOIN`, `PR_WAITLIST`, `PR_EXIT`, `PR_CONFIRM`, and `PR_PUBLISH` remain the only replayable kinds. `PR_CREATE`,
cancel waitlist, check-in, content/status mutation, join-gate resolution, messaging, feedback, POI, Commerce, and
other protected commands retain fallback OAuth with **no** automatic continuation. `PR_WAITLIST` records the
boolean alternative-reminder choice so its resumed gate preserves the user's input, but it does not resubmit the
write without renewed UI flow.

## D5 — Proof Scope

Attempt one mocked OAuth/handoff Browser-to-Backend journey for a named PR continuation. It can prove local
ordering and continuation only; it neither replaces nor closes the externally evidenced 4-3.4 topology branch. If
the harness cannot faithfully carry its own browser cookie path, stop at the strongest lower-level proof and record
the precise topology limitation instead of rewriting hosts or forging cookies.
