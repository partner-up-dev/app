# 07E.1 Exit Evidence

This evidence closes CF-01 in the current worktree. It does not widen the authenticated-first policy into a general
OAuth/session redesign or a historical DRAFT cleanup program.

## Behavior proof

- `USER` creation rejects missing/anonymous/non-authenticated identities before root, slot, materialization, or
  operation-log writes. An authenticated user owns the normal created PR; the explicitly named `SYSTEM` expansion
  authority remains the only creatorless exception.
- WeCom uses no sender/open-id as a PR creator identity. An unmapped message has no success URL and no persistence.
- Legacy DRAFTs are opaque to anonymous, creatorless, cross-user, participant, public-share and public-LLM surfaces;
  an authenticated owner may use the bounded owner read/content/publish seams, while explicit admin routes retain
  their declared authority.
- The LLM controller test replaces the provider and proves a rejected public PR read prevents provider invocation.
  It makes no real AI request. Together with `getPR`'s policy-before-projection call and the policy/scenario matrix,
  this covers the public provider chain.
- Browser A shows an explicit disclosure before a create mutation, waits 250 ms before its zero-POST assertion,
  retains form state on cancel, and contains no durable create replay. The same System file proves normal authenticated
  creation separately.

## Commands and outcomes

```text
pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit \
  apps/backend/src/domains/pr/commands/create-pr-structured.test.ts \
  apps/backend/src/controllers/wecom.controller.test.ts \
  apps/backend/src/domains/pr/services/draft-access-policy.service.test.ts \
  apps/backend/src/domains/pr/services/join-gates.service.test.ts \
  apps/backend/src/domains/pr/services/pr-read.service.test.ts \
  apps/backend/src/controllers/llm.controller.test.ts
PASS — 6 files, 27 tests

pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario \
  apps/backend/tests/pr/pr-create.scenario.test.ts \
  apps/backend/tests/pr/pr-draft.scenario.test.ts \
  apps/backend/tests/pr/pr-join-gates.scenario.test.ts \
  apps/backend/tests/pr/pr-admin.scenario.test.ts \
  apps/backend/tests/pr/pr-route.scenario.test.ts
PASS — 5 files, 21 tests

pnpm exec vitest run --project frontend-unit \
  apps/web/src/domains/pr/use-cases/usePRCreateAuthGate.test.ts \
  apps/web/src/processes/wechat/pending-wechat-action.test.ts \
  apps/web/src/processes/wechat/oauth-login.test.ts \
  apps/web/src/shared/api/auth-required-policy.test.ts \
  apps/web/src/domains/pr/ui/PRDiscoveryPanel.test.ts
PASS — 5 files, 9 tests

pnpm exec vitest run --project system-scenario tests/scenario/pr/pr-create.scenario.test.ts
PASS — 1 file, 3 tests

pnpm check:type:backend && pnpm check:type:web
PASS

pnpm check:build:backend && pnpm check:build:web
PASS

pnpm test:scenario:all
PASS — Backend 22 files / 81 tests; System project completed successfully

node tools/architecture-fitness/cli.mjs \
  --baseline tasks/backend-web-refactor-methodology/06-phase3/01-baseline-and-fitness/architecture-fitness-baseline.json \
  --check-new --format text
PASS — 37 known, 0 new

git diff --check
PASS

pnpm exec oxfmt --check apps/backend/src/controllers/llm.controller.test.ts \
  apps/web/src/domains/pr/use-cases/usePRCreateAuthGate.ts \
  apps/web/src/domains/pr/ui/sections/PRCreateAuthDisclosure.vue \
  tests/scenario/pr/pr-create.scenario.test.ts
PASS
```

## Deliberately unchanged

- Failed authenticated-create DRAFT residue remains characterization/cleanup work; no root/child deletion, recovery
  UX, transaction redesign or historical-data mutation was added.
- No provider was invoked, no OAuth callback/transport changed, and no body-based auth protocol was introduced.
- Waitlist response semantics remain for CF-02 / 3-8.
