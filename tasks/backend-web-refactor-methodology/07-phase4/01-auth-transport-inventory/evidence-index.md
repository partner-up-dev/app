# 4-0 Evidence Index

## Source / Contract Evidence

| ID | Evidence | Supports |
| --- | --- | --- |
| E-1 | `docs/10-prd/behavior/rules-and-invariants.md` | Anonymous browse/recovery, authenticated continuity and `/me` identity progression. |
| E-2 | `docs/20-product-tdd/cross-unit-contracts.md` | Bearer / `x-access-token` transport, Backend authority and Problem Details expectations. |
| E-3 | `docs/30-unit-tdd/wechat-oauth-handoff.md` | Nonce-only handoff, cookie scope, gate ordering, retry and visitor behavior. |
| E-4 | `apps/backend/src/auth/{types,jwt,middleware,admin-middleware}.ts`, `auth/anonymous-session.ts` | Role/JWT/request-auth/cookie boundaries. |
| E-5 | `apps/backend/src/controllers/{auth,wechat,user}.controller.ts`, `apps/backend/src/domains/user/` | Controller/domain lifecycle and callback authority split. |
| E-6 | `apps/web/src/lib/rpc.ts`, `shared/api/auth-required-policy.ts`, `processes/wechat/`, `shared/telemetry/track.ts` | Runtime SCC, browser ordering and continuity state. |
| E-7 | `tests/scenario/_infra/vitest/global-setup.ts`, `apps/backend/src/lib/wechat-ability-mocking.ts` | Provider-free future handoff scenario seam. |
| E-8 | `apps/backend/src/controllers/wechat.controller.ts` return-target helpers and `apps/backend/src/index.ts` CORS setup | P4-R1 return-path/CORS/handoff security inference. |

## Read-Only Commands And Results

| ID | Command / method | Result |
| --- | --- | --- |
| V-1 | Production Web import scan (409 files; cross-owner edge and SCC classification) | 610 cross-owner edges across 86 pairs; Auth has one five-file value SCC; separate two-file PR Discovery model SCC deferred. |
| V-2 | Focused frontend Vitest selection: RPC, auth-required, OAuth login/route, pending action, PR replay and telemetry | 7 files / 12 tests passed. |
| V-3 | `pnpm exec vitest run --project frontend-unit apps/web/src/lib/rpc.test.ts apps/web/src/shared/api/auth-required-policy.test.ts apps/web/src/processes/wechat/oauth-login.test.ts apps/web/src/processes/wechat/useRouteWeChatAutoLogin.test.ts apps/web/src/domains/pr/use-cases/usePRPendingWeChatReplay.test.ts` | 5 files / 8 tests passed. |
| V-4 | `pnpm exec vitest run --project backend-unit apps/backend/src/controllers/application-auth.test.ts` | 1 file / 1 test passed; limited to an unauthenticated Problem Details seam. |
| V-5 | `pnpm exec vitest run --project backend-scenario apps/backend/tests/pr/pr-draft.scenario.test.ts -t anonymous_uuid_restores_session` | 1 selected test passed; active anonymous UUID restoration. |
| V-6 | `pnpm exec vitest run --project system-scenario tests/scenario/pr/pr-create.scenario.test.ts -t pr_create_form_requires_authentication_before_create` | 1 selected test passed; no unauthenticated create POST. |
| V-7 | `pnpm exec vitest run --project system-scenario tests/scenario/pr/pr-detail-join.scenario.test.ts -t pr_detail_pending_wechat_join_replay_opens_join_gate` | 1 selected test passed; injected post-auth pending replay opens the join gate. |

Full command output and scope caveats are recorded in [`verification-log.md`](./verification-log.md).
