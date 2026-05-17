# Task Packet - Event-Assisted Create Frontend Assistance

## Objective & Hypothesis

- Objective: make event-assisted create a frontend assistance path that submits the unified structured PR create command.
- Hypothesis: removing backend Anchor Event pool guardrails from event-assisted create preserves PR-owned creation semantics while existing unified PR creation still enforces creation policy, POI availability, creator publish identity, and creator time-window conflict.

## Guardrails Touched

- `docs/10-prd/behavior/rules-and-invariants.md`
- `docs/10-prd/behavior/workflows.md`
- `docs/20-product-tdd/cross-unit-contracts.md`
- `apps/backend/src/controllers/partner-request.controller.ts`
- `apps/backend/src/controllers/pr-controller.shared.ts`
- `apps/backend/src/domains/pr-core/use-cases/create-pr-structured.ts`
- `apps/frontend/src/domains/event/queries/useCreateEventAssistedPR.ts`
- `tests/scenario/anchor-event/anchor-event-form-mode-participation.scenario.test.ts`
- `tests/scenario/anchor-event/anchor-event-landing-distribution.scenario.test.ts`

## Verification

- `pnpm exec vitest run --project frontend-unit apps/frontend/src/domains/event/queries/useCreateEventAssistedPR.test.ts`: passed.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/anchor-event/anchor-event-assisted-create.scenario.test.ts apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts`: passed.
- `pnpm --filter @partner-up-dev/backend typecheck`: passed.
- `pnpm lint:backend`: passed.
- `pnpm exec vitest run --project frontend-unit apps/frontend/src/domains/event/model/form-mode.test.ts apps/frontend/src/domains/event/queries/useCreateEventAssistedPR.test.ts`: passed.
- `pnpm exec vitest run --project system-scenario tests/scenario/anchor-event/anchor-event-form-mode-participation.scenario.test.ts`: passed; covers Form Mode event-assisted create happy path.
- `pnpm exec vitest run --project system-scenario tests/scenario/anchor-event/anchor-event-landing-distribution.scenario.test.ts`: passed; covers Card Mode and List Mode event-assisted create happy paths.
