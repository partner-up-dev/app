# Boundary And Map Corrections

## Status

This records stronger constraints raised after the refined target layout.

## Stop Order/PR Presentation Coupling

The current Rental content has a visible section:

```text
SurfaceCard: 已从 PR 锁定
  服务时间与人数
  人数 / 开始 / 结束
```

This is a product boundary problem.

Ordering can receive context from a PR placement entry, and the create-order command can still carry `prId` as backend command context. But the user-facing Order page should not frame order fields as "PR locked" or make the Order UI feel like a PR-detail extension.

Target correction:

- Delete the explicit "已从 PR 锁定" concept from Ordering UI.
- Treat time, participants, quantity, contact, route, and selected SKU/ride type as order configuration or service facts.
- If a field is immutable because it came from upstream context, express that locally as a clear order constraint, not as a PR-owned section.
- Keep PR identity out of product configuration components unless a specific navigation affordance is intentionally designed.

Boundary rule:

```text
PR placement may source an ordering entry.
Order UI must not present itself as "PR-locked" state.
Order content should speak in order/service/product language.
```

## Stop Map-Like Route Section

Current `RideHailingOrderingContent.vue` hand-rolls a visual map-like section:

```text
section.ride-content__map
  div.ride-content__polyline
  button route-callout origin
  button route-callout destination
```

This should be removed, not polished.

The repository already has a real map path:

- `apps/frontend/src/shared/map/Map.vue`
- `apps/frontend/src/shared/map/types.ts`
- `apps/frontend/src/shared/map/tencent/tencent-lbs-provider.ts`
- `apps/frontend/src/domains/route/ui/RouteMap.vue`
- `apps/frontend/src/domains/route/model/route.ts`
- `apps/frontend/src/domains/route/model/route-planning.ts`

Current map capability:

- `SharedMap` wraps Tencent LBS JS GL.
- `RouteMap` projects route points into map markers and polylines.
- Route planning can fetch Tencent driving route plans.
- `variant="immersive"` exists.
- Markers currently support `id`, `position`, `label`, `title`, `tone`, `icon`, and `active`.
- Provider currently uses `TMap.MultiMarker` and `TMap.MultiPolyline`.

Target correction:

- RideHailing Ordering Content should use `RouteMap` or a route-ordering-specific wrapper around `SharedMap`.
- The map should be fixed/full-screen or full-stage inside `OrderingContent`.
- Any callout/label behavior should be added to the shared map abstraction or route map domain component, not recreated as CSS boxes over a fake map.

## Tencent LBS Callout Research

User-provided document:

- `https://lbs.qq.com/webApi/component/componentGuide/componentMarker`

Finding:

- This page documents Tencent's "位置展示组件" / `poimarker` URL component.
- It supports marker data with `coord`, `title`, and `addr`.
- It is URL/component oriented and has visible limitations such as a maximum of 4 marker entries via URL and title/address length constraints.
- It is not the best direct integration point for our existing JS GL `SharedMap` implementation.

More relevant official docs:

- Tencent JavaScript API GL `MultiMarker`: `https://lbs.qq.com/webApi/javascriptGL/glDoc/glDocMarker`
- Tencent JavaScript API GL `MultiLabel`: `https://lbs.qq.com/webApi/javascriptGL/glDoc/glDocLabel`

Relevant confirmed capability:

- `MultiMarker` supports marker `content` and marker text style options such as text color, direction, offset, padding, background color, background border, and background radius.
- `MultiMarker` supports click/touch events through `on(...)`.
- `MultiLabel` supports standalone text labels with styled background, border, radius, padding, collision options, geometry events, and `content`.

Interpretation:

- For simple always-visible callout text near route markers, first candidate is enhancing `MapMarker` and `tencent-lbs-provider` to use `MarkerStyle` text/background options and marker `content`.
- If richer callout styling or collision behavior is needed, candidate is adding `MultiLabel` support to `SharedMap`.
- If tappable rich callouts are needed, candidate is adding marker/label event emission from provider to `SharedMap` and then to `RouteMap`.
- A custom DOM overlay is possible, but should be a deliberate `SharedMap` capability, not a product-specific fake map.

## Implementation Guardrails For Future Slice

- Do not keep `ride-content__map`, `ride-content__polyline`, or CSS route callout buttons as the final RideHailing map.
- Do not add another map abstraction under commerce ordering if route-domain `RouteMap` or shared `Map` can be extended.
- Do not encode PR display semantics in `RentalOrderingContent`.
- If map callouts are required, update the shared `MapMarker`/provider contract or add a typed `MapLabel` contract.
- Verify with browser screenshots and, where possible, canvas/DOM checks that the real Tencent map or fallback renders correctly.
