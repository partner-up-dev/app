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
  - Card/List Inline Place Selector dropdown shows options from the event's active Anchor Event pool only.
  - Location-pool active items render and fit standalone markers.
  - Route-pool active items render and fit markers plus planned/fallback polyline.
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
- Slice 7 added the normalized place-option model and route-aware Form/Card/List create selectors.
- Event-assisted create place options are exclusive by Anchor Event active pool; malformed mixed inputs consume route options only.
- Backend-owned Anchor Event `placeSelector` views now provide active place-option ownership for Form/Card/List create surfaces; legacy arrays remain as rollout-compatible payload fields.
- Shared selector visible copy now follows active place kind: location-pool events show location copy and route-pool events show route copy.
- Route-pool `申请新路线` application flow is implemented with event-local route application review.
- Full route-pool browser verification still needs an authenticated admin session or a seeded route-pool Anchor Event fixture.
- PR detail Facts Card and PR preview cards are route-aware in the Slice 8 worktree; remaining route-detail work is share/system proof.
- Slice 6B corrected the RouteEditor normal/immersive visual structure against the UniApp reference.
- Slice 6C implemented RouteMap planning/style parity: Direction WebService planned driving polyline, UniApp marker icons, and UniApp polyline colors/width/border.
- LocationPicker provider details need browser verification against Tencent `componentPicker` postMessage/page-return behavior.
- Natural-language route parsing is follow-up scope.
- Active issue 201 POI upgrade can move current location-related files before implementation starts.

## 2026-05-17 Global Status Audit

- Latest committed issue 206 implementation is `8e2a0209 feat(pr): add route editor map workflow`; Slice 7 Anchor Event frontend work is currently in the worktree.
- Backend route storage, validation, route summary, read models, share metadata, route-mode policy sweep, Anchor Event route pool, and route-assisted create contract are present.
- Frontend PR create/edit and Admin PR create/edit consume generic `RouteEditor` through `PRPlaceModeField`.
- Generic route map and location picker infrastructure are present, including Tencent Direction WebService JSONP planning and UniApp-compatible route map styling.
- Anchor Event frontend create surfaces now consume normalized active-pool place options in Form/Card/List modes.
- Admin Anchor Event route-pool editing is wired through the place-pool segmented editor, with inactive draft preservation and submit-time active-pool clearing.
- PR detail frontend is route-aware in the Slice 8 worktree: `PRFactsCard.vue` renders a route row and `PRPreviewCard.vue` resolves backend place display with route-summary fallback.
- See `60-current-status-review.md` for the current done/partial/pending breakdown.

## Slice 7 Working Notes

- User confirmed Slice 7 should begin and called out that Anchor Event Admin lacks route-pool editing.
- Implementation scope now starts with Admin Anchor Event route-pool editing, then wires frontend Anchor Event place selectors against the existing backend `routePool` / `routePoolEntryId` contract.
- Discussion update on 2026-05-17: Admin Anchor Event place-pool segment switching should preserve inactive draft values. Submit-time mutation input should decide which backend pool is active and clear the inactive field.

Command log for Slice 7:

- Added Admin Anchor Event place-pool mode editing and route-pool editor backed by generic `RouteEditor`.
- Added Anchor Event place-option model helpers plus Form Mode carousel selector and Card/List inline selector.
- Wired Form/Card/List event-assisted create and pending WeChat replay to carry route-pool selections through `routePoolEntryId`.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/event/model/place-options.test.ts apps/frontend/src/domains/admin/use-cases/anchor-event/anchorEventMutationInput.test.ts`: passed, 2 files / 6 tests.
- `pnpm test:unit:frontend`: passed, 10 files / 28 tests.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: initially found `gap: 0px` in `RouteEditor.vue`; fixed to `gap: 0`, then passed with no findings outside baseline.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `git diff --check`: passed.
- Browser smoke on `https://partner-up.localhost`: home page loaded with no console errors.
- Browser smoke on `https://partner-up.localhost/admin/anchor-events?section=anchor-event-locations`: unauthenticated route loads the admin login screen with no console errors.
- Browser smoke on `https://partner-up.localhost/events/1?mode=LIST`: list mode rendered seeded PR rows with no console errors.

