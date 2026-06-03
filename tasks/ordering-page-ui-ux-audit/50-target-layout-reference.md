# Target Layout Reference: Legacy Uniapp RideHailing Order Page

Reference source:

- `F:\CODING\Project\Anana\Application\uniapp\src\sub_packages\ride_hailing\pages\order.vue`
- `F:\CODING\Project\Anana\Application\uniapp\src\sub_packages\ride_hailing\pages\order.scss`
- `F:\CODING\Project\Anana\Application\uniapp\src\sub_packages\ride_hailing\components\rideTypeDisplay\rideTypeDisplay.vue`
- `F:\CODING\Project\Anana\Application\uniapp\src\sub_packages\ride_hailing\components\rideTypeDisplay\index.scss`

## High-Level Claim

This legacy page is a reference, not a blueprint. Its strongest reusable idea is spatial composition: a full-screen visual stage with a bottom command/control surface. The current target should be more generic; see `55-refined-target-layout.md` for the accepted interpretation.

The legacy layout is a map-first ride-hailing checkout surface. It is not a conventional page with a header, stacked cards, and a separate fixed footer. The core composition is:

```text
Viewport
+------------------------------------------------+
| NavBar, small                                  |
|                                                |
| Fixed full-screen map background               |
| - route polyline                               |
| - route callouts editable by tapping           |
|                                                |
|                                                |
|      Bottom sheet / panel overlays map         |
|      +------------------------------------+    |
|      | drag handle                         |    |
|      | scrollable panel content            |    |
|      | - PR context sentence/link          |    |
|      | - passenger avatars/context         |    |
|      | - ride type price cards             |    |
|      | - embedded ad/content               |    |
|      |                                    |    |
|      | panel-owned footer                  |    |
|      | - departure time row                |    |
|      | - estimated total + place order CTA |    |
|      | - safe-area inset                   |    |
|      +------------------------------------+    |
+------------------------------------------------+
```

The page's main visual anchor is the route map, and ordering controls are a bottom sheet.

## Layout Mechanics

### Background Map

The map container is fixed to the entire viewport:

```text
position: fixed;
top/right/bottom/left: 0;
z-index: -1;
```

It renders `RouteMap` with callouts enabled. Tapping a callout opens the location editor for that route point.

Implication for current MVP:

- Current RideHailing Ordering should stop treating the map as a card inside content.
- The map should become the route stage inside a generic full-screen ordering shell.
- Rental should not copy the map pattern; it should use a commerce place-order-drawer content model.

### Bottom Panel

The panel is fixed to the viewport bottom:

```text
position: fixed;
bottom: 0;
left/right: 0;
width: 100%;
background: surface;
z-index: 1;
top radius: large;
inverted elevation;
```

The panel is a bottom sheet with a drag handle. It has three states:

- `folded`
- `normal`
- `expanded`

Panel height is computed from viewport percentage plus footer height:

```text
normal:   calc(38% + footer_height)
folded:   calc(38% - 12vh)
expanded: calc(70% + footer_height)
```

Drag behavior:

- drag down: expanded -> normal -> folded
- drag up: folded -> normal -> expanded
- threshold: 50px
- touch move debounced around 60fps

Implication for current MVP:

- Current Ordering Page needs one generic shell that owns 100vh layout, small header, content stretch, bottom action bar, overlays, and drawers.
- Footer and scroll region must be in the same panel geometry, not separate siblings that collide visually.
- RideHailing can use a bottom sheet inside content; Rental should use a commerce configuration content region.

### Panel Content

Panel content height explicitly subtracts footer and drag handle:

```text
height: calc(100% - footer_height - 32px)
overflow-y: auto
```

This is the crucial layout contract that the current MVP page lacks. The footer is not floating over arbitrary content; the scrollable panel content is dimensioned around it.

Content order:

1. PR context line
   - sentence references the source partner request
   - PR title is underlined and tappable
2. Passenger context
   - companion avatars
   - text such as "with you"
3. Price / ride type list
   - cards sorted by estimated actual price
   - cheapest selected by default
   - loading indicator inside the price area
4. Embedded ad/content manager

Implication for current MVP:

- User context and source PR context should be compact and early.
- RideHailing vehicle choices should sit in the panel's primary scroll region.
- Rental SKU choices should be reframed as product configuration, not copied as ride-type rows.
- Required inputs and blockers should not appear as detached footer afterthoughts.

