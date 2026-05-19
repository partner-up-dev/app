# Issue 233 Form Mode Fuzzy Time

## Objective & Hypothesis

Support fuzzy time selection inside Anchor Event Form Mode recommendation while keeping persisted `PartnerRequest.time_window` exact-only.

Hypothesis: users can broaden recommendation input through a compact `FUZZY` time-control mode, and the backend can expand that input into the event's finite start options for recommendation without introducing fuzzy PR state.

## Guardrails Touched

- PR remains the executable collaboration object with one concrete `time_window` after creation.
- `FUZZY` is recommendation input only and must not be persisted on PR.
- Form Mode recommendation remains backend-authored.
- Event-assisted create fallback still creates an exact-time PR from one selected start option.

## Verification

- `pnpm --filter @partner-up-dev/frontend exec vitest run src/domains/event/model/form-mode.test.ts`
- `pnpm exec vitest run apps/backend/src/domains/anchor-event/use-cases/recommend-form-mode-prs.test.ts apps/backend/src/domains/anchor-event/services/form-mode.test.ts --project backend-unit`
- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm lint:backend`
