# RideHailing Order Detail Content IA

Date: 2026-05-31

## Purpose

Define the RideHailing Order Detail content/page experience. This is separate
from RideHailing Ordering Content.

## References

- Uniapp detail page:
  `F:\CODING\Project\Anana\Application\uniapp\src\sub_packages\ride_hailing\pages\detail.vue`
- Uniapp detail style:
  `F:\CODING\Project\Anana\Application\uniapp\src\sub_packages\ride_hailing\pages\detail.scss`
- Uniapp refresh policy:
  `F:\CODING\Project\Anana\Application\uniapp\src\sub_packages\ride_hailing\pages\detail.ts`
- Uniapp driver display:
  `F:\CODING\Project\Anana\Application\uniapp\src\sub_packages\ride_hailing\components\driverInfoDisplay\driverInfoDisplay.vue`
- Uniapp cancel order drawer:
  `F:\CODING\Project\Anana\Application\uniapp\src\sub_packages\ride_hailing\components\cancelOrder\cancelOrder.vue`

## Boundary

Order Detail is not a generic Rental-style card stack.

RideHailing Order Detail needs a map-first live fulfillment surface:

- map shows route, live driver/car, driven polyline, and route progress;
- detail panel shows status, provider execution facts, passengers, selected
  vehicle facts from the base order generic item/pricing snapshot, route
  summary, and actions;
- Bill Detail / Payment Checkout remain owned by the Bill/Payment surfaces.
  Order Detail links to them when bill/payment state exists.

Do not put Ordering-only controls here:

- route point editing;
- departure time editing;
- rider/contact editing;
- vehicle quote selection.

## Layout IA

### 1. Live Route Map

Reference behavior from uniapp `RouteMap` usage:

- show the order route;
- show planned route while the ride is not in the dispatching state where a
  planned driver route is unavailable;
- show dynamic navigation info when the ride is on the way;
- show driver/car position when available;
- show driven route polyline when available;
- support car history / stick car to polyline behavior where the map component
  can support it.

Responsive layout:

- mobile: map occupies the upper visual area, with a bottom detail panel;
- desktop/tablet: use a map + detail panel composition, preserving the map as
  the dominant fulfillment surface.

### 2. Status Metadata

Top of the detail panel:

- status title;
- status description;
- cancellation reason when cancelled;
- more/actions affordance.

The status labels should be derived from RideHailing execution state, not from
raw Caocao event names.

### 3. Primary Actions

Uniapp reference behavior:

- `Pending` / `Unpaid`: show Bill Detail entry;
- `Dispatching` / `Competing`: show cancel action;
- `ReviewOpening`: show review action;
- more menu includes:
  - cancel order;
  - check Bill Detail;
  - check Partner Request.

Web first cut:

- expose Bill Detail entry when a bill exists or payment is due;
- expose cancel action only when backend cancellation state allows it;
- expose PR detail entry if the order is PR-attached;
- do not duplicate Payment Checkout inside this content.

### 4. Driver And Vehicle Info

Show after provider acceptance and before abnormal closure:

- driver avatar;
- driver name;
- vehicle plate;
- vehicle brand/model/color;
- phone/call action.

Phone behavior:

- mobile: `tel:` / call affordance when available;
- desktop: reveal/copy phone number affordance if direct call is not supported.

Before provider acceptance:

- show selected ride type cards from the base order generic item/pricing
  snapshot, following the Ordering vehicle card visual direction.

### 5. Passengers

When there are other passengers:

- show compact avatars;
- show short passenger copy.

This is display-only. Editing belongs to Ordering, not Detail.

### 6. Route Summary

Below the live/status area:

- origin;
- waypoints if present;
- destination.

This uses a display-only route list, not `RouteEditorOnMap`.

### 7. Preferences

If RideHailing preference facts exist, show a compact preference section.
This should not block the first slice if preferences are not yet modeled.

### 8. Cancel Drawer

Reference behavior from uniapp `CancelOrder`:

- bottom drawer/popup;
- current cancellation availability text;
- live cancel fee refresh while cancellable;
- reason options;
- free-text detail with max length;
- confirm/cancel actions;
- disabled state when closed, closing, abnormal, or otherwise denied by
  backend.

The drawer should be wired after the cancellation use case exists. Until then,
the Order Detail content can expose the slot/affordance behind backend
capability flags.

## Refresh Model

Order status refresh intervals should be status-aware.

Uniapp reference intervals:

- dispatching-like states: about 3 seconds;
- accepted / pickup / in-progress states: 6-10 seconds;
- terminal/payment/review/error states: no polling.

Navigation/live route refresh:

- only while the ride is on the way;
- about every 3 seconds in the uniapp reference;
- avoid map jitter by updating driven route polyline only when the route payload
  actually changes.

## Data Authority

- Base TradeOrder owns generic item/pricing contract snapshots produced by
  Product/PricingApplication.
- RideHailingOrder owns order-facing execution state, route, passengers,
  dispatch state, cancellation side-effect result, fee-confirm side-effect
  result, and final bill/payment linkage.
- Fulfillment coordinates provider invocation/querying and the provider adapter
  owns provider protocol details.
- Order Detail may read live navigation/provider detail through a use case, but
  must not make Fulfillment a second owner of driver assignment, dispatch
  state, cancellation outcome, fee-confirm outcome, or long-lived execution
  projection.

## First-Cut Exclusions

- No route editing.
- No quote/vehicle reselection.
- No in-page Payment Checkout.
- No provider event timeline unless required for support/debug.
- No direct raw Caocao status text in the UI.
