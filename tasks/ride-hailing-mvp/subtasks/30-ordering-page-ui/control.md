# Ordering Page UI

## Status

Implementation in progress.

Current approved implementation slice:

- route map correction for RideHailing `/order/new`
- runtime diagnosis for missing map changes on `https://partner-up.local`

Current fork:

- `subtasks/10-wireframe-regression/`
  - static HTML + limited UnoCSS wireframe task for UI design communication and
    automated regression before production Vue implementation
  - current artifact direction: derive the first wireframe from
    `../Application/uniapp/src/sub_packages/ride_hailing/`

## Objective & Hypothesis

Objective:

- turn `/order/new` for RideHailing into an MVP-quality buyer decision surface
  before order creation

Hypothesis:

- the current create/evaluate topology is correct enough
- the next risk is user comprehension: route basis, riders, contact phone,
  departure time, quote status, and vehicle selection are not yet explicit
  enough

## Guardrails Touched

- durable owner:
  `docs/20-product-tdd/ecommerce-contracts.md`
- page shell owner:
  `apps/frontend/src/pages/OrderingFromPlacementPage.vue`
- ride ordering UI owner:
  `apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingPanel.vue`
- ride SKU card owner:
  `apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue`
- route display dependency:
  `apps/frontend/src/domains/route/ui/RouteMap.vue`

## Current Understanding

- `/order/new` already creates real orders and routes to order detail.
- `RideHailingOrderingPanel.vue` already renders `RouteMap`.
- route map rendering should use driving route planning instead of the
  placement-binding straight-line `drivingPlan.polyline`.
- users should be able to pan/zoom the map, with app-owned zoom controls rather
  than Tencent default controls.
- route item markers should expose callouts with place name + chevron and open
  a bottom drawer for editing.
- route item callout editability is governed by placement binding lock metadata:
  `bindingLocks.route === true` means the route callouts are display-only.
- ordering entry payload now carries binding lock metadata alongside binding
  values so the frontend does not guess editability.
- the ordering drawer now has a bottom control row for `同乘人` and `出发时间`.
- `同乘人` opens a drawer showing current riders and respects
  `bindingLocks.orderParticipants`.
- `出发时间` opens a drawer with a local datetime editor and respects
  `bindingLocks.departureAt`.
- ordering evaluation/create payload uses the locally edited departure time.
- selected SKU and evaluation output are already separated from final create
  output.
- contact phone is required for final output but is not visibly editable in the
  current RideHailing panel.
- route/time/riders are injected by placement bindings and are effectively
  locked by the current contract.
- Vite is serving the current map implementation from `127.0.0.1:4904`:
  the loaded modules include app-owned zoom controls, route marker click
  plumbing, and RideHailing ordering no longer passes the placement straight
  line as `plannedPolyline`.
- On 2026-06-19, `partner-up.local` and `api.partner-up.local` were missing
  from `portless list` while the direct frontend/backend ports were healthy.
  They were restored with portless aliases to the active dev ports.
- The current portless proxy is in LAN mode and registers `.local` routes.
  Running `pnpm dev:ensure` without LAN arguments still waits for
  `.localhost` routes, so it can false-negative and start another server
  attempt even when `.local` aliases are healthy.
- The route map zoom buttons were visible but not clickable because Tencent
  map DOM inside `.map-shell__canvas` could sit above the app-owned controls
  and intercept pointer events. The map shell and canvas now establish stacking
  contexts, the canvas is pinned below the app-owned controls, and zoom button
  clicks stop propagation before reaching map gesture handlers.

## Open Design Questions

- Which details from the uniapp RideHailing ordering implementation should be
  preserved, simplified, or removed for the web MVP?
- Which fields are review-only for MVP: route, departure time, riders?
- Should contact phone stay outside the main ordering drawer and use a separate
  phone-acquisition flow?
- How should quote states appear:
  `未估价`, `估价中`, `部分车型不可用`, `全部不可用`, provider failure?
- What is the minimum route text summary needed beside the map?
- Should vehicle cards show only final quote amount, or also provider estimate
  context such as price range / unavailable reason?

## Human Confirmation Boundary

Before implementation, perform an Impact Handshake covering:

- whether implementation means wireframe artifact work or production Vue work
- exact files and symbols to change
- information architecture from current UI to proposed UI
- invariants: real create-order path, evaluation command shape, locked binding
  authority, scenario test IDs
- verification plan

## Verification

Completed verification:

- `pnpm check:type:frontend`
- `pnpm check:type:backend`
- `curl -I http://127.0.0.1:4904/order/new` returned 200 from Vite.
- `curl -I http://127.0.0.1:4229/health` returned 200 from backend.
- `portless list` shows:
  - `https://partner-up.local -> localhost:4904`
  - `https://api.partner-up.local -> localhost:4229`
- `curl -k -I https://partner-up.local/order/new` returned HTTP/2 200.
- `curl -k -I https://api.partner-up.local/health` returned HTTP/2 200.
- Direct Vite module fetch confirmed the live dev server contains the map
  correction code in `RideHailingOrderingPanel.vue`, `RouteMap.vue`, and
  `Map.vue`.
- Fake `window.TMap` browser repro confirmed the failure mode: a high-z-index
  child inside `.map-shell__canvas` intercepted clicks on the visible zoom
  button.
- With the fixed stacking rules applied, the fake-map repro hit the plus icon
  and changed zoom `14 -> 15 -> 14`.
- `pnpm check:type:frontend`

Expected after broader implementation:

- for wireframe work:
  - static artifact renders locally
  - automated test asserts required sections/states/test IDs
  - optional screenshot evidence for Pixel 7
- `pnpm check:type:frontend`
- focused scenario coverage if test IDs or browser-visible behavior changes
- manual browser pass through PR placement -> `/order/new`

## Next Step

Confirm in browser from a real PR placement entry into `/order/new`. If the
running Vite server still serves the old `Map.vue` style module, restart the
frontend dev server before retesting zoom controls.
