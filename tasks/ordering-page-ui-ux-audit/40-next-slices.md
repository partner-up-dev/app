# Candidate Next Slices

## Slice 0: Alignment And UX Direction

Mode: Solidify.

Output:

- Target ordering page model for Rental and RideHailing.
- Shared vs product-specific layout decision.
- Decision on the generic shell contract:
  - `FullScreenPageScaffold` exactly 100vh
  - small `PageHeader`
  - stretched `OrderingContent`
  - shared `BottomActionBar`
  - floating notice/error layer
  - shared `BottomDrawer` for price details
- Exact content priority for first viewport.
- Footer and validation contract.

Impact Handshake required before implementation.

## Slice 1: Footer And Validation Contract

Mode: Execute.

Candidate mutation:

- Create or reuse a shared `BottomActionBar` model for estimated total, chevron-up price detail, and place-order CTA.
- Move price details into `BottomDrawer`.
- Move errors/blockers into an overlay/floating layer instead of ordinary footer siblings.
- Ensure `OrderingContent` height stretches to exactly the space between small header and bottom action bar.

Verification:

- Mobile screenshot before/after.
- Rental scenario still passes.
- RideHailing ordering scenario still reaches create action.

## Slice 2: Rental Checkout Information Architecture

Mode: Execute after Slice 0.

Candidate mutation:

- Reframe Rental as a traditional commerce place-order drawer:
  - SPU card with thumbnail, title, description, and SPU detail navigation
  - SKU-expanded product configuration
  - participant/person-count selection
  - contact information
  - participant identity information
- Delete `已从 PR 锁定` presentation language and any order UI section that frames service facts as PR-owned.
- Avoid repeated `SurfaceCard` layout. Use rows, dividers, sectioning, and drawer-style grouping instead.
- Improve selected SKU state and comparison.
- Keep required inputs visible before the user hits footer-level blockers.

Verification:

- Screenshot with incomplete and complete input.
- `commerce_rental_ordering_reaches_confirmed_fulfillment`.
- Existing blocked-state scenarios for non-ready PR and non-creator.

## Slice 3: RideHailing Ordering Content Model

Mode: Explore then Execute.

Candidate mutation:

- Use fixed/full-screen route map as RideHailing content stage.
- Use bottom sheet panel with drag handle, passengers, and only `RideHailing SKU Card` rows.
- Move footer command concepts to the shared `BottomActionBar`.
- Remove the current equal-weight departure/riders/contact row model unless a specific edit surface is reintroduced.
- Replace the hand-rolled map-like route section with `RouteMap` / `SharedMap`.
- Add callout support by enhancing the shared map contract if needed.
- Use legacy `rideTypeDisplay` visual language as a reference for SKU card structure: provider/car identity, preview image, estimated price, optional fare tag, selected checkbox.

Verification:

- RideHailing screenshot with mock payload.
- `commerce_ride_hailing_ordering_completes_provider_backed_trip`.
- Provider failure retry scenario.

## Slice 4: Scenario Screenshot Fixture

Mode: Execute if repeated visual verification is needed.

Candidate mutation:

- Add a scenario-local screenshot harness or fixture path that creates deterministic ordering data and captures screenshots.
- Keep it out of production code.

Verification:

- Deterministic screenshots can be regenerated from system scenario infra.

## Slice 5: Legacy Layout Translation Spike

Mode: Explore.

Candidate output:

- Translate `Application/uniapp/src/sub_packages/ride_hailing/pages/order.vue` into a web-compatible layout spec.
- Decide which concepts are structural requirements and which are legacy implementation details.
- Produce a concrete before/after wireframe for `/order/new`.
- Use `55-refined-target-layout.md` as the current target, not the legacy file itself.

Verification:

- No production mutation required.
- Updated task packet with target wireframes and acceptance criteria.

## Slice 6: Shared Map Callout Capability

Mode: Explore then Execute.

Candidate mutation:

- Extend `MapMarker` or add `MapLabel` so route points can render callouts through Tencent JS GL.
- Prefer Tencent `MultiMarker` marker text/background options for simple callouts.
- Consider Tencent `MultiLabel` for richer always-visible labels and collision behavior.
- Add marker/label event emission only if callouts need to be tappable.

Verification:

- Unit coverage for route projection shape if new marker/label types are added.
- Browser screenshot showing real route map in RideHailing Ordering Content.
- Existing PR route map modal and route editor map behavior must not regress.
