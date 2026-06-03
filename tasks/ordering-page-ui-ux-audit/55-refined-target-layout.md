# Refined Target Layout

## Status

This supersedes a literal 1:1 interpretation of the legacy uniapp ride-hailing page. The uniapp page remains a useful reference for spatial composition, but the MVP web Ordering Page should be more generic and should not copy its implementation details directly.

## Core Ordering Shell

The target shell is:

```text
FullScreenPageScaffold, exactly 100vh
+--------------------------------------+
| PageHeader, small variant             |
| - back                                |
| - concise title/context               |
| - support/action if needed            |
+--------------------------------------+
| OrderingContent                       |
| - stretches to fill remaining height  |
| - owns product-specific layout        |
| - bounded by header and action bar    |
+--------------------------------------+
| BottomActionBar                       |
| - estimated total                     |
| - chevron-up price detail affordance  |
| - place order CTA                     |
+--------------------------------------+
```

Important constraints:

- The page must be exactly one viewport high.
- `OrderingContent` must stretch to fill the space left by `PageHeader` and `BottomActionBar`.
- `BottomActionBar` is a command surface, not ordinary scroll content.
- Price detail opens in `BottomDrawer` from the chevron-up affordance beside estimated total.
- Error, warning, and blocking states should float above normal layout, using absolute/fixed positioning or an overlay layer. They should not become ordinary stacked content inside the same scroll flow as product/order content.

## BottomActionBar Model

```text
BottomActionBar
+--------------------------------------+
| estimated total      ^    [place CTA] |
+--------------------------------------+
```

Behavior:

- The estimated total area shows the evaluated total/range or an explicit pending state.
- The chevron-up opens a `BottomDrawer` for price details.
- CTA disabled/loading state remains in the bar.
- Validation and backend errors should surface above the bar as overlays/toasts/notices, not as normal footer siblings.

## RideHailing Ordering Content

RideHailing should keep the map-first model, but in a generic shell-compatible way:

```text
RideHailingOrderingContent
+--------------------------------------+
| fixed/full-screen route map stage     |
| - route line                          |
| - origin/destination callouts         |
|                                      |
| bottom sheet panel                    |
| +----------------------------------+ |
| | drag handle                      | |
| | passengers                       | |
| | ride type price row              | |
| | ride type price row              | |
| | ride type price row              | |
| +----------------------------------+ |
+--------------------------------------+
```

Target interpretation:

- Route map is the visual stage.
- The route map must use the existing real map stack (`RouteMap` / `SharedMap`) or an enhancement of it.
- The current CSS-only map-like route section should be removed rather than refined.
- Bottom sheet panel is content inside the available `OrderingContent` area.
- The sheet contains only high-value order-choice content:
  - drag handle
  - passengers
  - ride type price rows
- Departure time, estimated total, place-order CTA, and price detail belong to the shared shell/action bar, not to arbitrary stacked content.
- The current equal-weight buttons for departure/riders/contact should not be carried over as-is.

Callout interpretation:

- Callouts belong to the map abstraction, not to commerce-specific fake-map CSS.
- If callouts are needed, enhance the shared map provider contract with marker text, labels, or events.

## Rental Ordering Content

Rental should follow a traditional commerce "place order drawer" mental model rather than a route-map model:

```text
RentalOrderingContent
+--------------------------------------+
| SPU card                              |
| - thumbnail                           |
| - title                               |
| - description                         |
| - tap opens SPU Detail                |
|                                      |
| 商品配置                              |
| - expanded by SKU/options             |
|                                      |
| 人数选择                              |
|                                      |
| 联系方式                              |
|                                      |
| 参与者身份信息                        |
+--------------------------------------+
```

Target interpretation:

- Rental is commerce-first.
- The SPU card is the entry summary and should be visually stronger than the current plain text card.
- SKU/options should be presented as product configuration, not as an arbitrary list of cards.
- Participant count, contact, and registrant identity are order configuration inputs.
- The content should fit inside the shell's stretched `OrderingContent` region and cooperate with the fixed `BottomActionBar`.
- The current "已从 PR 锁定" section should be deleted. Upstream PR placement may supply defaults or immutable values, but Rental Ordering Content should not present service facts as PR-owned state.
- Avoid card-heavy composition. Prefer commerce drawer sectioning, rows, dividers, inline controls, and compact product/configuration rows over repeated `SurfaceCard` shells.

## Error And Blocking State Layer

Errors and blocking states should not be normal page-flow content.

Target layering:

```text
FullScreenPageScaffold
  PageHeader
  OrderingContent
  BottomActionBar
  FloatingNoticeLayer
    - validation errors
    - backend blockers
    - retryable create-order failures
  BottomDrawerLayer
    - price details
    - secondary editing tasks if needed
```

Rationale:

- Normal ordering content should remain spatially stable.
- The CTA and price area should not shift when a warning appears.
- Error messages are transient command feedback, not product content.

## RideHailing SKU Card Naming

RideHailing option rows should be called and designed as `RideHailing SKU Card`, because the current commerce model is SKU-based even when the legacy visual reference calls it ride type display.

Visual reference:

- legacy `rideTypeDisplay.vue`
- left side: info/provider/car identity plus vehicle preview
- right side: estimated price, optional fare tag, selected checkbox
- compact horizontal touch row with subtle pressed state

## Generic Principles

1. Use a generic shell, product-specific content.

The page shell owns viewport, header, action bar, overlays, and drawer layers. Rental and RideHailing own only their content area.

2. Do not copy legacy uniapp implementation details.

The legacy page validates the map + panel pattern, but the MVP should use current frontend primitives and a more reusable shell contract.

3. Keep the first viewport purposeful.

RideHailing first viewport should communicate route + available ride choices. Rental first viewport should communicate product + configuration.

4. Put command feedback in command layers.

Price details, errors, readiness, loading, and submit feedback belong near the action model, not in the product content stack.

5. Preserve scenario behavior while changing presentation.

Existing order command payloads, placement entry semantics, and scenario business assertions should remain unchanged unless a separate product decision is made.
