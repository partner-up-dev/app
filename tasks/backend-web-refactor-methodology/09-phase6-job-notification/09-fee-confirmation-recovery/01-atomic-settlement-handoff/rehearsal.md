# `6-4b` Mental Rehearsal

- Job insert fails: exact settlement rolls back with it; no invisible missing
  task is accepted.
- Duplicate callback arrives after settlement: deterministic cause identity
  proves no second Job is created.
- A zero-charge Bill is created: its direct settlement path reaches the same
  handoff, without a synthetic payment callback.
- A provider call accidentally appears in this transaction: stop; provider I/O
  belongs only to `6-4c`.
