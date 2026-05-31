# RideHailing Ordering Content IA

Date: 2026-05-31

## Purpose

Define the RideHailing Ordering Content component, not the whole page shell and
not the order creation action bar.

## References

- Uniapp reference:
  `F:\CODING\Project\Anana\Application\uniapp\src\sub_packages\ride_hailing\pages\order.vue`
- Uniapp vehicle card reference:
  `F:\CODING\Project\Anana\Application\uniapp\src\sub_packages\ride_hailing\components\rideTypeDisplay\rideTypeDisplay.vue`
- Parent issue 231 topology: Placement -> Offer / Ordering resolution -> Order.

## Boundary Correction

`Ordering Content` is not the whole Ordering/Offer page.

Do not include these inside the RideHailing Ordering Content component:

- Context Header;
- current PR source;
- back-to-PR control;
- READY / creator eligibility display;
- create-order CTA;
- Bottom Action Bar;
- page-level Price Detail footer.

Those belong to the parent route/page flow or order creation affordance.

## Content IA

### 1. RouteEditorOnMap

Reusable component built on top of the map component.

Responsibilities:

- show origin, waypoints, destination, and driving-planned route on the map;
- show popup/callout above each route point with the location name;
- include a chevron-right edit affordance on the right side of each callout;
- support disabled editing per point;
- open the route-point editor when an editable callout is clicked.

### 2. Time, Riders, And Contact Row

One row with three entry items. Each item uses `label + chevron-right icon`.

Departure time:

- label: `<HH:mm/现在>出发`;
- `null` value means `现在`;
- click opens `BottomDrawer(DatetimePicker)`;
- editing can be disabled.

Riders:

- label: `同乘人`;
- click opens `BottomDrawer(List(UserBriefRow))`;
- editing can be disabled.

Contact:

- label: `联系方式`;
- click opens `BottomDrawer(PhoneEditor)`;
- editing can be disabled.

### 3. Vehicle Quote Cards

Each vehicle option is a card.

Card layout follows the uniapp `RideTypeDisplay` direction:

- left side: provider, vehicle type, vehicle image;
- right side: estimated price, fare tag, selection affordance.

Behavior:

- list Caocao-backed vehicle/SKU quote options;
- default selected option is the cheapest currently selectable quote;
- quote loading, expiry, and refresh state belong to the quote-card area.

## First-Cut Exclusions

- No ad/recommendation slot unless product scope explicitly asks for it.
- No rich live monitoring on Ordering page.
- No multi-provider comparison UI while only Caocao is configured.
- No Context Header inside Ordering Content.
- No page-level bottom action bar or price-detail footer inside Ordering
  Content.