### Panel Footer

Footer is absolute inside the panel:

```text
position: absolute;
bottom: 0;
left/right: 0;
background: surface-container;
z-index: 2;
inverted elevation;
```

It has two rows:

```text
footer
  up row, 28px
    departure time + "departure" label + arrow

  down row, 58px
    left: ¥ + estimated total
    right: primary place-order button, 40px high

  safe area bottom inset
```

Implication for current MVP:

- Primary action and price should stay in a consistent command strip.
- Price detail should open from a chevron-up affordance beside estimated total.
- Validation/readiness should be surfaced in a floating command-feedback layer, not rendered as trailing ordinary content below the bar.

## Ride Type Card Model

`RideTypeDisplay` uses a compact horizontal card:

```text
ride type card
+------------------------------------------+
| left                                     |
| - info icon + provider + car type         |
| - vehicle preview image                   |
|                                          |
| right                                    |
| - "estimated" + price                    |
| - fare type tag if non-common             |
| - checkbox                               |
+------------------------------------------+
```

Visual details:

- surface-container background
- small radius
- padding
- max height 120px
- pressed state scales to `0.98`
- image preview up to `100 x 67`

Implication for current MVP:

- Current RideHailing vehicle cards are too abstract. They lack provider/car visual identity and a strong selected control.
- Rental SKU cards can borrow the "choice card as product row" treatment: left identity/metadata, right price/selection, optional image or icon.

## Interaction Model

The legacy page has three edit/confirmation surfaces:

- departure time popup from footer row
- route location popup from map callout
- split-bill approval popup after placing order

It also has phone-number acquisition as a dedicated blocking flow before placing order.

Implication for current MVP:

- RideHailing "contact" should be a blocking requirement, but it should not be visually equal to route/time/riders if the action is mostly account-completion.
- Popups/bottom drawers should be deliberate task surfaces, not sticky boxes in the middle of panel content.

## Legacy Principles To Carry Forward

1. Stage-first composition

RideHailing: route map is the stage. Rental: venue/product/service promise can become the stage.

2. Bottom-sheet control surface

Ordering controls live in a bounded command/control surface, not as full-page stacked cards.

3. Panel-owned footer

Price, readiness, editable departure/summary, and CTA are inside the same panel geometry.

4. Explicit scroll contract

Scrollable content height must subtract footer and drag handle height so nothing is hidden behind the CTA.

5. Compact decision rows

Vehicle/SKU options should be dense, comparable rows with strong identity, price, and selected state.

6. Source context before choices

PR context and participants should be compactly visible before the user chooses a paid option.

## ASCII Legacy-Informed Adaptation

RideHailing:

```text
+--------------------------------------+
| small back/nav                       |
|                                      |
| full-bleed route map                 |
|  [origin callout]                    |
|        route line                    |
|                  [destination]       |
|                                      |
|        draggable bottom sheet        |
| +----------------------------------+ |
| | handle                           | |
| | PR context / riders              | |
| | vehicle option row               | |
| | vehicle option row               | |
| | provider / quote status          | |
| |----------------------------------| |
| | depart row                       | |
| | ¥ total/range        call/order  | |
| | safe area                        | |
| +----------------------------------+ |
+--------------------------------------+
```

Rental adaptation should be commerce-first, not map-first:

```text
+--------------------------------------+
| small back/nav                       |
|                                      |
| venue/product stage                  |
| - product name / image or venue cue  |
| - locked time/person summary         |
|                                      |
|        bottom sheet                  |
| +----------------------------------+ |
| | handle or quiet top affordance    | |
| | PR context / participants         | |
| | required contact/registrants      | |
| | SKU/package option row            | |
| | policy/notices                    | |
| |----------------------------------| |
| | selected time/package summary     | |
| | ¥ total              create       | |
| | readiness/error attached here     | |
| +----------------------------------+ |
+--------------------------------------+
```

## Open Translation Questions

- Should the MVP web app implement actual draggable panel states now, or only reproduce the bottom-sheet geometry first?
- For Rental, what should the top stage be: product image, venue/location map, or a compact service promise?
- Should RideHailing route editing remain available on Ordering Page, or should route be locked from PR and only readable?
- Should contact phone acquisition use a modal/account-completion flow rather than an inline text input?
