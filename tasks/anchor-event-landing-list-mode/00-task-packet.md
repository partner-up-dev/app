# Task Packet - Anchor Event Landing List Mode

- Objective & Hypothesis: let `/e/:eventId` participate in List Mode rollout alongside existing `FORM` and `CARD_RICH` landing modes. Hypothesis: the smallest coherent mutation is to extend the event-owned landing assignment contract and admin rollout ratios to include `LIST`, then render the existing event-domain List Mode surface when the resolved landing mode is `LIST`.
- Guardrails Touched:
  - Product truth for Anchor Event browsing and `/e/:eventId` landing modes.
  - Cross-unit contract for `GET /api/events/:eventId/landing-assignment`, event-owned landing rollout config, and localStorage stabilization.
  - Backend Anchor Event landing config schema, normalization, assignment weighting, and admin config validation.
  - Frontend landing route assembly, local landing mode storage, admin rollout editor, and locale schema/copy.
- Verification:
  - `pnpm --filter @partner-up-dev/backend test:unit`
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - `pnpm test:scenario system`

## Impact Handshake

- Address and Object:
  - `docs/10-prd/behavior/workflows.md`
  - `docs/10-prd/behavior/rules-and-invariants.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - `apps/backend/src/domains/anchor-event/landing-config.ts`
  - `apps/backend/src/domains/anchor-event/landing-config.test.ts`
  - `apps/frontend/src/domains/event/model/anchorEventLandingModeStorage.ts`
  - `apps/frontend/src/pages/AnchorEventLandingPage.vue`
  - `apps/frontend/src/domains/admin/queries/useAdminAnchorEventLandingConfig.ts`
  - `apps/frontend/src/pages/AdminAnchorEventPage.vue`
  - `apps/frontend/src/locales/schema.ts`
  - `apps/frontend/src/locales/zh-CN.jsonc`
- State Diff: `/e/:eventId` landing rollout moves from two modes (`FORM`, `CARD_RICH`) to three modes (`FORM`, `CARD_RICH`, `LIST`).
- Blast Radius Forecast:
  - backend assignment response type changes through Hono RPC inference
  - admin landing config payload and frontend editor need synchronized shape
  - `/e/:eventId` loading/error gating must include List Mode detail data
  - existing `/events/:eventId` view-mode query behavior should stay unchanged
- Invariants Check:
  - backend remains authoritative for landing assignment truth
  - localStorage stabilization remains keyed by `eventId + assignmentRevision`
  - issue 227 moves timeout fallback from `FORM` to `LIST`
  - old saved configs parse with `LIST: 0`
  - `/events/:eventId` still defaults missing/invalid `mode` query to list
- Verification Result:
  - `pnpm --filter @partner-up-dev/backend test:unit` passed with 60 tests.
  - `pnpm --filter @partner-up-dev/frontend build` passed.
  - `pnpm --filter @partner-up-dev/frontend lint:tokens` passed with no findings outside baseline.
  - `pnpm test:scenario system` passed with 4 system scenarios.
