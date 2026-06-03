# Evidence

## Screenshots

Screenshots were captured at a 390 x 844 mobile viewport.

- Rental top viewport: `evidence/ordering-page-rental-top.png`
- Rental bottom viewport after filling required fields: `evidence/ordering-page-rental-bottom.png`
- RideHailing top viewport: `evidence/ordering-page-ride.png`

Post-implementation screenshots were captured through real system scenario setup with isolated database, real frontend, real backend HTTP, and scenario-created ordering placements:

- Rental main viewport after filling required fields: `ordering-rental-main-after.png`
- Rental price detail bottom drawer: `ordering-rental-price-detail-after.png`
- RideHailing route map + bottom sheet viewport after provider quote evaluation: `ordering-ride-main-after.png`

Latest Rental screenshots after unifying the header and keeping the price-detail icon button in the bottom bar:

- Rental top viewport with SPU thumbnail and disabled CTA: `ordering-rental-latest-top-v2.png`
- Rental filled viewport with `￥20.00` and the price detail button next to the price: `ordering-rental-latest-filled-v2.png`

Note: icon glyph visibility in Playwright screenshots is not sufficient proof that the product icon implementation failed. The implementation should continue using the project icon utility (`i-mdi-chevron-up`) unless runtime evidence in the actual app contradicts it.

## Mock Payload Method

The screenshot pass used a real Vite frontend at `http://127.0.0.1:5177/order/new` and injected a deterministic `sessionStorage["partner-up.ordering-entry"]` payload with Playwright `addInitScript`.

This validates the actual Vue route, component tree, CSS, responsive behavior, form rendering, and footer layout. It does not validate backend price evaluation because the mock-only path did not connect a real backend and database.

## System Scenario Verification

Command:

```powershell
pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts -t commerce_rental_ordering_reaches_confirmed_fulfillment
```

Result:

```text
Test Files  1 passed (1)
Tests       1 passed | 5 skipped (6)
Duration    32.56s
```

Meaning:

- The current Rental flow can pass through real frontend, real backend HTTP, temporary database, PR placement entry, ordering form, order creation, payment, and fulfillment confirmation.
- Passing scenario behavior does not imply acceptable UI/UX quality. The scenario mostly asserts presence, state transitions, and business correctness.

Additional post-implementation scenario commands:

```powershell
pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts -t commerce_rental_ordering_reaches_confirmed_fulfillment
pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts -t commerce_ride_hailing_ordering_completes_provider_backed_trip
pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts -t commerce_ride_hailing_provider_create_failure_allows_retry_without_open_order
```

Observed result during implementation: all targeted commands passed after scenario assertions were updated to the new layout semantics.

Latest verification after header and bottom action adjustment:

```powershell
pnpm --filter @partner-up-dev/frontend build
pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts -t commerce_rental_ordering_reaches_confirmed_fulfillment
```

Observed result: both commands passed. An intermediate no-screenshot retry failed once while Vite reported a transient `PREditor.vue` import resolution error from the PR detail page; the same command passed on immediate rerun, and `pnpm --filter @partner-up-dev/frontend build` had already resolved the same import successfully.

## Source Evidence

- `apps/frontend/src/pages/OrderingFromPlacementPage.vue`
  - Header, conditional Rental/RideHailing content, footer bar, warnings, price details.
  - Body scroll and footer layout are page-owned.
- `apps/frontend/src/domains/commerce/ui/ordering/RentalOrderingContent.vue`
  - Rental page cards, SKU choice cards, locked facts, registrant form.
- `apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue`
  - Ride map mock, route callouts, setting buttons, drawers, vehicle list.
- `tests/scenario/commerce/rental-ordering.scenario.test.ts`
  - Real cross-unit Rental ordering scenario and entry route from PR placement.
- `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - Real cross-unit RideHailing ordering scenario and route map assertions.
