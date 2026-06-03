# Modification Plan

## Planning Status

This is a proposed implementation plan. No production code should be changed until the user explicitly says to start.

Component split details are recorded in `65-component-split-plan.md`. The slices below should use that split as the target boundary map while still avoiding one-off pass-through wrappers.

## Target State

```text
FullScreenPageScaffold, 100vh
  PageHeader, small variant
  OrderingContent, stretched
    Rental content OR RideHailing content
  BottomActionBar
    estimated total + chevron-up + place-order CTA
  FloatingNoticeLayer
  BottomDrawer price detail
```

Product-specific content:

- Rental: commerce place-order drawer style, no card-heavy layout, no `已从 PR 锁定`.
- RideHailing: real route map plus bottom sheet, no fake map-like section, `RideHailing SKU Card` rows.

## Slice 1: Ordering Shell And Bottom Action Bar

Mode: Execute after confirmation.

Address and object:

- `apps/frontend/src/pages/OrderingFromPlacementPage.vue`
- `apps/frontend/src/domains/commerce/ui/ordering/OrderingPageShell.vue`
- `apps/frontend/src/domains/commerce/ui/ordering/OrderingBottomActionBar.vue`
- `apps/frontend/src/domains/commerce/ui/ordering/OrderingFloatingNoticeLayer.vue`
- `apps/frontend/src/domains/commerce/ui/ordering/OrderingPriceDetailDrawer.vue`

State diff:

- From: page-local `FullScreenPageScaffold` with ordinary body flow and footer siblings.
- To: explicit 100vh shell with:
  - small header
  - stretched content area
  - stable `BottomActionBar`
  - price-detail `BottomDrawer`
  - floating notice/error layer

Work:

1. Introduce page-level layout variables/structure so content height is bounded between header and bottom action bar.
2. Replace current footer sequence with a single action bar component/section.
3. Move price detail from inline footer block to `BottomDrawer`.
4. Move availability/create errors out of normal layout into floating command feedback.
5. Preserve `useEvaluateOrdering`, `useCreateOrder`, `canCreate`, loading, error behavior.

Verification:

- Typecheck/build or targeted frontend unit if available.
- Browser screenshot for empty/incomplete Rental state.
- Existing Rental scenario must still reach ordering page and create order after content slices.

Risk:

- Shared layout extraction can grow too large. Keep first slice page-local unless reuse is clearly valuable.

## Slice 2: Rental Ordering Content Rewrite

Mode: Execute after shell slice.

Address and object:

- `apps/frontend/src/domains/commerce/ui/ordering/RentalOrderingContent.vue`
- candidate subcomponents:
  - `RentalSpuSummaryRow.vue`
  - `RentalSkuConfiguration.vue`
  - `RentalParticipantCountControl.vue`
  - `RentalContactSection.vue`
  - `RentalRegistrantSection.vue`
  - `RentalPolicyNoticeRows.vue`

State diff:

- From: stacked `SurfaceCard` sections including `已从 PR 锁定`.
- To: commerce place-order drawer content:
  - SPU product row/header
  - SKU-expanded configuration
  - person count / participant count treatment
  - contact information
  - participant identity inputs
  - policy/notice as low-chrome rows or inline detail

Work:

1. Delete `已从 PR 锁定` copy and PR-owned presentation.
2. Replace repeated `SurfaceCard` shells with rows, dividers, compact section headings, and inline controls.
3. Build SPU row: thumbnail placeholder or real asset hook, title, description/selling points, chevron to future SPU detail route if available.
4. Reframe SKU cards as product configuration rows with strong selected state.
5. Keep participant/contact/registrant output contract unchanged.
6. Keep cancellation policy visible but not visually dominant.

Verification:

