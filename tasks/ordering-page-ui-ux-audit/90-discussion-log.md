# Discussion Log

## 2026-06-03

User asked what the current Ordering Page layout is and requested ASCII-art plus a screenshot using mock DB or scenario-test-like data.

Findings:

- The route is `/order/new`, not `/ordering/*`.
- The route component is `OrderingFromPlacementPage.vue`.
- Entry data comes from `sessionStorage["partner-up.ordering-entry"]`.
- Rental and RideHailing are separate content components under the same page shell.
- Real scenario verification passes for the targeted Rental full ordering workflow.
- Mock-payload screenshots exposed severe mobile layout and UX issues, especially footer/content collision and unclear disabled CTA state.

User then requested a poly-file task packet and stated that Ordering Page plus Rental/RideHailing Ordering Content have serious UI/UX problems.

Action taken:

- Created this task packet.
- Copied screenshot evidence into `tasks/ordering-page-ui-ux-audit/evidence/`.
- No implementation started.

## 2026-06-03 Target Layout Reference

User clarified that the target Ordering Page layout should be close to:

`F:\CODING\Project\Anana\Application\uniapp\src\sub_packages\ride_hailing\pages\order.vue`

Investigation result:

- The legacy target is a map-first ride-hailing ordering surface.
- Route map is fixed full-screen behind the content.
- Ordering controls live in a draggable bottom panel.
- Panel has folded, normal, and expanded states.
- Panel content scroll height explicitly subtracts footer height and drag handle height.
- Footer is absolute inside the panel and owns departure time, estimated total, primary order CTA, and safe-area inset.
- Vehicle options are compact horizontal choice rows with provider/car identity, preview image, price, and checkbox.

Action taken:

- Added `50-target-layout-reference.md`.
- Updated candidate next slices with legacy layout translation work.

## 2026-06-03 Refined Target Layout

User clarified that the legacy uniapp ride-hailing order page should not be copied 1:1. The target is more generic:

- Use `FullScreenPageScaffold` and keep the page exactly `100vh`.
- Use a small `PageHeader` variant.
- Stretch `OrderingContent` to fill the space between `PageHeader` and `BottomActionBar`.
- Use a `BottomActionBar` matching estimated total plus place-order CTA.
- Put a chevron-up beside estimated total; tapping opens a `BottomDrawer` for price details.
- RideHailing content should be fixed/full-screen route map plus bottom sheet panel containing drag handle, passengers, and ride type price rows only.
- Rental content should follow a traditional commerce place-order drawer: SPU card, SKU-expanded configuration, person count, contact, participant identity info.
- Errors/blockers should float above normal layout via absolute/fixed overlay layers instead of mixing into normal content flow.

Action taken:

- Added `55-refined-target-layout.md`.
- Updated `50-target-layout-reference.md` to mark the legacy page as reference only.
- Updated `40-next-slices.md` to align slices with the generic shell/content/action-layer model.

## 2026-06-03 Boundary And Map Correction

User clarified two additional constraints:

- `SurfaceCard: 已从 PR 锁定` over-couples Order and PR and should be stopped/deleted at the presentation level.
- RideHailing should not create a fake map-like route section. The app already has map components, so Ordering should reuse/enhance them. For callouts, investigate whether Tencent LBS supports them.

Investigation result:

- Existing MVP frontend map stack exists under `shared/map` and `domains/route`.
- `RouteMap` already uses `SharedMap`, markers, polylines, Tencent driving route planning, and an immersive variant.
- `RideHailingOrderingContent.vue` currently hand-rolls `.ride-content__map`, `.ride-content__polyline`, and route callout buttons; this should be removed in a future implementation slice.
- The user-provided Tencent component-marker page documents the URL-based location display component, not the best fit for current JS GL map abstraction.
- Tencent JS GL official docs show relevant `MultiMarker` and `MultiLabel` capabilities for marker text/label rendering and events.

Action taken:

- Added `56-boundary-and-map-corrections.md`.
- Updated problem map, refined target layout, and next slices.

## 2026-06-03 Visual Treatment Constraints

User clarified:

- Rental target did not mention `SurfaceCard`, but implementation should actively avoid card-heavy UI where possible.
- RideHailing option rows should be treated as `RideHailing SKU Card`.
- The visual reference for RideHailing SKU Card should be legacy `Application/uniapp/src/sub_packages/ride_hailing/components/rideTypeDisplay/rideTypeDisplay.vue`.

Action taken:

- Added `57-visual-treatment-constraints.md`.
- Updated refined target layout and next slices to avoid repeated `SurfaceCard` in Rental.
- Updated RideHailing target language from generic ride type price rows to `RideHailing SKU Card`.

## 2026-06-03 Modification Plan

User requested a modification plan.

Action taken:

- Added `60-modification-plan.md`.
- Plan splits implementation into shell/action bar, Rental rewrite, RideHailing real map, RideHailing SKU Card bottom sheet, optional shared map callout enhancement, and cleanup/scenario alignment.
- No production implementation started.

## 2026-06-03 Component Split Plan

User asked whether the modification plan is ready on component splitting.

Finding:

- The existing plan had slice boundaries but not enough concrete component boundaries.

Action taken:

- Added `65-component-split-plan.md`.
- Updated `60-modification-plan.md` with concrete target files and component boundaries.
- No production implementation started.
