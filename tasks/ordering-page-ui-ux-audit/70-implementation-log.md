# Implementation Log

## 2026-06-03 Slice

Implemented the accepted generic Ordering Page layout:

- Added `OrderingPageShell` around `FullScreenPageScaffold` with `PageHeader variant="small"`.
- Added shared ordering bottom action bar, floating notice layer, and price detail bottom drawer.
- Added Rental-specific SPU summary row and RideHailing-specific SKU card components.
- Reworked Rental ordering content into a commerce order form: product summary, service facts, SKU rows, contact, participant identities, policy/notice.
- Reworked RideHailing ordering content into real `RouteMap` plus fixed bottom sheet containing passenger summary and ride SKU rows.
- Removed visible coupling copy such as `已从 PR 锁定`.
- Removed local fake map-like route section from RideHailing ordering content.
- Raised RideHailing bottom sheet above map provider layers and disabled pointer events on the non-interactive map stage so SKU rows remain clickable.

## Scenario Adjustments

- Rental scenario now waits for the price detail drawer to be visible before asserting its content.
- RideHailing scenario now asserts the real route map and bottom sheet semantics instead of fake route-polyline/callout/drawer test ids.

## Screenshot Evidence

Captured at 390 x 844 mobile viewport through system scenario runtime:

- `ordering-rental-main-after.png`
- `ordering-rental-price-detail-after.png`
- `ordering-ride-main-after.png`

## Bottom Action Bar Follow-Up

Aligned the shared bottom action bar more closely with the uniapp ride-hailing order footer:

- Broke the footer out of the 44rem page content container so the bar is viewport full-width.
- Reduced the main footer body to a 58px row plus safe-area bottom.
- Reduced the CTA from the previous large button treatment to a 40px fixed-height action.
- Kept the chevron-up affordance next to the estimated price for price detail drawer access.

Additional screenshot evidence:

- `ordering-rental-bottomaction-v2.png`

## Price Display Follow-Up

Refined bottom action price display:

- Removed the `预估应付` / `预估区间` label from the bottom bar.
- Split the chevron-up affordance into a real icon button next to the price.
- Made price rendering generic from ordering evaluation result:
  - `price.range` with min/max renders as `￥min~max`.
  - otherwise `price.totalFen` renders as `￥amount`.
- Added scenario coverage for RideHailing `￥36.00~52.00` display and visible price-detail toggle.

## SPU Card Follow-Up

Replaced the Rental-specific SPU summary row with a generic `SpuCard`:

- Layout is `flex-row(thumbnail, flex-col(title, description))`.
- Removed the chevron affordance.
- Thumbnail uses SPU presentation content:
  - first `presentation.heroImageAssetIds[0]`
  - then `presentation.detailImageAssetIds[0]`
  - fallback icon when no usable image source exists or image loading fails.
- Rental scenario now provides a presentation hero image and asserts the SPU card renders an image.

## Header And Price Detail Affordance Follow-Up

Refined the Ordering Page shell and bottom price affordance after screenshot review:

- Unified the Ordering Page header title to `下单` for all product types.
- Removed the redundant header subtitle `确认内容后创建订单`.
- Kept the price detail affordance as an independent icon button using the project icon utility `i-mdi-chevron-up`.
- Do not infer icon implementation failure from a Playwright screenshot alone; scenario/browser resource resolution can affect icon rendering evidence.
- Captured updated Rental screenshots through the real system scenario setup:
  - `ordering-rental-latest-top-v2.png`
  - `ordering-rental-latest-filled-v2.png`
- Removed the temporary screenshot hook from the scenario test after capture.