Command log for Admin place-pool draft preservation correction:

- `AnchorEventPlacePoolEditor.vue` segment switching now updates only `placePoolMode`; it no longer clears `locationPoolText`, `routePool`, or `locationMeetingPoints` in the draft.
- Submit-time mutation input remains responsible for active-pool selection and inactive backend-field clearing.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/admin/use-cases/anchor-event/anchorEventMutationInput.test.ts`: passed, 1 file / 3 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- Browser smoke attempt on `https://partner-up.localhost/admin/anchor-events?section=anchor-event-locations` reached the admin login screen; local seed admin login returned `管理员登录失败`, so authenticated UI preservation smoke remains pending.

Command log for event-assisted create exclusive place-pool correction:

- `buildFormModePlaceOptions` now returns route options when route pool entries exist; location options are returned only when no route pool entries exist.
- `buildCreateTimeWindowPlaceOptions`, time-window enabled checks, and event POI prefetch now consume one active pool per time window.
- If a malformed create time window includes both route and location options, route options are treated as the active pool and disabled route options do not fall back to location options.
- Form Mode route-pool events do not show the missing-location application card, and default selection skips location defaults when route options are active.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/event/model/place-options.test.ts`: passed, 1 file / 5 tests.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/event/model/place-options.test.ts apps/frontend/src/domains/admin/use-cases/anchor-event/anchorEventMutationInput.test.ts`: passed, 2 files / 8 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm test:unit:frontend`: passed, 10 files / 30 tests.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed with no findings outside baseline.
- `git diff --check`: passed.

Planning update for backend-owned place options and route application:

- User-facing selector copy should display one active kind, such as `地点` for location-pool events or `路线` for route-pool events.
- Backend should expose normalized active-pool place options and copy hints; frontend should render the returned view rather than choosing the active pool from `locations` / `routes`.
- Route-pool events should have an `申请新路线` path backed by generic `RouteEditor` / `LocationPicker`.
- Implementation has been split into planned Slice 7B for backend-owned place options and planned Slice 7C for route application.

Command log for Slice 7C route application:

- Added dedicated Anchor Event route application persistence, public submit/list endpoints, and Admin accept/reject endpoints.
- Added Form Mode route-pool `申请新路线` card and `/routes/apply` user route application page backed by generic `RouteEditor`.
- Added Admin Anchor Event `路线申请` navigation section and review surface.
- Accepted route applications append event-local route pool entries using `application-{id}`.
- Location-pool events reject route applications with `ANCHOR_EVENT_ROUTE_APPLICATION_UNAVAILABLE`.
- `pnpm --filter @partner-up-dev/backend typecheck`: passed.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `pnpm lint:backend`: passed.
- `pnpm db:lint`: passed.
- `pnpm test:scenario:backend -- apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts`: passed, 1 file / 5 tests.
- `git diff --check`: passed.
- Browser smoke on `https://partner-up.localhost/routes/apply?fromEvent=1`: route application page title and submit action rendered. Browser logs still contained the earlier unrelated Admin login failure from a previous Admin login attempt.

Command log for Slice 7B backend-owned place selector:

- Added backend `AnchorEventPlaceSelectorView` construction for Form Mode and event detail create time windows.
- Backend read models now expose active kind, active copy keys, option availability, route-pool provenance, and location option metadata through `placeSelector`.
- Frontend place-option helpers now prefer backend `placeSelector` and keep legacy array fallback for existing payload compatibility.
- Form Mode carousel and Card/List inline selectors now render one active label and placeholder from backend copy keys.
- Card/List create surfaces pass selected time-window `placeSelector` through to option building and inline selector copy.
- `git diff --check`: passed.
- `pnpm --filter @partner-up-dev/backend typecheck`: passed.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/event/model/place-options.test.ts`: passed, 1 file / 7 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm test:scenario:backend -- apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts`: passed, 1 file / 5 tests.
- `pnpm lint:backend`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.

Local migration remediation on 2026-05-17:

