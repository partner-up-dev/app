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
- Tencent official docs consulted for location picking and marker display:
  - https://lbs.qq.com/webApi/component/componentGuide/componentPicker
  - https://lbs.qq.com/webApi/component/componentGuide/componentMarker
- Product/design correction recorded on 2026-05-16:
  - Route is generic; Route PR is a PR place-mode consumer.
  - LocationPicker is generic; RouteEditor opens it for a route item.
  - Tencent `componentPicker` is the first-version location picking provider.
  - Tencent `componentMarker` is position display oriented.

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

Command log for Slice 5:

- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed, 1 file / 4 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed after fixing Tencent loader callback typing.
- `pnpm test:unit:frontend`: passed, 5 files / 11 tests.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.

Command log for Slice 6:

- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed, 1 file / 6 tests.
- `pnpm --filter @partner-up-dev/backend build`: passed.
- `pnpm --filter @partner-up-dev/frontend build`: passed after resolving the Admin RPC route-type alias collision.
- `pnpm test:unit:frontend`: passed, 5 files / 13 tests.
- `pnpm test:unit:backend`: passed, 25 files / 92 tests.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `git diff --check`: passed.

Command log for Slice 6A:

- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/route/model/route.test.ts apps/frontend/src/domains/location/model/location-picker.test.ts apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed, 3 files / 9 tests.
- `pnpm test:unit:frontend`: passed, 7 files / 16 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `git diff --check`: passed.
- Browser smoke on `http://127.0.0.1:5173/pr/new?mode=form`: route mode renders compact route rows; route item click opens LocationPicker; missing Tencent key fallback renders and confirm stays disabled.

Command log for Slice 6B:

- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/route/model/route.test.ts apps/frontend/src/domains/location/model/location-picker.test.ts apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed, 3 files / 9 tests.
- `pnpm test:unit:frontend`: passed, 7 files / 16 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `git diff --check`: passed.
- Browser DOM inspection on `http://127.0.0.1:5173/pr/new?mode=form`: route mode renders the UniApp-style normal shell with map/plus icon actions, departure/arrival placeholder rows, and the route map modal fallback.
- Browser DOM/attribute inspection after clicking the first route point: `LocationPickerModal` opens with title `选择起点`; Tencent `componentPicker` iframe exists and its URL contains `https://apis.map.qq.com/tools/locpicker?...key=<configured>&referer=partner-up`.
- UniApp route map parity inspection on 2026-05-16:
  - `components/common/routeMap/routeMap.vue` calls `QQMapSDK.direction` with driving mode and renders `decompressPolyline(path.polyline)`.
  - `utils/lbs/index.js` decompresses Tencent polyline by accumulating deltas from index `2`, then converting pairs into coordinates.
  - `components/common/routeMap/types.ts` defines route marker size `24x24`, centered anchor, primary polyline `#85976eFF`, secondary polyline `#dbe7c8FF`, invalid polyline `#abaca5`, white primary/secondary border, invalid border `#5e5f59`, and width `7`.

Command log for Slice 6C:

- Official Tencent Direction WebService route docs read: https://lbs.qq.com/service/webService/webServiceGuide/webServiceRoute.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/route/model/route.test.ts apps/frontend/src/domains/route/model/route-planning.test.ts apps/frontend/src/domains/location/model/location-picker.test.ts apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed, 4 files / 13 tests.
- `pnpm test:unit:frontend`: passed, 8 files / 20 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `git diff --check`: passed.
- Tencent Direction WebService smoke with local frontend env key and Guangzhou route sample: `status=0`, `message=Success`, `routes=1`, first route compressed polyline length `414`.
- Browser smoke on `http://127.0.0.1:5173/pr/new?mode=form`: route mode opens RouteMap modal and incomplete-coordinate fallback remains visible.

Command log for LocationPicker coord compatibility fix:

- Tencent componentPicker docs rechecked on 2026-05-16: `coord` is `lat,lng`, `coordtype=5` is Tencent / Google / AMap coordinates, and examples use a raw comma.
- Initial hypothesis: `URLSearchParams` encoded the `coord` comma as `%2C`; Tencent componentPicker can reject encoded coordinates.
- Follow-up runtime evidence on `https://partner-up.localhost`: the app generated `coord=23.12908,113.26436&coordtype=5`, and direct Tencent component visits still rendered `传递的经纬度不合法`.
- Direct Tencent component checks also reproduced the illegal-coordinate view for official-format coordinates such as `39.998766,116.273938` with `coordtype=5`.
- Fix revision: `buildTencentLocationPickerUrl` omits `coord` for iframe mode. `LocationPickerPanel` still keeps the already selected location in the local editable draft, so name, address, coordinate text, and confirm state remain available when reopening.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/location/model/location-picker.test.ts apps/frontend/src/domains/route/model/route.test.ts apps/frontend/src/domains/route/model/route-planning.test.ts apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed, 4 files / 14 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm test:unit:frontend`: passed, 8 files / 21 tests.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `git diff --check`: passed.
- Real dev-server smoke on `https://partner-up.localhost/pr/new`: route mode -> open departure picker -> simulate Tencent `locationPicker` postMessage -> confirm -> reopen selected point.
  - First iframe URL has no `coord`.
  - Reopened iframe URL has no `coord`.
  - Parent editor still shows `23.129080, 113.264360`.
  - Confirm remains enabled.
  - Tencent iframe text no longer contains `传递的经纬度不合法`.

Command log for RouteMap JSONP and Tencent GL style fix:

- Runtime report on 2026-05-16:
  - Browser `fetch` to `https://apis.map.qq.com/ws/direction/v1/driving/` is blocked by CORS from `https://partner-up.localhost`.
  - Tencent GL rejects 8-digit hex polyline colors such as `#85976eFF`.
  - Tencent GL rejects marker geometry `content` when the value is `undefined`.
