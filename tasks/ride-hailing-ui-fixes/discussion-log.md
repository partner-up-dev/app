# Discussion Log

This file is the current working discussion surface. Keep it short enough to
reload at the start of a slice.

Archived full history:

- `archive/discussion-log-ordering-through-order-detail-map.md`

## Current Segment: RideHailing Order Detail PuFloatPanel Content

- Result:
  `RideHailingOrderContent` now replaces the raw JSON diagnostic panel with the
  reviewed content model.
- Status Hero:
  panel header contains status title and status description on the left.
  Cancellation, when available, sits immediately to the left of the more
  operation button on the right. This header should stay a single row on narrow
  screens; the actions side must not shrink, and the status copy side absorbs
  tight width.
- Dispatching-only SKU list:
  while dispatching, render the placed RideHailing SKU candidate list
  immediately after Status Hero. Reuse the `RideHailingSkuCard` visual shape in
  readonly mode: non-selectable and no checkbox.
- Projection decision:
  Order Detail now exposes minimal `candidateVehicles` facts derived from the
  persisted choice-set item. The frontend does not inspect raw order item
  snapshots to render readonly candidate cards.
- Ride facts:
  after a larger spacing, always render exactly two lifecycle-independent
  sections:
  - `路线`: section title plus PR Facts Card style route item list
  - `乘车人`: section title plus RideHailing Ordering rider drawer style list
    items
- Explicit exclusions:
  no provider facts, bill/payment facts, driver facts, route summaries, extra
  eyebrows, extra cards, or additional content in this segment.
- Interaction limitation:
  cancel and more controls are currently disabled visual controls because
  RideHailing cancellation/more-operation use cases are not implemented in this
  slice.

## Pinned Decisions

- Production code mutations still require Impact Handshake and explicit
  `开始`.
- `RideHailingOrderContent` owns RideHailing Order Detail panel content and map
  presentation; `CommerceOrderDetailPage` owns route/query/page-level shell.
- Map mode is driven by local persisted `ride.executionPhase`, not provider
  live phase/status.
- Raw JSON diagnostic UI has been removed from the panel content.
- `RideHailingSkuCard` may gain a readonly/no-checkbox shape, but its Ordering
  Page default must stay selectable with checkbox.

## Open Checks

- Manual browser review of dispatching and post-dispatch panel layout.
- Decide in a separate slice whether RideHailing cancellation should be
  implemented end-to-end.
