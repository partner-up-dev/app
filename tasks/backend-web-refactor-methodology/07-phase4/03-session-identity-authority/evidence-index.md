# 4-2 Evidence Index

| Acceptance claim | Implementation evidence | Executable evidence |
| --- | --- | --- |
| Current public identity has only `anonymous` or `authenticated` | `apps/backend/src/domains/user/queries/public-user-identity.ts` | classifier unit test accepts active public roles and rejects disabled/operator-bearing rows |
| A public bearer is constrained by current persisted user state | `apps/backend/src/auth/middleware.ts` and `apps/backend/src/domains/user/queries/current-public-user-identity.ts` | `apps/backend/tests/auth/public-session.scenario.test.ts` covers disabled, anonymous-to-authenticated, and public-to-operator transitions |
| Auth, not User, issues anonymous JWTs; UUID restore stays anonymous-only | `apps/backend/src/domains/user/use-cases/register-anonymous-user.ts` and `apps/backend/src/controllers/auth.controller.ts` | backend scenario proves active anonymous UUID recovery and disabled UUID rejection |
| Direct public issuers cannot mint operator public sessions | `apps/backend/src/controllers/pr-controller.shared.ts`, `apps/backend/src/controllers/wechat.controller.ts`, and `issuePublicAuthForUser` | backend scenario asserts public issuer and middleware rejection for an operator |
| Browser token, role, and user projection have one owner each | Web storage, public store, and bootstrap coordinator | focused Web tests cover registration, restore, recovery, non-loop, and legacy operator-payload clearing |
| UUID continuity and stale-identity replacement work through real units | `tests/scenario/auth/public-user-session.scenario.test.ts` plus generic backend test action | one Browser -> Web -> Backend -> Postgres scenario passes |
| Stable cross-unit rule is documented | `docs/20-product-tdd/cross-unit-contracts.md` | promotion occurred only after all focused and browser proofs agreed |

Command outcomes and the corrected test-isolation finding are in [`verification-log.md`](./verification-log.md).
Deferred observations are in [`out-of-scope-observations.md`](./out-of-scope-observations.md).
