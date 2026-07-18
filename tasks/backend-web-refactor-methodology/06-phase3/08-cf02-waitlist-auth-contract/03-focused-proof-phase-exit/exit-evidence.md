# 08C Exit Evidence

## Contract proof

- The real Hono waitlist scenario now proves a successful body is a public PR projection with expected waitlist
  fields, omits own `auth`, `accessToken`, `role` and `userId` fields, and carries a non-empty
  `x-access-token` response header. The test checks header existence only and never records a token value.
- A generic Web `authFetch` unit test proves any RPC response carrying `x-access-token` updates shared session
  storage. It contains no waitlist-specific parser or OAuth behavior.
- The existing Browser waitlist promotion journey remains unchanged and passes, so the contract correction did not
  change gate, success-prompt, notification or promotion behavior.

## Commands and outcomes

```text
pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario \
  apps/backend/tests/pr/pr-waitlist.scenario.test.ts
PASS — 1 file, 5 tests

pnpm exec vitest run --project frontend-unit apps/web/src/lib/rpc.test.ts
PASS — 1 file, 1 test

pnpm exec vitest run --project system-scenario \
  tests/scenario/pr/pr-detail-participation.scenario.test.ts \
  -t 'pr_detail_waitlist_promotes_after_active_participant_exit'
PASS — 1 selected test, 5 skipped

pnpm check:lint:backend
PASS — Oxlint + Backend structure scan

pnpm check:lint:web
PASS — Web Oxlint/token checks; naming audit remains report-only with 2 pre-existing findings

pnpm check:type:backend && pnpm check:type:web
PASS

pnpm check:build:backend && pnpm check:build:web
PASS

pnpm test:scenario:all
PASS — Backend 22 files / 82 tests; System project completed successfully

node tools/architecture-fitness/cli.mjs \
  --baseline tasks/backend-web-refactor-methodology/06-phase3/01-baseline-and-fitness/architecture-fitness-baseline.json \
  --check-new --format text
PASS — 37 known, 0 new

git diff --check
PASS
```

The final Backend lint pass includes a small test-only correction to 07C's DRAFT-policy assertion structure; its
12 focused tests remain green. No production behavior, schema, provider, auth-channel or typed HTTP contract changed
in 08C.
