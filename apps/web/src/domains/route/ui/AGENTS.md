# Route UI Local Rules

This folder owns generic route-domain editing and display components. PR,
Anchor Event, commerce, and admin surfaces consume these components and map
their own payloads into route-domain shapes.

## Component Contracts

- `RouteEditor.vue`: generic route editor with compact route rows, waypoint add/remove, map preview toggle, and `LocationPicker` handoff for point selection.
- `RouteMap.vue`: generic route display wrapper over `shared/map/Map.vue`; consuming domains own payload conversion and planned polyline sourcing.
- `RoutePointList.vue`: generic compact/detail ordered route-point list with role dots; consuming domains choose whether to show addresses.

## Boundaries

- Keep generic route geometry and point-list behavior here.
- Keep PR-specific place-mode policy, event route-pool policy, and commerce route copy in their owning domains.