- Runtime `GET /api/admin/anchor-events/workspace` reported `relation "anchor_event_route_applications" does not exist`.
- Confirmed `apps/backend/drizzle/0058_anchor_event_route_applications.sql` exists and was included in commit `e866cb82`.
- Initial `pnpm db:migrate` from the root failed because the shell lacked `DATABASE_URL`; reran with `DATABASE_URL` loaded from `apps/backend/.env`.
- The local development database had schema columns/tables from migrations 0047-0057, while `app_migrations` lacked 0047-0057 rows. The runner failed before reaching 0058 on an already-existing `anchor_events.pr_creation_policy` column.
- Verified key 0047-0057 schema artifacts existed locally, reconciled only those local `app_migrations` rows, then reran standard `pnpm db:migrate`.
- Standard migration runner then applied `drizzle/0058_anchor_event_route_applications.sql` successfully with `applied=1 skipped=58`.
- Verified `anchor_event_route_applications` exists and `schema:0058_anchor_event_route_applications.sql` is present in `app_migrations`.

Planning update for Route Application Admin route review draft:

- Route application review should allow Admin to adjust route items before accepting.
- The UI uses generic `RouteEditor`, so each route item keeps the same LocationPicker behavior as route creation and route-pool editing.
- The Admin accept command now carries the normalized review draft route; backend acceptance uses that route for the event-local route-pool entry and stores it back on the reviewed application.
- `pnpm --filter @partner-up-dev/backend typecheck`: passed.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm test:scenario:backend -- apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts`: passed, 1 file / 5 tests, including edited accepted route coverage.
- `pnpm lint:backend`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `git diff --check`: passed.
- Browser smoke on `https://partner-up.localhost/admin/anchor-events?section=anchor-event-route-applications` reached the Admin login page. Default local seed admin login returned `管理员登录失败`, so authenticated Route Application Admin UI smoke remains pending.

Command log for Form Mode route place control correction:

- Browser verified `https://partner-up.localhost/e/4` before the fix: route cards existed, but `.route-map--inline`, `.map-shell--inline`, and canvas height were `0`, so only `路线地图暂不可用` fallback text appeared.
- `AnchorEventCarouselPlaceSelector.vue` now gives route-card `RouteMap` a full card-height layout path.
- Selected route caption now renders a compact route-point list with primary departure dot, tertiary waypoint dot, error/danger arrival dot, and `label-large` route item names.
- Browser verified `https://partner-up.localhost/e/4` after the fix: route card maps measured non-zero heights, canvases measured non-zero heights, and selected route caption rendered route item rows without compact-summary truncation.
- Screenshot capture through the browser automation timed out on the Tencent map page, so verification used DOM/layout measurements.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `git diff --check`: passed.

Follow-up correction for Form Mode route card click handling:

- Browser hit-testing showed route-card clicks land first on Tencent map canvas descendants.
- Route cards now set the preview `RouteMap` to `pointer-events: none`, so click targeting reaches the card/carousel selection layer consistently.
- Browser verified `https://partner-up.localhost/e/4?mode=form`: the second route card hit target is now the route card article, and clicking it selects `route:application-1`.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `git diff --check`: passed.

Follow-up correction for Tencent map bottom attribution band:

- Shared `Map.vue` now supports opt-in bottom attribution hiding by extending the Tencent map canvas 20px below the clipped shell and adding 20px to fit-geometry bottom padding.
- `RouteMap.vue` forwards the opt-in prop.
- Anchor Event Form Mode route carousel maps and Card/List inline place preview maps opt into the behavior.
- Tencent LBS provider now omits absent `minZoom` / `maxZoom` fields from `MapOptions` so the SDK does not warn about `undefined` zoom bounds.
- Browser verified `https://partner-up.localhost/e/4?mode=form`: the route-card map shell stayed clipped at 138px height with `overflow: hidden`; the map container and Tencent canvas measured 158px height and bottom extended 20px below the shell.
- Browser console check on `https://partner-up.localhost/e/4?mode=form`: no `minZoom` / `MapOptions` / Tencent type warning appeared after maps initialized.
- Browser checked `https://partner-up.localhost/e/4?mode=list`: the current page state had no visible inline selector instance, so inline preview visual verification remains pending.
- `git diff --check`: passed.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.

Follow-up correction for Card/List route-pool creation controls:

