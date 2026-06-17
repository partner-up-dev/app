# UI Runtime Audit

## Ordering Page

Current topology:

- shell: `apps/frontend/src/pages/OrderingFromPlacementPage.vue`
- ride content: `apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingPanel.vue`

Current problems:

- the page still carries the semantics of a real create-order surface while
  actually routing to support handoff
- the ride panel has no explicit visible contact input
- the ride panel exposes almost no editable structure for route/time/riders
- the current UI feels like an internal verification branch rather than a buyer
  decision surface

## Order Detail Page

Current topology:

- `apps/frontend/src/pages/CommerceOrderDetailPage.vue`

Current problems:

- ride and rental detail responsibilities are mixed into one page file
- the ride map is a CSS illustration rather than a real route map surface
- whole-order polling every 1.5 seconds is a coarse high-frequency strategy
- the page exposes minimal ride-specific actions and limited lifecycle framing

## Practical Runtime Checkpoints

When dev servers are running, validate these checkpoints in-browser:

1. PR placement -> `/order/new` opens with correct route, riders, and contact
   prefill.
2. Ride quote list shows provider-backed availability and price ranges.
3. Create success navigates to `/orders/:orderId`, not `/order/support`.
4. Order detail shows real route geometry, not a placeholder illustration.
5. Provider state progression is understandable from the page without reading
   internal terms.
6. Final bill/payment transition is visible and coherent.

## Working Rule

Do not begin visual polish before the page responsibilities are corrected.
First fix topology, then tune information architecture, then tune styling.
