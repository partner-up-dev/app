# 06C deep Backend test-import ledger

Rebased 2026-07-17. These are direct `apps/backend/src/**` or `apps/backend/tests/**` imports found under
`tests/scenario/**`. They are scenario harness/test-fixture seams, not Web root type consumers, and are explicitly
out of 06C ownership.

| Scenario/harness path | Deep imports and purpose |
| --- | --- |
| `tests/scenario/_infra/browser/session.ts` | `apps/backend/tests/pr/_kit/builders/users` (`ScenarioUser` type) |
| `tests/scenario/_infra/server/backend-server.ts` | `apps/backend/src/index` (real app boot) |
| `tests/scenario/_infra/vitest/global-setup.ts` | `apps/backend/tests/_infra/db/test-database`, `apps/backend/src/lib/db` (isolated DB lifecycle) |
| `tests/scenario/commerce/rental-ordering.scenario.test.ts` | Backend merchandising/payment/trade domains, User/Partner/PartnerRequest repositories, and PR test builders/actions |
| `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts` | Backend merchandising/payment/ride-hailing domains, commerce-quote and partner-request entities, DB/repositories, and PR test builders/actions |
| `tests/scenario/pr-discovery/pr-discovery.scenario.test.ts` | `domains/pr/contracts`, `PRTypeConfigRepository`, PR builders/probes and PR-type-config fixtures |
| `tests/scenario/pr/pr-create.scenario.test.ts` | PR place-mode service, entities, user/PR builders and creation probes |
| `tests/scenario/pr/pr-detail-edit.scenario.test.ts` | persisted PR/user builders (plus its package-root `PartnerRequestFields` type edge, owned by 06C.1) |
| `tests/scenario/pr/pr-detail-join.scenario.test.ts` | PR system-state actions, persisted PR/user builders and PR-type-config fixtures |
| `tests/scenario/pr/pr-detail-participation.scenario.test.ts` | feedback questionnaire builders/probes, PR system-state actions, persisted PR/user builders and slot probes |

No deep Backend import is a permitted replacement for `@partner-up-dev/backend/contracts`; if a family mutation needs
one, stop and route it to scenario/test ownership.
