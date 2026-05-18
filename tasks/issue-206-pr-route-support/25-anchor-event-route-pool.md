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

Anchor Event UI should consume a backend-owned normalized place-option contract instead of deriving the active pool from separate `locationPool` / `routePool` arrays in frontend code.

Draft shape:

```ts
type AnchorEventPlacePoolView =
  | {
      kind: "location";
      label: "地点";
      placeholder: "选择地点";
      applyLabel: "申请新地点";
      options: AnchorEventLocationPlaceOption[];
    }
  | {
      kind: "route";
      label: "路线";
      placeholder: "选择路线";
      applyLabel: "申请新路线";
      options: AnchorEventRoutePlaceOption[];
    }
  | {
      kind: "none";
      label: "地点";
      placeholder: "暂无可选地点";
      applyLabel: null;
      options: [];
    };
```

Notes:

- The raw Anchor Event pool invariant still applies: one event owns `locationPool` or `routePool`.
- Backend decides the active place pool and exposes one normalized option list for each create surface.
- Event-assisted creation reads one active place source per Anchor Event. Route-pool events expose route options; location-pool events expose location options.
- Each place option carries enough geometry for map rendering and viewport fitting.
- Frontend keeps only defensive validation for malformed API data. It should not determine the active pool by checking whether route arrays are non-empty.

## User-Facing Copy Rules

Visible labels should name the active pool type:

- Location-pool event: selector label `地点`, placeholder `选择地点`, application action `申请新地点`.
- Route-pool event: selector label `路线`, placeholder `选择路线`, application action `申请新路线`.
- Empty/no-pool event: selector label follows the event's configured or backend-derived place kind when available; fallback copy should avoid implying that both kinds are available.

Copy ownership:

- Backend owns the active pool kind and can provide stable copy hints or label keys as part of `AnchorEventPlacePoolView`.
- Frontend locale owns final human copy rendering from backend-provided kind/keys.
- Shared selector components should receive concrete strings such as `label`, `placeholder`, and `applyLabel`; they should not hard-code combined copy like `地点 / 路线`.

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
- Missing location application entry appears only when the active Anchor Event pool is the location pool.

For route entries:

- Card renders a map preview with markers and planned or fallback polyline.
- Card title is `route[0].name~route[-1].name`.
- Selection value carries route-pool entry id and route payload needed for recommendation/create commands.
- Route-pool events should expose an application entry for user-submitted routes when route application is enabled.

## Route Application

Route-pool events need a user-facing `申请新路线` path parallel to missing-location application.

First-version route application scope:

- The entry point appears only for route-pool events.
- The creation surface should use the generic `RouteEditor` and `LocationPicker` flow, so users can build a route with departure, arrival, and optional waypoints.
- Submitted application payload should carry the same route point schema as `PR.route`.
- Admin review can start as a queue/list equivalent to location applications, or as an explicit route application type if the current location application domain cannot carry route payload safely.
- Accepted route applications should add a route entry to the Anchor Event route pool or otherwise become selectable through the backend-owned place-option contract.

Open route application design points:

- Whether route applications reuse the existing location application workflow with a new `kind` field, or get a separate `route_application` backend owner.
- Whether accepted user-submitted routes are event-local route-pool entries, POI-like reusable resources, or both.
- Whether route applications need duplicate detection against existing route pool entries.

## Card/List Mode Create Control Upgrade

Current creation card location form control should become an `Anchor Event Inline Place Selector`.

Target behavior:

- The dropdown lists normalized place options from the Anchor Event's active pool only.
- Location-pool events render location options as standalone markers on the compact map preview.
- Route-pool events render route options as route markers plus planned or fallback polyline on the compact map preview.
- Existing option availability labels carry forward for the active option kind.
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

Implemented Slice 4 contract:

- Anchor Event entity stores default-empty `routePool`.
- Route pool entries use `{ id, route }`; `route` uses the same schema as `PR.route`.
- Anchor Event validation and database checks enforce `locationPool` and `routePool` mutual exclusion.
- Form Mode bootstrap returns existing `locations` plus `routes` for route-pool entries.
- Event detail create time windows expose existing `locationOptions` plus `routeOptions`.
- Event-assisted create accepts `routePoolEntryId`; backend resolves it into `PartnerRequestFields.route` and clears `location`.
- Location-pool event-assisted create keeps the existing location-mode payload path.

Target backend-owned place-option contract:

- Event detail create time windows should expose active-pool `placeOptions` rather than parallel `locationOptions` and `routeOptions` for frontend selection.
- Form Mode bootstrap should expose active-pool place selector data rather than parallel `locations` and `routes` for frontend selection.
- Backend should attach availability state, disabled reason, option label, route payload or location geometry, and pool provenance to each option.
- Backend should attach the selector copy key/string needed by frontend controls.
- Event-assisted create should continue accepting route-pool provenance (`routePoolEntryId`) for route options and location identity for location options.

## Verification

- Backend tests for Anchor Event pool mutual exclusion.
- Backend tests for route-pool event-assisted create producing `location: null` and populated `route`.
- Frontend tests for place display helpers and selector view models.
- Browser verification for `/e/:eventId` Form Mode route selection.
- Browser verification for Card/List Mode creation card route selection.
