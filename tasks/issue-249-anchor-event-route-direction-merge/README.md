# Issue 249 - Anchor Event Route Direction Merge

## Objective & Hypothesis

- GitHub issue: https://github.com/partner-up-dev/mvp-HA/issues/249
- Classification: `Intent`
- Mode: `Execute`.
- Product intent: in Anchor Event Form Mode, route-pool entries that represent the same endpoint pair in opposite directions, such as `A -> B` and `B -> A`, should appear as one Place Control item. The item should expose a direction-switch icon button in the description/caption area so the user can choose the actual route direction before recommendation or assisted creation.
- Working hypothesis: keep backend route-pool entries and `routePoolEntryId` submission semantics unchanged; merge only the Form Mode selector view-model so persisted PR route direction remains explicit.

## Guardrails Touched

- Root `AGENTS.md`: Intent updates PRD first; non-trivial task keeps a task packet; code mutation needs explicit human start.
- Frontend `AGENTS.md`: Vue 3 strict TypeScript, Hono RPC inferred response types, domain-owned event UI under `src/domains/event/*`, stable `data-testid` for workflow actions.
- Event UI local rules: `/e/:eventId` owns the Form Mode selection state; controls expose narrow `v-model` contracts.
- Product PRD:
  - `docs/10-prd/behavior/rules-and-invariants.md` currently says route-pool entries carry stable ids and route payloads; Form Mode chooses one place option.
  - `docs/10-prd/behavior/workflows.md` currently says route-pool events present route choices with route geometry.
- Product TDD:
  - `docs/20-product-tdd/cross-unit-contracts.md` says `GET /api/events/:eventId/form-mode` returns route-pool projection and each route's start keys.
  - recommendation request and event-assisted creation continue to submit one selected route via `routePoolEntryId`.

## Current Understanding

- `apps/backend/src/domains/anchor-event/use-cases/get-form-mode-data.ts` returns both `routes` and `placeSelector`.
- `apps/backend/src/domains/anchor-event/services/place-selector.ts` creates one route place option per route-pool entry.
- `apps/frontend/src/domains/event/model/place-options.ts` clones backend `placeSelector.options` and maps them to `AnchorEventRoutePlaceOption`.
- `apps/frontend/src/domains/event/ui/controls/form-mode/AnchorEventCarouselPlaceSelector.vue` renders the Form Mode Place Control; route options show a map card, and the selected route caption renders all route points.
- `apps/frontend/src/domains/event/ui/surfaces/AnchorEventFormModeSurface.vue` stores `selectedPlaceId`, converts it to `routePoolEntryId`, and submits recommendation / create flows.
- Existing tests are in `apps/frontend/src/domains/event/model/place-options.test.ts` and backend `place-selector.test.ts`.

## Implementation

1. Updated PRD wording to make route-direction grouping in Form Mode explicit.
2. Added frontend route-direction helpers that recognize full reverse paths and group opposite route-pool options without changing route-pool facts.
3. Updated `AnchorEventCarouselPlaceSelector.vue` so one grouped route item renders the active route variant's map and route description.
4. Added a `PuButton` ghost icon button from `@partner-up-dev/design-web` in the selected route caption. The button cycles the group's concrete route option ids and emits the active `selectedPlaceId`.
5. Kept single-direction routes unchanged.
6. Kept backend recommendation, creation, route equality, and routePool storage unchanged.
7. Added `anchorEvent.placeSelector.switchRouteDirection` in `zh-CN` and the locale schema.
8. Added `PuButton` to the frontend's existing `design-web-runtime.d.ts` root-module shim so the current app-side TypeScript path mapping recognizes the package root export.

## Impact Handshake Draft

- Address and Object:
  - PRD: `docs/10-prd/behavior/workflows.md`, likely Form Mode step 6.
  - Frontend model/UI: `apps/frontend/src/domains/event/model/place-options.ts`, `apps/frontend/src/domains/event/model/place-options.test.ts`, `apps/frontend/src/domains/event/ui/controls/form-mode/AnchorEventCarouselPlaceSelector.vue`.
  - Possible locale copy: `apps/frontend/src/locales/zh-CN.jsonc`, `apps/frontend/src/locales/schema.ts`.
- State Diff:
  - From: `A -> B` and `B -> A` route-pool entries render as two independent Form Mode place cards.
  - To: reverse-direction entries render as one place card with an explicit direction toggle that changes the selected concrete `routePoolEntryId`.
- Blast Radius Forecast:
  - Local to Form Mode place selection and the selected `routePoolEntryId` passed into recommendation / assisted-create flows.
  - No backend persistence or API contract change expected.
- Invariants Check:
  - Anchor Event route pool still stores separate route entries.
  - Recommendation and assisted creation still receive exactly one selected route id.
  - Route-mode PR persists `route` and `location = null`.
  - Location-pool Form Mode is unchanged.
  - Single-route and non-reverse route options are unchanged.
- Verification:
  - Focused frontend unit tests for reverse-pair grouping and selected route id switching.
  - `pnpm test:unit:frontend -- apps/frontend/src/domains/event/model/place-options.test.ts` or nearest supported frontend unit command.
  - If UI behavior changes are substantial, run full `pnpm test:unit:frontend`.

## Verification

- `pnpm exec vitest run --project frontend-unit apps/frontend/src/domains/event/model/place-options.test.ts` passed: 1 file, 11 tests.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- After replacing the native direction button with `PuButton`, reran `pnpm exec vitest run --project frontend-unit apps/frontend/src/domains/event/model/place-options.test.ts`: 1 file, 11 tests passed.
- After replacing the native direction button with `PuButton`, reran `pnpm --filter @partner-up-dev/frontend build`: passed.
- Existing working tree before exploration had user changes in `apps/frontend/package.json` and `pnpm-lock.yaml`; do not revert or mix unrelated edits.

## Next Step

Review the focused diff for PRD and frontend route Place Control behavior.
