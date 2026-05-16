# Target Contract And Decisions

## Product Claim Draft

PR supports two place modes:

- `location` mode: the current single named place behavior.
- `route` mode: an ordered route from departure to arrival, optionally with waypoints.

The place mode contributes to:

- PR detail title fallback.
- PR share title/description.
- PR facts card.
- Preview cards and history/event/admin surfaces.

## Backend Route Point Draft

Coordinate tuple proposal aligns with current POI coordinate fields:

```ts
type CoordinatePair = [lat: number, lng: number];

type PRRoutePoint = {
  wgs84: CoordinatePair | null;
  bd09: CoordinatePair | null;
  gcj02: CoordinatePair | null;
  name: string;
  full_address: string | null;
};

type PRRoute = PRRoutePoint[];
```

Schema policy:

- route is `null` or an ordered list.
- route mode requires at least two points.
- each point requires non-empty `name`.
- each point requires at least one coordinate pair for map rendering.
- frontend map rendering prefers `gcj02`, then `wgs84`, then `bd09`.
- backend stores exactly the submitted route points and validates shape at the API boundary.

## Place Mode Invariant

One PR owns one place mode at a time:

- location mode: `location` has meaningful text and `route` is `null`.
- route mode: `route` has at least two route points and `location` is `null`.
- draft mode can temporarily carry neither only if existing create/edit behavior requires incomplete drafts.

This needs explicit confirmation because the issue wording says location and route are mutually exclusive, while existing draft create flows can create incomplete PRs.

## Display Label Draft

Route summary helper:

- compact title format: `{route[0].name}~{route[-1].name}`
- each side is truncated independently so the joined summary stays within 16 characters
- Chinese UI copy can render `起点 -> 终点` or `起点 到 终点`.

Recommended fallback order:

- explicit title
- route summary
- location
- type
- generic PR label

Share description should include route summary in the same slot where location appears today.

Sharing note:

- PR core decides the compact canonical title summary only.
- WeChat group, Moments, Xiaohongshu, and other PR Sharing surfaces may place richer route context in their own description fields.
- Those richer sharing descriptions stay owned by the corresponding PR Sharing surfaces.

## API Contract Draft

Extend `PartnerRequestFields`:

```ts
type PartnerRequestFields = {
  title?: string;
  type: string;
  time: [string | null, string | null];
  location: string | null;
  route: PRRoute | null;
  minPartners: number | null;
  maxPartners: number | null;
  partners: number[];
  budget: string | null;
  preferences: string[];
  notes: string | null;
  meetingPoint?: MeetingPointConfig | null;
};
```

Extend `PRDetail.core`:

```ts
core: {
  type: string;
  time: [string | null, string | null];
  location: string | null;
  route: PRRoute | null;
  placeDisplayName: string | null;
  ...
}
```

`placeDisplayName` is a backend-derived display helper that keeps frontend cards from recreating route-vs-location fallback logic.

## Admin Contract Draft

Admin PR basic surface should allow:

- choose place mode
- edit `location` text for location mode
- edit route points for route mode
- clear the inactive mode during submit

Admin list/selector previews should use backend-derived display helpers when available.

## Map Contract Draft

Frontend components:

- `SegmentedControl.vue`: shared UI primitive for two-or-more mutually exclusive choices; PR place-mode selection is the first route-support consumer.
- `Map.vue`: shared product-facing map component with typed marker/polyline props and no PR-specific domain coupling.
- `shared/map/tencent/*`: Tencent JavaScript API GL provider/adapter used by `Map.vue`.
- `PRRouteEditor.vue`: ordered point editor with inline and immersive variants.
- `PRRoutePointRow.vue`: one point editor row.
- `PRRouteMap.vue`: route display composed on top of `Map.vue`, with a graceful static/list fallback when unavailable.
- `pr-route.ts`: pure model helpers for validation, display label, coordinate preference, and marker/polyline projection.

Config:

- Route planning uses Tencent Direction WebService in the first implementation.
- Map rendering still uses a graceful fallback when Tencent SDK or route planning fails.
- Add public Tencent map key only if frontend directly loads JavaScript API GL.
- Direction WebService direct frontend calls are acceptable for the first version when WebServiceAPI browser domain whitelist key controls are configured.
- Backend proxy remains an optional future path for key governance, quota controls, or response normalization.
- Planned polyline is computed on demand; the first implementation keeps no planned-polyline cache.

Viewport behavior:

- Map wrappers accept an active geometry id and fit-padding value.
- A location option active state fits the single marker.
- A route option active state fits marker and polyline bounds together.
- Active geometry changes from dropdown, carousel, or modal selection keep the selected marker/polyline centered and fully visible with padding.

## PR Facts Card Route Draft

- Location remains the existing location row.
- Route is a separate facts row.
- Interactive route rows use `InfoRowAction` with the route summary as value.
- Clicking the Route row right action opens a modal containing the route map.
- The modal falls back to a point list when Tencent SDK loading or Direction planning fails.

## First-Version Domain Decisions

- Route mode persists `location` as `null`.
- Existing location-driven POI availability checks short-circuit when `location` is `null`.
- Automatic Anchor Event and POI meeting-point fallbacks stop when `location` is `null`; route-mode PRs can still carry a PR-specific meeting point.
- Route mode may still carry a PR-specific meeting point if the existing form surface keeps that field available.
- Event-wide support resources still materialize for route-mode PRs, while location-scoped support resources require a non-empty event-scoped location.
- Waitlist alternative reminders stay exact type plus exact location; route-mode PRs stay out of that matcher until a route matcher exists.
- Anchor Event Form Mode location recommendation and full-PR expansion use only event-scoped location PRs.
- Natural-language route parsing is a follow-up capability.
- First-version creation/editing scope covers structured PR create, creator edit, Admin PR management, and event-assisted create from Anchor Event route pool.

## Anchor Event Route Pool Draft

Anchor Event can own one place pool mode:

- `locationPool`: current POI/name-backed event place set.
- `routePool`: ordered route entries for route-mode PR creation.

Mutual exclusion:

- `locationPool` and `routePool` cannot both contain entries on the same Anchor Event.
- The pool mode only constrains that Anchor Event's assisted creation and discovery surface. It does not globally constrain all PRs with the same `type`.

Event-assisted create:

- location-pool selection maps to `PartnerRequestFields.location`.
- route-pool selection maps to `PartnerRequestFields.route` and clears `location`.
- backend accepts an optional `routePoolEntryId` for event-assisted create and resolves it against the current Anchor Event `routePool`; when the id is absent, an exact submitted-route match can resolve the selected route entry.

Selector contract:

- Form Mode `Location Selector` becomes `Anchor Event Carousel Place Selector`.
- Card/List creation card location control becomes `Anchor Event Inline Place Selector`.
- POI place cards keep gallery -> name fallback.
- Route place cards render map with markers and polyline; title uses `route[0].name~route[-1].name`.
- Card/List inline dropdown consumes normalized place options and may list both location and route items.
- Location dropdown items render as standalone map markers.
- Route dropdown items render markers plus planned or fallback polyline.
- Dropdown active item changes fit the map viewport to the selected marker or route bounds with padding.

Slice 4 implementation:

- `AnchorEvent.routePool` is stored as a default-empty JSONB array of `{ id, route }` entries.
- `locationPool` and `routePool` mutual exclusion is enforced at the Admin use-case layer and by the database migration check constraint.
- Public event list/detail and Form Mode bootstrap expose `routePool`/`routes` alongside existing location projections.
- Event-assisted route-pool create persists route mode by resolving `routePoolEntryId` into `PartnerRequestFields.route` and writing `location: null`.

## Open Questions For Human Confirmation

1. Should the first implementation require route points to have coordinates, or allow name-only route points with map omitted?
2. Should route mode be allowed for draft PRs with one missing endpoint during editing?
3. Which frontend surfaces should display planned polyline versus point list fallback when Direction WebService planning fails?
4. Should Form Mode recommendation accept route-pool place selection in the first version, or should route-pool events skip recommendation and use only assisted create?