- Fix:
  - `fetchTencentDrivingRoutePlans` now uses Tencent Direction WebService JSONP in browser runtime by setting `output=jsonp&callback=...`; injected test fetchers and non-browser runtime keep the fetch path.
  - Route polyline colors passed to Tencent GL now use 6-digit hex values (`#85976e`, `#dbe7c8`, `#abaca5`).
  - Marker geometry omits `content` unless a non-empty label string exists; route markers intentionally render without labels.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/route/model/route-planning.test.ts apps/frontend/src/domains/route/model/route.test.ts apps/frontend/src/domains/location/model/location-picker.test.ts apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed, 4 files / 14 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm test:unit:frontend`: passed, 8 files / 21 tests.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `git diff --check`: passed.

Command log for RouteEditor incomplete-route map action guard:

- Fix:
  - RouteEditor inline map icon and immersive `导航` button are disabled while `getRouteValidationIssue(editableRoute)` reports an incomplete route.
  - `openRouteMap` also checks the same completeness guard before opening the modal.
  - The immersive `complete` emit path now uses the same route validation helper.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/route/model/route.test.ts apps/frontend/src/domains/location/model/location-picker.test.ts apps/frontend/src/domains/route/model/route-planning.test.ts apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed, 4 files / 14 tests.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- Browser smoke on `https://partner-up.localhost/pr/new`: structured form route mode shows `route.open-map` disabled before any route point is selected.
- Playwright smoke on `https://partner-up.localhost/pr/new`: route map button stays disabled after only departure is selected and becomes enabled after departure plus arrival are selected.
- `git diff --check`: passed.

Command log for RouteEditor route item order actions and layout adjustment:

- Fix:
  - RouteEditor inline operation buttons now align to the top with no inter-button gap.
  - RouteEditor inline operation button height and RouteItemRow inline row height both use `--sys-size-large`.
  - RouteItemRow shows arrow-up / arrow-down order actions on the trailing side. Index `0` hides arrow-up; the last index hides arrow-down.
  - RouteEditor swaps route points through `swapRoutePointWithNeighbor` and emits the updated generic Route.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/route/model/route.test.ts apps/frontend/src/domains/location/model/location-picker.test.ts apps/frontend/src/domains/route/model/route-planning.test.ts apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed, 4 files / 15 tests.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- Browser smoke on `https://partner-up.localhost/pr/new`:
  - Initial route: first item has down only, last item has up only.
  - After adding a waypoint: first item has down only, middle item has both up and down, last item has up only.
  - Moving the middle item up changes visible order from `测试起点 -> 测试中点 -> 测试终点` to `测试中点 -> 测试起点 -> 测试终点`.
  - Measured inline map button height and first route item height are both `44px`; operations gap is `0px`, align-items is `flex-start`, and justify-content is `flex-start`.
- `pnpm test:unit:frontend`: passed, 8 files / 22 tests.
- `git diff --check`: passed.

Deferred verification:

- `pnpm test:scenario:system` when browser route journeys are wired.
- Browser verification of Tencent `componentPicker` iframe/postMessage or page-return behavior with the configured key.
- Browser visual screenshot of a full coordinate route after a seedable route fixture or Anchor Event route pool UI exists.

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
- Generic Route and LocationPicker correction
  - RouteEditor normal mode uses compact route rows matching the UniApp reference.
  - Route item click opens LocationPicker.
  - LocationPicker search returns a selected location payload.
  - Selected location maps into route point `name`, `full_address`, and `gcj02`.
  - PR and Admin PR forms consume generic RouteEditor through PR-owned place-mode wrappers.

## Current Residual Risk

- Tencent key management and SDK loading are unresolved; Direction WebService direct frontend calls are acceptable for the first version.
- Planned polyline has no first-version cache; tests and browser checks need to cover planning failure fallback.
- Anchor Event route pool expands first-version scope across Form Mode, Card Mode, List Mode, and Admin Anchor Event pool editing.
- Mixed place-option dropdown behavior needs a normalized read model so the UI can list location and route options while preserving Anchor Event raw pool invariants.
- Slice 6B corrected the RouteEditor normal/immersive visual structure against the UniApp reference.
- Slice 6C implemented RouteMap planning/style parity: Direction WebService planned driving polyline, UniApp marker icons, and UniApp polyline colors/width/border.
- LocationPicker provider details need browser verification against Tencent `componentPicker` postMessage/page-return behavior.
- Natural-language route parsing is follow-up scope.
- Active issue 201 POI upgrade can move current location-related files before implementation starts.

Local migration remediation on 2026-05-17:

- Runtime `GET /api/admin/anchor-events/workspace` reported `relation "anchor_event_route_applications" does not exist`.
- Confirmed `apps/backend/drizzle/0058_anchor_event_route_applications.sql` exists and was included in commit `e866cb82`.
- Initial `pnpm db:migrate` from the root failed because the shell lacked `DATABASE_URL`; reran with `DATABASE_URL` loaded from `apps/backend/.env`.
- The local development database had schema columns/tables from migrations 0047-0057, while `app_migrations` lacked 0047-0057 rows. The runner failed before reaching 0058 on an already-existing `anchor_events.pr_creation_policy` column.
- Verified key 0047-0057 schema artifacts existed locally, reconciled only those local `app_migrations` rows, then reran standard `pnpm db:migrate`.
- Standard migration runner then applied `drizzle/0058_anchor_event_route_applications.sql` successfully with `applied=1 skipped=58`.
- Verified `anchor_event_route_applications` exists and `schema:0058_anchor_event_route_applications.sql` is present in `app_migrations`.