- Event detail read model now exposes top-level `placeSelector`, aligned with Form Mode, so a route-pool event can publish route options even when `createTimeWindows` is empty.
- Per-time-window `placeSelector` remains in `createTimeWindows[]` for location availability and time-window-specific disabled state.
- List Mode, Card Mode, and the Landing Page controlled Card Mode now use the selected time-window selector when present and fall back to event-level `placeSelector` when no create time window is selected.
- Creation buttons now stay disabled when start time or place selection is missing, and the create card shows an explicit validation message instead of sending an empty create payload.
- `pnpm --filter @partner-up-dev/backend typecheck`: passed.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/event/model/place-options.test.ts`: passed, 1 file / 7 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm test:scenario:backend -- apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts`: passed, 1 file / 6 tests.
- `pnpm lint:backend`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `git diff --check`: passed.
- Runtime correction: `AnchorEventLandingPage.vue` moved controlled Card/List place selector derivation below `poiByName` initialization, fixing `ReferenceError: Cannot access 'poiByName' before initialization`.
- Browser verified `https://partner-up.localhost/e/4?mode=list`: the page mounted, the create card expanded, route selector copy displayed `路线`, the dropdown contained the 3 route-pool options, the inline route map rendered, and create remained disabled with `请选择开始时间。`.
- Browser verified `https://partner-up.localhost/e/4?mode=card`: the empty create surface displayed the route selector, the dropdown contained the 3 route-pool options, the inline route map rendered, and create remained disabled with `请选择开始时间。`.
- Browser console filter on the verified pages found no `poiByName`, `ReferenceError`, `Cannot access`, `MapOptions`, or `minZoom` warning entries. Browser log history still contained a stale Admin login failure from earlier admin-page testing.

Follow-up correction for route selector labels:

- Anchor Event place selector route options now use full endpoint labels for user-facing route choices. Compact 16-character route summaries remain scoped to PR title/share-style display helpers.
- Backend `placeSelector.options[].label` now resolves route labels with full `route[0].name~route[-1].name` text.
- Frontend legacy fallback place-option builders now use generic `buildRouteEndpointLabel`.
- Browser verified `https://partner-up.localhost/e/4?mode=list` and `https://partner-up.localhost/e/4?mode=card`: route selector options include `广东外语外贸大学(大学城校区)~广州南站`, `我的位置~恒鑫御园`, and `北京街道~广州交易广场` without the previous compact truncation.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/event/model/place-options.test.ts apps/frontend/src/domains/route/model/route.test.ts`: passed, 2 files / 15 tests.
- `pnpm test:unit:backend -- apps/backend/src/domains/anchor-event/services/place-selector.test.ts`: passed, 1 file / 1 test.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm --filter @partner-up-dev/backend typecheck`: passed.
- `pnpm lint:backend`: passed.
- `git diff --check`: passed.

Discussion note for List/Card time-window editor:

- Current List/Card time select is hidden when `createTimeWindows` is empty, because the control only receives materialized create time windows.
- User proposed `AnchorEventAssistedPRTimeWindowInlineEditor`: it takes `anchorEventId`, owns its Anchor Event time-window query, internally chooses preset or custom UI state, and emits the concrete `[startAt, endAt]` time window tuple.
- Code reality check: current event-assisted creation posts to unified `/api/pr/new/form` through `useCreateEventAssistedPR`, and backend `partner-request.controller.ts` calls `createPRFromStructured`. The Anchor Event-owned create use case no longer exists in the mounted backend route path.

Implementation note for List/Card time-window editor:

- Event detail read model now exposes `durationMinutes` and `earliestLeadMinutes`.
- Added `AnchorEventAssistedPRTimeWindowInlineEditor.vue`.
- List creation card, Card empty state, and Landing Page controlled Card mode now pass full `TimeWindow` tuples instead of time-window option keys.
- Route-pool events with `createTimeWindows=[]` can render custom datetime/duration controls while still showing event-level route place options.
- Follow-up layout correction from discussion: `Inline` means the custom datetime picker and duration-minutes input should be a single row, with a 7:3 width ratio.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm --filter @partner-up-dev/backend typecheck`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `git diff --check`: passed.
- Browser verified `https://partner-up.localhost/e/4?mode=list`: the creation card rendered the inline time-window editor, default custom start time, duration-minutes input, route selector copy `路线`, full route option labels, and an inline route map surface. Create was enabled once a valid default time and route selection were present.
- Browser verified `https://partner-up.localhost/e/4?mode=card`: the empty create surface rendered the same inline time-window editor and full route options. The route map area was present, with existing fallback text for the selected route map on that run.
- Browser console filter found no new `ReferenceError`, `Cannot access`, `poiByName`, `MapOptions`, `minZoom`, or `TypeError` entries.

