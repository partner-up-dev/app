# PR Title Anchor Event Label

## Objective & Hypothesis

Intent: revise PR detail and share title generation so untitled PRs identify the collaboration by the most user-recognizable label before place.

Target fallback order:

`PR.title -> resolved Anchor Event title -> PR.type -> route summary / location -> generic PR label`

Hypothesis: when a PR resolves to an Anchor Event, the event title is a clearer user-facing label than the raw `PR.type`; when no event context exists, `PR.type` should still precede place so titles answer "what this is" before "where it is."

## Guardrails Touched

- PRD product vocabulary and user-visible PR identification rules.
- Cross-unit contract for `GET /api/pr/:id` and canonical share metadata.
- Backend canonical PR share metadata generation.
- Frontend PR detail `PageHeader` title generation.
- Existing route-mode place summary behavior remains unchanged for place display.

## Verification

- Updated PRD before implementation and promoted the cross-unit contract / authority boundary.
- Backend tests cover canonical share title fallback including resolved Anchor Event title and `PR.type` before place.
- Frontend tests cover `PageHeader` consuming backend canonical title for Anchor Event, type, and place fallback cases.
- Passed `pnpm exec vitest run --project backend-unit apps/backend/src/domains/pr/sharing/pr-share-metadata.service.test.ts`.
- Passed `pnpm exec vitest run --project frontend-unit apps/frontend/src/pages/PRPage.creator-actions.test.ts`.
- Passed `pnpm exec vitest run --project backend-scenario apps/backend/tests/pr-core/pr-detail-anchor-event-context.scenario.test.ts apps/backend/tests/pr-core/pr-route.scenario.test.ts`.
- Passed `pnpm lint:backend`.
- Passed `pnpm --filter @partner-up-dev/frontend build`.
