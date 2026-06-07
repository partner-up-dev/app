# Ordering Placement Submit To Support

## Objective & Hypothesis

- Intent: Restore the real Ordering Page reached from Placement, then route the Ordering Page `下单` action to a support completion page.
- Hypothesis: `OrderingFromPlacementPage.vue` existed before commit `185ab725` and assembled Rental/RideHailing ordering content. The current route was changed to the support-only page as a tactical fallback. The correct behavior is likely:
  1. PR Placement click -> `/order/new` -> real ordering content.
  2. Ordering bottom `下单` click -> support page with manual order instructions.

## Guardrails Touched

- Frontend route wiring: `apps/frontend/src/app/router.ts`
- Restore/add page: `apps/frontend/src/pages/OrderingFromPlacementPage.vue`
- Support completion page: `apps/frontend/src/pages/OrderingSupportPage.vue`
- Ordering UI/content:
  - `apps/frontend/src/domains/commerce/ui/ordering/RentalOrderingContent.vue`
  - `apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue`
  - `apps/frontend/src/domains/commerce/ui/ordering/OrderingBottomActionBar.vue`
- Durable contract note: `docs/20-product-tdd/ecommerce-contracts.md` already describes `/order/new` as the ordering assembly surface, so restoring the page is aligned. The support handoff is the tactical MVP fallback after clicking `下单`.

## Verification

- Completed:
  - `pnpm test:unit:frontend`
  - `pnpm --filter @partner-up-dev/frontend lint:tokens`
  - `pnpm build:frontend`
  - `rg -n "[\p{Han}]" apps/frontend/src/pages/OrderingFromPlacementPage.vue apps/frontend/src/pages/OrderingSupportPage.vue apps/frontend/src/domains/commerce/ui/ordering/OrderingSupportSummaryCard.vue apps/frontend/src/domains/commerce/model/ordering-support-handoff.ts apps/frontend/src/domains/commerce/ui/ordering/OrderingBottomActionBar.vue` returned no matches after moving the new Ordering copy into locale resources.
- Not run as pass/fail for this slice:
  - Existing commerce system scenarios assert real order creation and navigation to Order Detail after clicking `create-order`. This task intentionally changes the MVP click result to manual support handoff, so those scenarios need a separate contract update before they can be meaningful again.

## Current Understanding

- Current behavior: `/order/new` immediately displays QR/support copy with `联系客服完成预订`.
- Corrected requested behavior:
  - Placement still opens the real Ordering Page.
  - The Ordering Page `下单` button should navigate to `OrderingSupportPage`.
  - Support page copy should explain: `电商功能正在加速开发中，请暂时先截图本页，然后联系客服完成下单`
- Confirmed support-page target:
  - Use `html2canvas` to generate an `订单摘要卡片`.
  - Upload the generated PNG blob through the existing image upload boundary with `purpose: "poster"`.
  - Display the returned backend image URL on `OrderingSupportPage`, like the Xiaohongshu poster flow, so the user can long-press save.
  - Keep the rendered card DOM as deterministic source for the canvas rather than attempting a browser/system screenshot.
- Locale constraint:
  - User suspected hardcoded Chinese. The Ordering support flow copy has been moved into `apps/frontend/src/locales/zh-CN.jsonc` and typed in `apps/frontend/src/locales/schema.ts`.
- UI adjustment:
  - User noted the support QR should not sit side-by-side with the generated order poster. `OrderingSupportPage` now keeps the page focused on the order summary image and opens the support QR from a contact button inside a modal.
  - Direct `/order/support` entry without a support handoff now renders a recovery state and hides the contact-support action, so users are not asked to contact support without an order summary.

## Reuse Anchors

- Poster rendering pattern: `apps/frontend/src/domains/share/use-cases/poster/html2canvas-loader.ts`
- Existing XHS upload pattern: `apps/frontend/src/domains/share/use-cases/xhs/useShareToXiaohongshu.ts`
- Generic upload helper: `apps/frontend/src/shared/upload/useCloudStorage.ts`
- Upload contract: `POST /api/upload/images/poster`, served by `GET /api/upload/images/poster/:key`
- Durable image upload contract: `docs/20-product-tdd/cross-unit-contracts.md#11-image-upload-contract`

## Proposed Runtime Shape

- New session storage payload for support handoff, separate from `partner-up.ordering-entry`:
  - selected `OrderingContentOutput`
  - price label / price detail snapshot from evaluation
  - offer/product summary derived from `OrderingEntryPayload.offerDetail`
  - product-type specific summary fields:
    - Rental: service time, selected SKU, participant count, contact phone, registrant names
    - RideHailing: origin/destination, riders, selected vehicle, quote label, contact phone
- On `OrderingSupportPage`:
  - Render visible uploaded `<img>` once generated/uploaded.
  - Render a hidden/offscreen card source for `html2canvas`.
  - Show generating/uploading/error states.
  - If upload fails, show the deterministic card/source fallback and clear instructions.

## Next Step

- Product code implemented. Next durable follow-up is to update or split commerce system scenarios so the manual support handoff is asserted separately from the real order-creation journey.
