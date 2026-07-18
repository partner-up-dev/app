# 4-2.3 Rehearsal

- The initial bootstrap must settle before storage is sampled; otherwise the test waits on a semantic storage
  predicate rather than a fixed delay.
- A reload is required after token removal so Pinia does not retain old in-memory state.
- The scenario must not assume a particular JWT value, only a non-empty replacement token and expected UUID
  continuity/discontinuity.
- If unrelated home-page side effects obscure the path, use a lightweight ordinary route rather than stubbing the
  auth process.

## Observed Outcome

The semantic storage wait settled without a fixed delay. Token removal plus reload retained the initial UUID; after
the row was disabled, the same operation produced a different UUID and a non-empty new token.