Follow-up layout correction for inline time-window editor:

- `AnchorEventAssistedPRTimeWindowInlineEditor.vue` now renders custom datetime and duration-minutes controls in one row.
- The row uses `7fr 3fr`; validation/hint text spans the full next row.
- Browser measured `https://partner-up.localhost/e/4?mode=list`: start field and duration field share the same top position, with width ratio `0.7`.
- Browser measured `https://partner-up.localhost/e/4?mode=card`: start field and duration field share the same top position, with width ratio `0.7`.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `git diff --check`: passed.

Discussion note for Card/List creation card place selector ordering:

- User clarified the map preview should render after the active kind label (`路线` / `地点`) and before the dropdown/control.

Implementation note for Card/List creation card place selector ordering:

- `AnchorEventInlinePlaceSelector.vue` now renders field children in this order: active-kind label, map preview, select control.
- The select keeps an explicit `aria-label` from the active-kind label.
- Browser measured `https://partner-up.localhost/e/4?mode=list`: child order is `inline-place-selector__label -> inline-place-selector__preview -> inline-place-selector__input`, with label text `路线`.
- Browser measured `https://partner-up.localhost/e/4?mode=card`: child order is `inline-place-selector__label -> inline-place-selector__preview -> inline-place-selector__input`, with label text `路线`.
- Browser console filter found no new `ReferenceError`, `Cannot access`, `poiByName`, `TypeError`, `MapOptions`, or `minZoom` entries.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `git diff --check`: passed.

Regression correction for inline map preview fallback:

- After reordering the inline place selector, List Mode route preview could initialize the Tencent GL canvas at `0x0` inside expanding content, leaving `路线地图暂不可用` visible.
- Initial fix with provider resize was removed after design review.
- Shared `Map.vue` now waits for a usable container size before creating the Tencent provider through a bounded `nextTick` / `requestAnimationFrame` / short-delay retry loop.
- Browser verified `https://partner-up.localhost/e/4?mode=list`: fallback is gone, preview measured `446x148`, clipped shell measured `446x148`, and internal Tencent canvas measured `444x166` for the 20px hidden-attribution bleed.
- Browser verified `https://partner-up.localhost/e/4?mode=card`: fallback is gone, preview measured `446x148`, clipped shell measured `446x148`, and internal Tencent canvas measured `444x166` for the 20px hidden-attribution bleed.
- Browser console filter found no new Tencent, route planning, `MapOptions`, `minZoom`, `ReferenceError`, or `TypeError` entries.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `git diff --check`: passed.

Follow-up design correction for inline map preview sizing:

- User clarified creation-card map previews should be true full-width plus fixed-height previews.
- Implemented simplification: inline previews use a fixed visible height, and map initialization waits for a measurable container before creating the Tencent GL map.
- Hidden attribution handling remains the internal canvas bleed only; it should not alter the visible preview height.

Slice 8 PR detail / preview verification:

- Added `RoutePointList.vue` as a generic route-point display primitive and `PRRouteMapModal.vue` for PR detail route map viewing.
- `PRFactsCard.vue` now renders Route as a dedicated `InfoRowAction`, hides the empty Location row for route-mode PRs, and renders a compact route point list.
- `PRPreviewCard.vue` and `PRPage.vue` now prefer backend `core.placeDisplayName` and fall back to local route summary when the running backend/read-model payload lacks that field.
- `pnpm --filter @partner-up-dev/frontend test:unit -- PRPage.creator-actions.test.ts PRPreviewCard.route.test.ts`: passed, 2 files / 8 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `git diff --check`: passed.
- Browser verified `https://partner-up.localhost/pr/19` with a locally inserted route-mode smoke PR:
  - PR title displayed `广州塔~大学城`.
  - Route facts row rendered with action `查看地图`.
  - Route point list rendered `广州塔`, `琶洲`, `大学城`.
  - Location row was absent because the PR was route-mode and `location = null`.
  - Route map modal opened, measured a `696x403` map shell, and rendered detailed route-point fallback.
