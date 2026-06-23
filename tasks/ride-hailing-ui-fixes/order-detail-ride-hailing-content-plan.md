# RideHailing Order Detail Content Redesign Plan

## Purpose

This slice corrects the RideHailing Order Detail surface. The current web
implementation is a generic order-detail card stack plus a static fake route
illustration; it does not match the RideHailing full-screen map + bottom panel
interaction model already used by the RideHailing ordering flow and the legacy
uniapp reference.

## Classification

- Primary input route: `Reality`
- Current mode: `Execute`
- Production-code mutation was performed after Impact Handshake and explicit
  `开始`.

## Current Facts

- Route page: `apps/frontend/src/pages/CommerceOrderDetailPage.vue`.
- Current page uses `PuPageScaffold viewport="screen"` without
  `padding="none"`.
- RideHailing detail UI currently lives inline inside
  `CommerceOrderDetailPage.vue`; there is no extracted
  `RideHailingOrderContent` component yet.
- Current RideHailing detail map is a CSS placeholder:
  `order-detail-page__ride-map`, `order-detail-page__ride-polyline`, and
  callout blocks.
- Existing `RouteMap` already supports immersive full-height route display,
  planned polylines, callouts, fit padding, and marker rendering.
- Backend detail projection already provides the facts needed by the UI:
  - `rideHailing.route`
  - `rideHailing.departureAt`
  - `rideHailing.riders`
  - `rideHailing.selectedVehicleName`
  - `rideHailing.provider.providerOrderId`
  - `rideHailing.executionPhase`
  - `rideHailing.driver` / `rideHailing.live.driver`
  - `rideHailing.vehicle` / `rideHailing.live.vehicle`
  - `detail.bill`
  - `detail.payment.status`
- Current RideHailing scenario test depends on these semantic nodes:
  - `order-detail.page`
  - `order-detail.ride-hailing.page`
  - `order-detail.ride-hailing.selected-vehicle`
  - `order-detail.ride-hailing.route-summary`

## Reference Findings

Reference:

`/mnt/f/CODING/Project/Anana/Application/uniapp/src/sub_packages/ride_hailing/pages/order.vue`

The reference is a RideHailing ordering page, not an order-detail page, so it
should not be copied literally. The useful layout model is:

- full-screen map owns the visual background
- bottom panel overlays the map
- panel can fold / normal / expand
- compact footer/action area is visually separated from the scrollable panel
  content
- route/time/passenger/order facts are grouped in the panel, not scattered as
  generic cards above a map

For the web Order Detail slice, the corresponding shape should be:

- `CommerceOrderDetailPage` becomes a no-padding `PuPageScaffold`
- RideHailing orders render a dedicated `RideHailingOrderContent`
- `RideHailingOrderContent` owns:
  - full-screen `RouteMap`
  - `PuFloatPanel` bottom sheet
  - order status / vehicle / driver / route / rider / provider facts
  - bill/payment action when `detail.bill` exists
- Rental order detail keeps the existing generic card stack path.

## Proposed UI Topology

```text
CommerceOrderDetailPage
├─ PuPageScaffold viewport="screen" padding="none"
├─ header: PuPageHeader
└─ body
   ├─ loading / error states
   ├─ if rideHailingDetail:
   │  └─ RideHailingOrderContent
   │     ├─ RouteMap immersive full-screen
   │     └─ PuFloatPanel
   │        ├─ status hero row
   │        ├─ ride facts
   │        ├─ driver / vehicle facts when available
   │        ├─ route / riders facts
   │        └─ bill/payment action when available
   └─ else:
      └─ existing Rental detail card stack
```

## Implemented Shape

- `CommerceOrderDetailPage.vue` uses
  `PuPageScaffold viewport="screen" width="full" padding="none"`.
- Page-level responsibilities remain:
  - route param parsing
  - order detail query
  - RideHailing polling
  - Rental cancellation / booking-confirmation mutations
  - Rental card-stack rendering
- RideHailing detail rendering is extracted to:
  `apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue`.
- `RideHailingOrderContent` owns:
  - immersive `RouteMap`
  - `PuFloatPanel` bottom panel with overview / detail / expanded stops
  - RideHailing status, vehicle, route, departure time, riders, provider order,
    driver, vehicle, and bill/payment action display
- Existing RideHailing semantic test ids are preserved on equivalent nodes.

## Implementation Notes

- New component should live under
  `apps/frontend/src/domains/commerce/ui/order-detail/` because the UI is
  Commerce-domain order detail content, not a generic page shell.
- `CommerceOrderDetailPage.vue` should keep data fetching, route parsing,
  mutations, and polling.
- `RideHailingOrderContent.vue` should be presentational with typed props:
  `detail`, `ride`, and preformatted labels/callbacks only when the page owns
  the behavior. It should not fetch order detail itself.
- The current scenario test IDs should be preserved on equivalent semantic
  nodes.
- Use `PuDescriptionList` / `PuDescriptionItem` for compact read-only facts
  where they fit; use local layout only for RideHailing-specific map/panel
  composition.
- Use `RouteMap` rather than CSS placeholder map.
- Use `PuFloatPanel` rather than hand-built resizer logic.

## Open Review Points

- Whether this slice should also add explicit phase-advance Admin/manual test
  instructions for checking each Order Detail state. The fake control now
  exists, but browser-driven visual verification may still be manual.
- Whether pending-payment (`FINISHED` with bill) should place the payment CTA in
  the panel footer or inside the panel content. Initial recommendation: keep it
  inside the panel content for this slice and avoid introducing another bottom
  action bar contract until the visual review requires it.
- Whether driver/vehicle unavailable state should show placeholder copy or
  hide those sections. Initial recommendation: show compact placeholders for
  state clarity before assignment; hide only values that would produce empty
  visual noise.

## Verification

- `pnpm check:type:frontend`
- `pnpm exec biome check` on changed frontend and task files
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`
- Browser/manual check for RideHailing Order Detail:
  - dispatching / accepted / in-trip / pending-payment states
  - map visible and bottom panel usable at mobile viewport
  - payment CTA visible only when bill exists
