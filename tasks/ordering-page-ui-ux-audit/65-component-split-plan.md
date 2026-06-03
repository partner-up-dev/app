# Component Split Plan

## Goal

Keep `/order/new` as a route assembly point, not a feature component dumping ground.

The target split should separate:

- page orchestration
- generic ordering shell
- shared bottom action and command feedback
- Rental product/order configuration content
- RideHailing map/sheet/SKU content
- optional shared map capability work

## Proposed File Topology

```text
apps/frontend/src/pages/
  OrderingFromPlacementPage.vue

apps/frontend/src/domains/commerce/ui/ordering/
  OrderingPageShell.vue
  OrderingBottomActionBar.vue
  OrderingFloatingNoticeLayer.vue
  OrderingPriceDetailDrawer.vue

  RentalOrderingContent.vue
  RentalSpuSummaryRow.vue
  RentalSkuConfiguration.vue
  RentalParticipantCountControl.vue
  RentalContactSection.vue
  RentalRegistrantSection.vue
  RentalPolicyNoticeRows.vue

  RideHailingOrderingContent.vue
  RideHailingRouteStage.vue
  RideHailingBottomSheet.vue
  RideHailingSkuCard.vue
  RideHailingPassengerStrip.vue
```

Use fewer files if implementation proves a component would only be a one-off wrapper. The split above is the target boundary map, not a mandate to create every file immediately.

## Page Assembly

`OrderingFromPlacementPage.vue`

Responsibilities:

- read and normalize `sessionStorage["partner-up.ordering-entry"]`
- choose Rental vs RideHailing branch
- own `useEvaluateOrdering` and `useCreateOrder`
- compose shell, content, action bar, drawer, and floating notices
- route to `/orders/:orderId` after create success

Non-responsibilities:

- no product-specific layout markup
- no map drawing
- no Rental form row markup
- no RideHailing SKU card markup

## Generic Ordering Components

### `OrderingPageShell.vue`

Responsibilities:

- wrap `FullScreenPageScaffold`
- force 100vh layout contract
- render small `PageHeader`
- expose slots:
  - `content`
  - `bottom-action`
  - `floating`
  - `drawer`

Notes:

- This can start page-local if shared component extraction feels premature.
- It should still make the shell contract explicit.

### `OrderingBottomActionBar.vue`

Props:

- `label`: estimated total/range label
- `pending`: price pending/evaluating state
- `canCreate`
- `loading`
- `priceDetailEnabled`

Events:

- `open-price-detail`
- `create`

Responsibilities:

- estimated total area
- chevron-up affordance
- place-order CTA
- stable bottom command geometry

### `OrderingPriceDetailDrawer.vue`

Responsibilities:

- display price explanations / line items
- open from action bar chevron
- not affect normal layout flow

### `OrderingFloatingNoticeLayer.vue`

Responsibilities:

- render validation / availability / create-order errors above normal layout
- avoid shifting content or action bar
- provide stable test id for blocked/error states

## Rental Components

### `RentalOrderingContent.vue`

Responsibilities:

- assemble Rental subcomponents
- own Rental local input state where it is strongly tied to output composition
- emit `OrderingContentOutput | null`

Non-responsibilities:

- no `SurfaceCard: 已从 PR 锁定`
- no PR presentation language
- no bottom action UI

### `RentalSpuSummaryRow.vue`

Responsibilities:

- thumbnail
- SPU title
- description / selling point summary
- optional chevron to SPU detail if route exists

Visual:

- product row/header, not heavy card.

### `RentalSkuConfiguration.vue`

Responsibilities:

- show selectable SKU/config rows
- selected state
- price per option
- configuration metadata such as participant count and duration

### `RentalParticipantCountControl.vue`

Responsibilities:

- display or control participant count
- if count is immutable from entry context, express as order constraint, not PR lock

### `RentalContactSection.vue`

Responsibilities:

- contact phone input
- validation presentation local to contact row if needed

### `RentalRegistrantSection.vue`

Responsibilities:

- repeated registrant identity rows
- name inputs
- keep registrant count aligned with participant count

### `RentalPolicyNoticeRows.vue`

Responsibilities:

- cancellation policy
- notice blocks
- low-chrome rows/dividers, not heavy cards

## RideHailing Components

### `RideHailingOrderingContent.vue`

Responsibilities:

- assemble route stage + bottom sheet
- convert ordering binding route into route-domain model
- own selected SKU/contact output state
- emit evaluation output and create output

### `RideHailingRouteStage.vue`

Responsibilities:

- render real `RouteMap` / shared map fallback
- configure immersive map fit padding around bottom sheet
- expose route map semantic test id

Non-responsibility:

- no CSS hand-drawn map/polyline.

### `RideHailingBottomSheet.vue`

Responsibilities:

- bottom panel geometry inside content area
- drag handle
- optional folded/normal/expanded state if implemented in this slice
- contains passengers and SKU cards

### `RideHailingSkuCard.vue`

Responsibilities:

- current commerce SKU option presentation
- visual reference from legacy `rideTypeDisplay`
- provider/car identity
- preview image or placeholder
- estimated price
- optional fare/status tag
- selected checkbox/state
- pressed state

### `RideHailingPassengerStrip.vue`

Responsibilities:

- compact passenger/companion context
- no unrelated route/contact controls

## Shared Map Split, If Needed

Only if real callout requirements exceed current map contract:

```text
apps/frontend/src/shared/map/
  types.ts
  Map.vue
  tencent/tencent-lbs-provider.ts
  tencent/types.ts
```

Candidate additions:

- `MapMarker.calloutLabel`
- `MapMarker.calloutVisible`
- `MapLabel`
- provider event bridge for marker/label click

Do not create commerce-local map overlay code unless shared map cannot support the requirement after analysis.

## State Ownership

```text
OrderingFromPlacementPage
  ordering entry
  evaluate/create mutations
  price/action state

RentalOrderingContent
  selected rental SKU
  contact phone
  registrant names
  emits content output

RideHailingOrderingContent
  selected ride-hailing SKU
  contact phone fallback/bound value
  emits evaluation output and content output

OrderingBottomActionBar
  presentational only
```

## Test ID Boundary

Stable semantic test ids should live on real semantic nodes:

- `ordering.page`
- `ordering.bottom-action`
- `ordering.price-detail.open`
- `ordering.create-order`
- `ordering.notice.blocked`
- `ordering.rental.product-summary`
- `ordering.rental.sku-option`
- `ordering.rental.contact-phone`
- `ordering.rental.registrant-name.{index}`
- `ordering.ride-hailing.route-map`
- `ordering.ride-hailing.bottom-sheet`
- `ordering.ride-hailing.sku-card`
- `ordering.ride-hailing.sku-card.selected`

Existing scenario ids can be bridged temporarily only if needed to keep a slice reviewable.

## Refactor Discipline

- Split only where the boundary has state, layout, or semantic weight.
- Avoid creating pass-through wrappers just to satisfy a file list.
- Keep output contracts unchanged until product behavior changes are explicitly approved.
- Prefer one shell/action slice before deep product-content rewrites.
