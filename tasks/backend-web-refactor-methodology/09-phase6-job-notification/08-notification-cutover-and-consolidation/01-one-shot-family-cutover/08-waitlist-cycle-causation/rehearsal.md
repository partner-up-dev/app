# `6-3.1c-1` Rehearsal

- A PENDING row created before deployment receives a backfilled UUID. A generic
  Job created before the source cutover still lacks the payload field and is
  decodable only to terminally safe-skip; there is no fallback active-row send
  path that could confuse an old cycle with a later slot lifecycle.
- A first promotion preserves the cycle on the active slot. Exiting alone does
  not make an old task valid; direct reactivation clears the stale cycle and a
  later waitlist entry replaces it.
- A Job payload with no cycle id is an old compatibility payload, not malformed
  input; it must terminate as `LEGACY_WAITLIST_CYCLE_UNVERIFIABLE`. A newly
  written PR promotion with no cycle id is a stop condition.
- The task key must include the cycle/cause, otherwise the Job store's permanent
  `ONCE_PER_CAUSE` uniqueness still suppresses the second event.
- Dispatch compares the payload identity with current PR-owned slot state;
  channel I/O occurs only after that comparison. Do not attempt to infer a
  generation from provider delivery rows or a timestamp.
- The old per-kind waitlist-promoted handler has a different durable payload.
  Do not retroactively add a cycle requirement to it or count its drain as
  evidence that generic v1 compatibility is safe.
