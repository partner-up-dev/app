# 07B exit evidence — Backend Create Guard + WeCom

Captured 2026-07-17 after the owned implementation batch. Existing unrelated Phase 3 worktree changes were left
untouched.

## Implemented contract

- `createPRFromStructured` resolves one canonical creation guard before type/POI policy reads and before the PR root,
  slot, materialization, or operation-log side effects.
- Default `USER` creation requires an ACTIVE user with the `authenticated` role. `authenticatedUserId` is authoritative
  when present; an invalid id never falls back to `oauthOpenId`. `anonymousUserId` is ignored for ownership. OAuth-only
  identities use the existing OAuth resolver and still require an ACTIVE authenticated role.
- Explicit `ADMIN` continues to use the prior active-actor/null compatibility behavior. Explicit `SYSTEM` remains
  creatorless and can create `OPEN` capacity-expansion PRs.
- WeCom keeps its immediate empty `200` acknowledgement. Its unmapped text ingress supplies an all-null identity to
  the canonical NL/structured path; `AUTHENTICATED_REQUIRED` sends one truthful non-success reply to `FromUserName`
  and never reads `FRONTEND_URL` or emits a success URL. `FromUserName` is not used as an OAuth/openId or owner.

## Commands and results

```text
pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit \
  apps/backend/src/domains/pr/commands/create-pr-structured.test.ts \
  apps/backend/src/controllers/wecom.controller.test.ts
# PASS — 2 files, 8 tests

pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario \
  apps/backend/tests/pr/pr-create.scenario.test.ts \
  apps/backend/tests/pr/pr-admin.scenario.test.ts
# PASS — 2 files, 6 tests

pnpm check:type:backend
# PASS — tsc --noEmit

pnpm check:build:backend
# PASS — backend bundle and db-migrate-fc bundle built successfully
```

The focused unit proof covers G1/G2/G3/G6/G9 and W3/W4. Backend scenarios cover W1/W2 and G7. Full System proof and
legacy draft ownership/failed-create cleanup remain outside 07B.
