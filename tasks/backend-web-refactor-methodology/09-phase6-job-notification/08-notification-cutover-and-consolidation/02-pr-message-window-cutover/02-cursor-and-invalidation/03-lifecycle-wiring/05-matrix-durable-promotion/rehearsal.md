# `6-3.2b-3.5` Rehearsal

- A green full suite cannot substitute for an assertion that a removed user is
  the only released recipient or that re-enable does not replay history.
- An import audit cannot prove runtime behavior; retain the real-Postgres
  matrix as the behavioural authority.
- Durable docs must not advertise legacy concrete handler retirement before
  `6-3.3` proves it.
- A generic `43101` result is not a controller event. The proof must execute
  the generic owner with a revocation channel result and observe the actual
  option row plus held Job release; mocking only the controller would miss the
  runtime adapter.
- The held Job can remain after root cascade because it intentionally has no
  PR foreign key. The assertion is its `CANCELED + RELEASED` state, not row
  disappearance.
- If an audit finds an old wave/opportunity/inbox writer on a retained legacy
  drain path, record its caller boundary. Do not delete it in this slice; if a
  *new* lifecycle entrance reaches it, stop and repair that production edge.