- Screenshot incomplete state: CTA disabled, floating blocker shown.
- Screenshot complete state: estimated total visible, create CTA enabled when backend allows.
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts -t commerce_rental_ordering_reaches_confirmed_fulfillment`
- Existing non-ready/non-creator blocked scenarios if touched state handling changes.

Risk:

- SPU detail route may not exist. If absent, render row affordance only when route is real; do not invent navigation.

## Slice 3: RideHailing Real Map Stage

Mode: Execute after shell slice.

Address and object:

- `apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue`
- `apps/frontend/src/domains/route/ui/RouteMap.vue`
- `apps/frontend/src/shared/map/*` only if callout support requires provider changes

State diff:

- From: CSS fake map with hand-drawn polyline and button callouts.
- To: real `RouteMap` / `SharedMap` stage inside ordering content.

Work:

1. Convert ordering route binding shape into existing `Route` model shape.
2. Render `RouteMap` with `variant="immersive"` and fit padding that accounts for bottom sheet.
3. Remove `ride-content__map`, `ride-content__polyline`, and fake callout CSS.
4. Keep fallback behavior for missing map key or missing coordinates.
5. Decide first pass callout behavior:
   - simplest: marker title/content through existing marker label support
   - next: enhance shared map marker/label contract

Verification:

- Browser screenshot with mock RideHailing payload.
- Route map fallback screenshot if Tencent key unavailable.
- Existing PR route map modal should still render.
- Existing RideHailing scenario should still find route-map test ids, updated if semantics change.

Risk:

- Tencent map may not render in all local envs without keys. Fallback must remain acceptable and scenario selectors should not depend on external map tiles.

## Slice 4: RideHailing Bottom Sheet And SKU Cards

Mode: Execute after real map stage.

Address and object:

- `RideHailingOrderingContent.vue`
- `RideHailingBottomSheet.vue`
- `RideHailingSkuCard.vue`
- `RideHailingPassengerStrip.vue`

State diff:

- From: map card + equal-weight setting rows + vehicle choice cards.
- To: route map stage + bottom sheet with:
  - drag handle
  - passengers
  - `RideHailing SKU Card` rows only

Work:

1. Remove equal-weight departure/riders/contact row layout.
2. Create `RideHailing SKU Card` visual treatment based on legacy `rideTypeDisplay`:
   - provider/car identity
   - vehicle preview or stable placeholder
   - estimated price
   - optional fare/status tag
   - selected checkbox/state
   - subtle pressed state
3. Keep output/evaluation logic unchanged: selected SKU, route, riders, contact phone.
4. Decide contact phone handling:
   - if already bound, no visible row
   - if missing, floating blocker or account-completion drawer, not an equal row in content

Verification:

- Screenshot with two SKU cards and selected state.
- `commerce_ride_hailing_ordering_completes_provider_backed_trip`
- `commerce_ride_hailing_provider_create_failure_allows_retry_without_open_order`

Risk:

- Current backend evaluated options may not include enough provider visual identity. Use SKU name/facts first, avoid blocking on assets.

## Slice 5: Shared Map Callout Enhancement, If Needed

Mode: Explore then Execute.

Address and object:

- `apps/frontend/src/shared/map/types.ts`
- `apps/frontend/src/shared/map/tencent/types.ts`
- `apps/frontend/src/shared/map/tencent/tencent-lbs-provider.ts`
- `apps/frontend/src/domains/route/ui/RouteMap.vue`

State diff:

- From: marker `label/title` but limited callout semantics.
- To: typed support for marker label/callout or map labels.

Work options:

1. Extend `MapMarker` label style and use Tencent `MultiMarker` text/background options.
2. Add `MapLabel` and provider `MultiLabel` support for richer labels.
3. Add marker/label event emission only if route point callouts need interaction.

Verification:

- Unit tests around route projection if types change.
- Screenshot showing visible origin/destination callouts or labels.
- Existing route map users unaffected.

Risk:

- This can sprawl. Do it only if real map first pass cannot satisfy callout needs.

## Slice 6: Cleanup And Scenario Alignment

Mode: Execute.

Address and object:

- scenario tests under `tests/scenario/commerce/`
- component test IDs in ordering content
- obsolete CSS/classes from removed map/card implementations

Work:

1. Remove dead CSS and obsolete test ids.
2. Update scenario selectors to semantic nodes:
   - `ordering.rental.product-summary`
   - `ordering.rental.sku-option`
   - `ordering.ride-hailing.route-map`
   - `ordering.ride-hailing.sku-card`
   - shared bottom action ids
3. Run targeted scenarios.
4. Capture final screenshots into task evidence.

5. Confirm the final component split does not leave major product layout inside the route page.

Verification:

- Rental full scenario.
- RideHailing full scenario.
- Provider failure scenario.
- `pnpm --filter @partner-up-dev/frontend build` or project-standard frontend verification.

## Suggested Implementation Order

1. Shell + BottomActionBar first.
2. Rental rewrite second, because it proves the generic shell without map complexity.
3. RideHailing real map stage third.
4. RideHailing SKU Card bottom sheet fourth.
5. Shared map callout only if needed.
6. Cleanup and scenario alignment last.

## Acceptance Criteria

- Page is exactly one viewport high and does not create accidental full-page scroll.
- Header uses small variant.
- Ordering content fills remaining space.
- Bottom action bar is stable and never overlaps normal content.
- Price detail opens in BottomDrawer.
- Errors/blockers float above content/action bar and do not shift layout.
- Rental no longer contains `已从 PR 锁定` or PR-owned presentation sections.
- Rental avoids repeated `SurfaceCard` layout.
- RideHailing uses real map component or fallback from shared map stack.
- RideHailing no longer uses fake CSS polyline/map callouts.
- RideHailing SKU Cards visually follow the legacy `rideTypeDisplay` direction while using current commerce SKU model.
