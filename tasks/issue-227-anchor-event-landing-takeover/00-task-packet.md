# Task Packet - Issue 227 Anchor Event Landing Takeover

- Objective & Hypothesis: make `/e/:eventId` replace the old Anchor Event page by carrying List, Card, and Form modes in one landing route. Hypothesis: the smallest coherent change is to redirect `/events/:eventId` into `/e/:eventId`, add an explicit footer mode control on the landing page, and make List Mode the assignment-timeout fallback.
- Guardrails Touched:
  - Product truth for Anchor Event entry topology and landing fallback behavior.
  - Cross-unit route contract for `/events/:eventId` and `/e/:eventId`.
  - Frontend landing mode storage, route assembly, footer UI, and scenario affordances.
- Verification:
  - Passed: `pnpm exec vitest run --project backend-unit apps/backend/src/domains/anchor-event/landing-config.test.ts`
  - Passed: `pnpm --filter @partner-up-dev/backend build`
  - Passed: `pnpm lint:backend`
  - Passed: `pnpm --filter @partner-up-dev/frontend build`
  - Passed: `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - Passed: `pnpm exec vitest run --project system-scenario tests/scenario/anchor-event/anchor-event-landing-distribution.scenario.test.ts`

## Impact Handshake

- Address and Object:
  - `docs/10-prd/behavior/rules-and-invariants.md`
  - `docs/10-prd/behavior/workflows.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - `apps/frontend/src/app/router.ts`
  - `apps/backend/src/domains/anchor-event/landing-config.ts`
  - `apps/backend/src/domains/anchor-event/landing-config.test.ts`
  - `apps/frontend/src/pages/AnchorEventLandingPage.vue`
  - `apps/frontend/src/pages/AnchorEventPage.vue`
  - `apps/frontend/src/domains/event/model/anchorEventLandingModeStorage.ts`
  - `apps/frontend/src/domains/event/use-cases/useResolvedAnchorEventLandingMode.ts`
  - `apps/frontend/src/domains/event/ui/primitives/EventCard.vue`
  - `apps/frontend/src/domains/event/ui/surfaces/AnchorEventFormModeSurface.vue`
  - `apps/frontend/src/pages/PRPage.vue`
  - `apps/frontend/src/locales/schema.ts`
  - `apps/frontend/src/locales/zh-CN.jsonc`
  - `tests/scenario/anchor-event/anchor-event-landing-distribution.scenario.test.ts`
- State Diff: `/events/:eventId` owns the rich event page -> `/e/:eventId` owns List/Card/Form modes and `/events/:eventId` becomes a compatibility redirect.
- Blast Radius Forecast:
  - event card links and PR back fallbacks enter the landing route.
  - mode selection now has user-visible controls and storage writes.
  - timeout behavior changes from Form to List.
- Invariants Check:
  - valid route mode owns the current landing mode; backend landing assignment remains authoritative when valid route mode is absent.
  - assignment revision continues to bound local mode stability.
  - existing `mode=list|card` links remain usable through redirect/query parsing.
  - Form Mode route-level state machine remains under `/e/:eventId`.

## Verification Notes

- `/events/:eventId` now redirects to named route `anchor-event-landing`, preserving params, query, and hash.
- The landing resolver applies valid route mode first and disables backend assignment while it is present; without valid route mode, it applies stored mode, backend assignment, then timeout fallback.
- Backend all-zero rollout fallback and frontend assignment-timeout fallback now enter `LIST`; both paths are covered by tests.
- Explicit `?mode=form` skips the landing assignment request and renders Form Mode directly.
- Footer mode switching is covered by a system scenario that uses real click interaction and transitions `FORM -> LIST -> CARD_RICH -> FORM` on `/e/:eventId`.
