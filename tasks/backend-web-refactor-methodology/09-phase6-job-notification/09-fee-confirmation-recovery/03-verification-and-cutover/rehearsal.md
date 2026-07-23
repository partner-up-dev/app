# `6-4d` Mental Rehearsal

- A paid settlement commits without a Job under failure injection: this is a
  blocker; the handoff transaction is incomplete.
- An all-zero Bill has no Job: this is a blocker; creation-time settlement must
  share the invariant.
- A duplicate callback creates a second Job: fix the causal key/transaction,
  not the provider adapter.
- A historic settled row gains a Job during migration: remove the backfill; the
  accepted cut-over is forward-only.
- A test expects `UNKNOWN` or operator recovery: delete the obsolete state
  model rather than preserving accidental complexity.
