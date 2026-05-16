# Verification Notes

## Evidence Collected

- GitHub issue 206 fetched on 2026-05-14.
- Existing repo docs read:
  - `docs/00-meta/input-intent.md`
  - `docs/00-meta/mode-a-explore.md`
  - `docs/00-meta/mode-b-solidify.md`
  - `docs/10-prd/behavior/capabilities.md`
  - `docs/10-prd/behavior/workflows.md`
  - `docs/10-prd/behavior/rules-and-invariants.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - `docs/20-product-tdd/system-state-and-authority.md`
  - `tasks/issue-201-poi-upgrade/00-task-packet.md`
- Current worktree has substantial pre-existing modified POI/PR/admin files. Route implementation should account for that dirty baseline.
- Sub-agent map completed for current PR/location implementation.
- Sub-agent map completed for `uniapp2` UI reference.
- Tencent official docs consulted for web map/polyline and route planning:
  - https://lbs.qq.com/webApi/javascriptGL/glGuide/glOverview
  - https://lbs.qq.com/webApi/javascriptGL/glGuide/glPolyline
  - https://lbs.qq.com/service/webService/webServiceGuide/webServiceRoute
  - https://lbs.qq.com/faq/serverFaq/webServiceKey

## Pending Command Verification

Command log for Slice 0, Slice 1, and Slice 2:

- `pnpm db:next-migration drizzle`: generated migration number `0056`.
- `pnpm db:lint`: passed.
- `pnpm --filter @partner-up-dev/backend typecheck`: passed during implementation.
- `pnpm test:unit:backend`: passed, 21 files / 79 tests.
- `pnpm lint:backend`: passed.
- `pnpm build:backend`: passed.
- `pnpm test:scenario:backend -- apps/backend/tests/pr-core/pr-route.scenario.test.ts`: passed, 1 file / 1 test.
- `pnpm test:scenario:backend`: passed, 12 files / 39 tests.
- `pnpm build:frontend`: passed.

Command log for Slice 3:

- `pnpm --filter @partner-up-dev/backend typecheck`: passed.
- `pnpm test:unit:backend`: passed, 24 files / 89 tests.
- `pnpm lint:backend`: passed.
- `pnpm test:scenario:backend -- apps/backend/tests/pr-core/pr-route.scenario.test.ts`: passed, 1 file / 2 tests.
- `pnpm test:scenario:backend -- apps/backend/tests/anchor-event/anchor-event-route-mode-policy.scenario.test.ts`: passed, 1 file / 2 tests.
- `pnpm test:scenario:backend`: passed, 13 files / 42 tests.
- `pnpm build:backend`: passed.

Command log for Slice 4:

- `pnpm --filter @partner-up-dev/backend typecheck`: passed.
- `pnpm db:lint`: passed.
- `pnpm test:unit:backend -- apps/backend/src/entities/anchor-event.test.ts`: passed, 1 file / 3 tests.
- `pnpm test:scenario:backend -- apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts`: passed, 1 file / 4 tests.
- `pnpm test:unit:backend`: passed, 25 files / 92 tests.
- `pnpm lint:backend`: passed.
- `pnpm test:scenario:backend`: passed, 14 files / 46 tests.
- `pnpm build:backend`: passed.
- `pnpm build:frontend`: passed.
- `git diff --check`: passed.

Deferred verification:

- `pnpm test:unit:frontend` after frontend route helper and map/editor components exist.
- `pnpm test:scenario:system` when browser route journeys are wired.

## Browser Verification Targets

- `/pr/new`
  - location mode still creates the same PR shape.
  - route mode can add departure, arrival, and waypoint.
  - switching place mode clears inactive mode before submit.
- `/pr/:id`
  - route-mode title fallback uses route summary.
  - facts card shows route points and map/fallback.
  - Facts Card Route row opens a modal with route map/fallback.
  - share descriptor title/description comes from backend canonical metadata.
- `/admin/pr`
  - create/edit preserves route-mode values.
  - admin preview uses place display helper.
- `/e/:eventId`
  - Form Mode route-pool event shows route cards in the Carousel Place Selector.
  - Route place card renders map markers and polyline/fallback.
  - event-assisted create submits `route` and clears `location`.
  - Card/List Mode creation control uses the Inline Place Selector.
  - Card/List Inline Place Selector dropdown can show location and route options.
  - Location dropdown active item renders and fits a standalone marker.
  - Route dropdown active item renders and fits markers plus planned/fallback polyline.
  - Active dropdown changes recenter and fit the map viewport with padding.
- Shared frontend primitives
  - Shared segmented control is used by place-mode selection.
  - Shared `Map.vue` handles Tencent LBS provider load failure with a readable fallback.

## Current Residual Risk

- Tencent key management and SDK loading are unresolved; Direction WebService direct frontend calls are acceptable for the first version.
- Planned polyline has no first-version cache; tests and browser checks need to cover planning failure fallback.
- Anchor Event route pool expands first-version scope across Form Mode, Card Mode, List Mode, and Admin Anchor Event pool editing.
- Mixed place-option dropdown behavior needs a normalized read model so the UI can list location and route options while preserving Anchor Event raw pool invariants.
- Natural-language route parsing is follow-up scope.
- Active issue 201 POI upgrade can move current location-related files before implementation starts.
