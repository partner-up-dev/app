# Anchor Event Route Pool

## New Product Scope

Anchor Event can provide a route pool for event-assisted PR creation, parallel to the current location pool.

Invariant:

- One Anchor Event can own a `locationPool` or a `routePool`.
- One Anchor Event cannot own both pools at the same time.
- This event-level pool mode does not force all PRs of the same `type` to use the same place mode globally.

## Route Pool Shape

Draft shape:

```ts
type AnchorEventRoutePoolEntry = {
  id: string;
  route: PRRoute;
};

type AnchorEventRoutePool = AnchorEventRoutePoolEntry[];
```

Notes:

- `route` uses the same ordered point schema as `PR.route`.
- The route display title is derived from `route[0].name~route[-1].name`.
- `id` gives event-owned stable identity for UI selection and admin editing. It is not persisted onto PR as route identity unless a later contract needs provenance.

## Normalized Place Option Shape

Anchor Event UI should consume a normalized place-option list instead of directly binding each surface to `locationPool` or `routePool`.

Draft shape:

```ts
type AnchorEventPlaceOption =
  | {
      kind: "location";
      id: string;
      label: string;
      coordinate: CoordinatePair | null;
      disabled: boolean;
      disabledReason: "NONE" | "MAX_REACHED" | "TIME_UNAVAILABLE";
    }
  | {
      kind: "route";
      id: string;
      label: string;
      route: PRRoute;
      disabled: boolean;
      disabledReason: "NONE" | "MAX_REACHED" | "TIME_UNAVAILABLE";
    };
```

Notes:

- The raw Anchor Event pool invariant still applies: one event owns `locationPool` or `routePool`.
- The read model may still expose location and route items through one dropdown when the event-assisted creation context has valid place sources for both kinds.
- Each place option carries enough geometry for map rendering and viewport fitting.

## Event-Assisted Create

Location-pool event:

- Event-assisted create continues to resolve selected POI/location into `fields.location`.
- Submitted PR has `route: null`.

Route-pool event:

- Event-assisted create resolves selected route-pool entry into `fields.route`.
- Submitted PR has `location: null`.
- POI availability and meeting-point fallback short-circuit through `location: null`.

## Form Mode UI Upgrade

Current Form Mode `Location Selector` should become `Anchor Event Carousel Place Selector`.

For POI entries:

- Card continues to use gallery image when available.
- Title falls back to POI/name behavior already used by Form Mode.
- Missing location application entry remains location-mode only.

For route entries:

- Card renders a map preview with markers and planned or fallback polyline.
- Card title is `route[0].name~route[-1].name`.
- Selection value carries route-pool entry id and route payload needed for recommendation/create commands.

## Card/List Mode Create Control Upgrade

Current creation card location form control should become an `Anchor Event Inline Place Selector`.

Target behavior:

- The dropdown lists normalized place options and can include both location and route options.
- Location options render as standalone markers on the compact map preview.
- Route options render route markers plus planned or fallback polyline on the compact map preview.
- Existing option availability labels carry forward for both location and route options.
- The active dropdown item controls event-assisted create payload assembly.
- When the active item changes, the map viewport moves to fit the active marker or active route bounds, keeps the geometry centered, keeps it fully visible, and preserves appropriate padding.

Affected frontend surfaces:

- `apps/frontend/src/domains/event/ui/controls/form-mode/FormModeLocationControl.vue`
- `apps/frontend/src/domains/event/ui/surfaces/AnchorEventFormModeSurface.vue`
- `apps/frontend/src/domains/event/ui/primitives/EventPRCreateCard.vue`
- `apps/frontend/src/domains/event/ui/surfaces/AnchorEventListModeSurface.vue`
- `apps/frontend/src/domains/event/ui/surfaces/AnchorEventCardModeSurface/AnchorEventCardModeSurface.vue`
- `apps/frontend/src/domains/event/use-cases/useEventAssistedPRCreateFlow.ts`

## Backend Contract Impact

Likely backend surfaces:

- `apps/backend/src/entities/anchor-event.ts`
- `apps/backend/src/domains/anchor-event/use-cases/get-form-mode-data.ts`
- `apps/backend/src/domains/anchor-event/use-cases/get-event-detail.ts`
- `apps/backend/src/domains/anchor-event/use-cases/list-events.ts`
- event-assisted create command preparation and recommendation payloads.

Contract changes:

- Anchor Event entity gains nullable or default-empty `routePool`.
- Anchor Event validation enforces `locationPool` and `routePool` mutual exclusion.
- Form Mode bootstrap returns `places` or a typed place projection instead of location-only data.
- Event detail create time windows expose `placeOptions` or route-aware option payloads.
- Event-assisted create accepts the chosen place mode and resolves it into `PartnerRequestFields.location` or `PartnerRequestFields.route`.

## Verification

- Backend tests for Anchor Event pool mutual exclusion.
- Backend tests for route-pool event-assisted create producing `location: null` and populated `route`.
- Frontend tests for place display helpers and selector view models.
- Browser verification for `/e/:eventId` Form Mode route selection.
- Browser verification for Card/List Mode creation card route selection.