- Temporary smoke PR `#19` was deleted after verification.
- Browser runtime note: the current `https://partner-up.localhost` frontend process had no Tencent LBS JS SDK script loaded, so this PR modal map used fallback. Earlier event route map checks in this task verified the shared `RouteMap` / `Map.vue` path with non-zero Tencent canvas once the running dev process has the key loaded.

Follow-up diagnosis for Route Form Mode primary CTA:

- Slice 8 changes were committed as `3cd8cf42 feat(pr): surface route details on PR views`.
- Browser/data check on 2026-05-18: `https://partner-up.localhost/e/1?mode=form` is location-pool in the current local runtime (`placeSelector.kind = "location"`). `https://partner-up.localhost/e/4?mode=form` is the current route-pool form page.
- Browser verified `/e/4?mode=form` renders route cards, advanced time selection, and primary CTA text `创建一场 ... 经过 ... 的拼车搭子活动`.
- Code diagnosis: `AnchorEventFormModeSurface.vue` returns early for `place.kind === "route"` in `handleSubmitRecommendation` and calls `createEventAssistedPR("manual_fallback")`; it never calls `useAnchorEventFormModeRecommendation`.
- Backend diagnosis: `/api/events/:eventId/form-mode/recommendation` still validates only `{ locationId, startAt, preferences }`; sending `routePoolEntryId` returns a Zod error requiring `locationId`.
- Product implication: current Route Form Mode CTA cannot produce matched / unmatched states. Supporting route matched / unmatched requires expanding the recommendation contract to a place-discriminated request and ranking route-mode PR candidates by route identity/equality plus time/preference compatibility.

Implementation note for Route Form Mode recommendation contract expansion:

- Backend recommendation request now accepts `place` as a discriminated union:
  - location selection: `{ kind: "location", locationId }`
  - route selection: `{ kind: "route", routePoolEntryId }`
- The controller still accepts the legacy `locationId` payload shape for rollout compatibility and maps it to a location place selection.
- Route recommendation validates that the selected route pool entry belongs to the active Anchor Event.
- Route candidates are visible Anchor Event PRs whose stored `route` equals an event route-pool route. The match contract now includes `exactPlace`, `exactLocation`, and `exactRoute`; matched recommendations require `exactPlace`, start-time tolerance, and no conflicting tags.
- Form Mode recommendation responses now expose route candidate payloads and route-aware `selection`; route selections return `locationId: null` plus the selected `routePoolEntryId`.
- Missing-duration route-pool events are supported by producing `timeWindow: [startAt, null]`. The lead-time boundary uses the end time when configured, otherwise the start time.
- Frontend Form Mode route selections now call `useAnchorEventFormModeRecommendation` instead of bypassing recommendation through direct event-assisted PR creation.
- Recommendation telemetry payloads now carry the active place selection rather than assuming a `locationId`.
- Route Form Mode primary CTA copy now uses recommendation semantics: `加入一场 ... 经过 ... 的拼车搭子活动`.
- `pnpm --filter @partner-up-dev/backend test:unit -- apps/backend/src/domains/anchor-event/services/form-mode.test.ts`: passed, 1 file / 10 tests.
- `pnpm --filter @partner-up-dev/backend typecheck`: passed.
- `pnpm test:scenario:backend -- apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts`: passed, 1 file / 6 tests, including route recommendation coverage.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- Runtime API check on `https://api.partner-up.localhost/api/events/4/form-mode/recommendation`: route payload returned `200`, `selection.kind = "route"`, selected `routePoolEntryId = "route-1"`, and `timeWindow[1] = null`.
- Browser verified `https://partner-up.localhost/e/4?mode=form`: route cards rendered, advanced time selection rendered, and the primary CTA displayed `加入一场 5/18 16:45 经过 广东外语外贸大学(大学城校区)~广州南站 的拼车搭子活动`. Browser tab logs contained no errors or warnings.
