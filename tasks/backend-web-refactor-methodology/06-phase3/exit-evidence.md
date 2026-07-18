# Phase 3 Exit Evidence

## Exit result

All executable slices `3-1`–`3-8` are complete. Phase 3 established the owner/topology and contract surface,
retired the `pr-core` compatibility implementation, closed both declared conflict rows, and left later User/Auth,
Commerce, Job and Observability work explicitly deferred.

## Final conflict closures

- **CF-01 / 3-7:** ordinary USER PR persistence requires an active authenticated owner before any write; WeCom cannot
  mint identity; legacy DRAFTs are opaque outside their bounded owner/admin surfaces; Browser A does no pre-auth
  create/replay; a public provider call is short-circuited before external AI use.
- **CF-02 / 3-8:** waitlist returns the public PR body only; optional session rotation is the shared
  `x-access-token` header, consumed by generic Web RPC transport. Durable lifecycle wording and executable proof now
  agree.

## Final gates

```text
Focused CF-01 unit/scenario/Web/System matrices
PASS — recorded in 07-cf01-anonymous-pr-creation/05-verification/

Focused CF-02 Backend/Web/System matrices
PASS — Backend 1 file / 5 tests; Web 1 file / 1 test; selected System 1 pass / 5 skipped

pnpm check:lint:backend && pnpm check:lint:web
PASS — Web naming audit has 2 existing report-only findings

pnpm check:type:backend && pnpm check:type:web
PASS

pnpm check:build:backend && pnpm check:build:web
PASS

pnpm test:scenario:all
PASS — Backend 22 files / 82 tests; System project completed successfully

architecture fitness --check-new
PASS — 37 known / 0 new

git diff --check
PASS
```

## Deliberately not included

- No schema/data migration, historical DRAFT cleanup, general OAuth/session redesign, provider-side behavior change,
  Commerce/Job/Observability mutation, or broad all-repository formatting cleanup.
- Existing root package/lock/workspace and independent task-directory changes remain outside this phase's scope.
- No commit is made by this exit; commit selection remains Sir's explicit decision.
