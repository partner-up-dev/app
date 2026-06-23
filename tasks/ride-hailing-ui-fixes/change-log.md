# Change Log

This file is the current working change surface. Keep completed slice details
compact and move old completed history to archive.

Archived full history:

- `archive/change-log-ordering-through-order-detail-map.md`

## Last Completed Slice: RideHailing Order Detail Map Manual Review Corrections

- Fixed shared Tencent map single-coordinate fitting so active single markers
  respect `fitPadding`.
- Preserved the existing single-point max zoom cap.
- User manually confirmed the marker padding correction.
- Committed as:
  - `3c1eccb0 feat(ride-hailing): expose provider live geometry`
  - `413cb260 feat(frontend): render ride-hailing order detail map states`
  - `b568eefa fix(map): respect padding for single-marker fit`

## Last Completed Slice: RideHailing Order Detail PuFloatPanel Content

- Replaced raw JSON diagnostic panel content.
- Added Status Hero with status title/description and right-side action slots.
- Added readonly RideHailing SKU candidate cards only while dispatching.
- Added larger spacing before lifecycle-independent ride facts.
- Rendered exactly two ride fact sections:
  - route
  - riders
- Extended `RideHailingSkuCard` with a readonly/no-checkbox shape while keeping
  Ordering Page default selectable behavior unchanged.
- Extended RideHailing Order Detail projection with minimal candidate vehicle
  card facts derived from the order choice-set item.
- Updated the RideHailing system scenario from raw JSON assertions to semantic
  panel assertions.
- Limitation:
  cancel/more controls are rendered disabled because RideHailing cancel and
  more-operation domain actions do not exist yet.
- Manual review correction:
  Status Hero remains a single row on narrow screens; the actions side does not
  shrink, and the status copy side takes compression.

## Verification

- `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm exec biome check apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts tasks/ride-hailing-ui-fixes`
- `pnpm exec vitest run --config vitest.config.ts --project system-scenario -t "commerce_ride_hailing_ordering_reaches_order_detail"`
- `git diff --check`
- Status Hero single-row correction:
  - `pnpm --dir apps/frontend exec vue-tsc --noEmit`
  - `pnpm exec biome check apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue`
  - `git diff --check -- apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue`

## Next Manual Review

- Browser review of `PuFloatPanel` at dispatching and post-dispatch phases.
- Decide whether RideHailing cancellation should become a separate domain slice.
