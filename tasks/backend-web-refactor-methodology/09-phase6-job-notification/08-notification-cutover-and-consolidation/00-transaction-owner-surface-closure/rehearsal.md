# `6-3.1h` Rehearsal

- A factory that creates a writer with a different database executor breaks
  atomicity. Every public factory must receive the actual transaction executor
  from the source's named transaction; its internal writer is then bound to
  that same object.
- Do not replace typed source ports with `requestNotification` runtime calls:
  those would start/observe a different transaction and lose the source
  rollback guarantee.
- Waitlist promotion currently uses two Notification ports in one source
  transaction. Both must receive the same executor and must not share a
  source-visible writer variable.
- Some existing scenario tests inject a custom factory to simulate channel
  configuration or a thrown handoff. Preserve that injection at the semantic
  port level; only the writer construction moves inward.
- The final reverse-edge audit must include POI and admin PR-type coordination,
  not only `domains/pr`; otherwise the leak merely moves from one source to
  another.
