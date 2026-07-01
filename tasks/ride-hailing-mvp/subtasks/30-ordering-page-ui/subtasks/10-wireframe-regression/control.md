# Wireframe Regression

## Status

Wireframe artifact work approved for the task packet only.

Production Vue implementation is still not approved.

This child task is forked from
`tasks/ride-hailing-mvp/subtasks/30-ordering-page-ui/`.

## Objective & Hypothesis

Objective:

- create a static low-fidelity HTML wireframe for the RideHailing `/order/new`
  page
- use a limited UnoCSS atomic-class preset so humans and agents can discuss UI
  design from a concrete artifact
- make the wireframe stable enough for automated regression tests

Hypothesis:

- the ordering-page design can be aligned faster with a concrete static
  wireframe than with prose alone
- a deliberately small atomic-class vocabulary will keep the wireframe readable,
  reviewable, and testable
- low-fi layout, content, and relative color semantics are sufficient before
  committing to production Vue component changes

## Non-Goals

- do not implement production Vue UI in this task
- do not change `/order/new` runtime behavior
- do not change commerce evaluation or order-creation contracts
- do not polish visual design beyond wireframe-level fidelity
- do not introduce provider-authored SKU discovery decisions here

## Intended Artifact

Primary artifact:

- `artifacts/current-ordering-new.html`
  - static HTML wireframe for the RideHailing `/order/new` page, derived from
    the legacy uniapp implementation

Expected qualities:

- low-fidelity but complete enough to show layout hierarchy
- includes user-visible content labels and representative data
- includes relative color semantics such as surface, muted, accent, warning, and
  disabled states
- includes stable semantic `data-testid` hooks for automated checks
- uses only the agreed limited UnoCSS atomic-class preset

Potential companion artifacts:

- a tiny local preview entry if plain HTML alone is awkward to run
- screenshot tests once the rendering environment is stable
- optional screenshot snapshots for the canonical viewport

Confirmed constraints:

- artifact lives inside this task packet
- only one wireframe for now
- first implementation source is:
  `../Application/uniapp/src/sub_packages/ride_hailing/`
- first wireframe should extract the intended ordering-page structure from:
  - `pages/order.vue`
  - `pages/order.scss`
  - `components/rideTypeDisplay/rideTypeDisplay.vue`
  - `components/rideTypeDisplay/index.scss`
- canonical viewport is Pixel 7
- screenshot regression is the intended test strategy, but tests are deferred
  for now

Confirmed UI direction:

- keep a full-screen map with a bottom drawer/panel
- keep the drawer resizer/handle
- do not require this page shape to align with the uniapp `PageHeader` /
  `BottomActionBar`; uniapp is the source for the core map + drawer ordering
  structure, not for web chrome/action-bar parity
- do not show a `来自 {PR title} 的出行请求` summary in the ordering drawer
- do not show the uniapp `AdManager` / recommendation block in this ordering
  wireframe
- show available ride-type quote cards inside the drawer
- do not show route-unavailable vehicle types
- put `同乘人` and `出发时间` into one flat row at the bottom of the drawer
- clicking `同乘人` should later open a bottom drawer for rider editing
- clicking `出发时间` should later open a bottom drawer for departure-time
  editing
- bottom action row uses web commerce semantics: selected estimated amount,
  price-detail entry, and `下单`

## Proposed Wireframe Coverage

The first wireframe should model at least:

- top app/header context for `/order/new`
- route map or map placeholder area
- text route summary for origin, destination, and waypoints
- departure time
- riders / participants
- bottom drawer edit entry for riders
- bottom drawer edit entry for departure time
- quote status area
- vehicle option list with selected and loading/estimating states
- bottom action area with price range and create-order affordance
- blocked-state notice when required information or availability is missing

## Atomic Class Constraints

The UnoCSS usage should be intentionally narrow.

Expected class families:

- layout: flex, grid, block, hidden, relative, absolute
- spacing: gap, padding, margin from a small scale
- sizing: width, height, min/max, aspect ratio
- typography: text size, weight, leading, alignment
- border/radius/shadow: minimal wireframe surfaces
- color roles: neutral surface, subtle surface, text, muted text, accent,
  warning, danger, disabled

Avoid:

- arbitrary one-off values unless explicitly added to the preset
- production design-token coupling
- decorative gradients, illustrations, or high-fidelity assets
- class sprawl that makes layout review harder than reading CSS

## Regression Intent

Automated tests should protect the wireframe as a design contract, not as final
production UI.

Candidate assertions:

- required sections exist in the intended order
- stable `data-testid` hooks exist for key regions and states
- selected / disabled vehicle states are represented
- blocked create state is represented
- mobile-sized viewport layout remains coherent
- desktop-sized viewport layout remains coherent if desktop wireframe is in
  scope

## Guardrails Touched

- parent discussion owner:
  `tasks/ride-hailing-mvp/subtasks/30-ordering-page-ui/control.md`
- possible artifact owner:
  `tasks/ride-hailing-mvp/subtasks/30-ordering-page-ui/subtasks/10-wireframe-regression/`
- production owners are intentionally not touched in this task unless a later
  approved implementation slice maps the wireframe into Vue:
  - `apps/frontend/src/pages/OrderingFromPlacementPage.vue`
  - `apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingPanel.vue`
  - `apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue`

## Open Questions

- What exact atomic class whitelist should be allowed?
- Should the wireframe use Chinese production-like copy from the start, or
  neutral labels while information architecture is still moving?

## Human Confirmation Boundary

Before implementation, confirm:

- allowed UnoCSS class whitelist or preset shape when the temporary inline CSS
  shim is replaced by a real preset/harness
- when screenshot regression should be added

## Verification

Expected after implementation approval:

- static artifact renders locally
- optional screenshot evidence for Pixel 7
- no production-code diff unless separately approved

## Next Step

Review the uniapp-derived static HTML artifact and continue adjusting it from
human feedback before production Vue implementation is discussed.
