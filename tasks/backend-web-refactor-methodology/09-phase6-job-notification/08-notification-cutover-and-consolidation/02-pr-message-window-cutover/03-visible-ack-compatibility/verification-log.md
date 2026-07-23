# `6-3.2c` Aggregate Verification Log

## Target Path

- Backend owner unit: 1 file, 9 tests passed.
- Backend semantic-ACK scenario: 1 file, 1 test passed over real HTTP and
  Postgres, covering raw GET/read-marker isolation, stale/covering ACK,
  tombstone cursor and participant authorization.
- Web visible-ACK workflow unit: 1 file, 2 tests passed, covering hidden-state
  fence and exactly one same-cursor retry.
- Final Web → backend → Postgres browser scenario: 1 file, 1 test passed. It
  observes held → released/canceled → later held generation through the
  dedicated visible messages route.

## Changed-Surface Gates

- `pnpm check:type:backend`, `pnpm check:type:web`, `pnpm check:lint:backend`
  and `pnpm check:lint:web` passed.
- `pnpm test:unit:backend` passed: 108 files, 497 tests.
- `pnpm test:unit:web` passed: 65 files, 213 tests.
- `pnpm test:scenario:backend` passed: 44 files, 137 tests.
- `pnpm check:build` passed for backend, FC migration bundle and Web.
- `git diff --check` passed. Reverse audit found no legacy read-marker use in
  `apps/web/src` and no direct Job writer/repository mechanics in the PR domain
  or PR controller. The legacy backend route remains as the intentional
  `6-3.3` compatibility edge.

## Full System-Suite Boundary

`pnpm test:scenario:system` is not fully green: 10 files / 37 tests pass; one
Auth public-session bootstrap scenario fails and reproduces in isolation with
variable replacement-identity/token symptoms. It is outside this slice's files
and execution path. The target PR-message system scenario is green, so this is
recorded as a global baseline exception rather than silently waived or folded
into the ACK proof.

## Next Gate

`6-3.3` may now preflight legacy inbox/read-marker/opportunity/wave retirement,
but it needs production-shape/old-client inventory, historical concrete-row
drain and retention evidence before changing compatibility state or API.
