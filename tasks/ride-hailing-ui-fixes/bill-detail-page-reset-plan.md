# Bill Detail Page Reset Plan

## Objective

- remove the current Bill Detail page body content
- remove the current Bill Detail page header subtitle
- then redesign the page only after grounding the UI in real Bill and BillLine
  data

## Classification

- Primary route: `Reality`
- Active mode: `Explore`

## Confirmed Truth

- current frontend page:
  `apps/frontend/src/pages/CommerceBillDetailPage.vue`
- current page structure is a two-card document layout:
  - bill summary card
  - line list card
- requested first code mutation is intentionally destructive:
  delete the current body content and header subtitle before new UI is designed
- current backend bill detail projection:
  - `bill`: id, sourceOrderId, status, currency, chargeTotalFen,
    paidChargeFen, refundTotalFen, refundedFen, settlementStatus
  - `order`: id, family, status, itemName
  - `viewer`: userId
  - `lines[]`: id, userId, kind, amountFen, currency, label, description,
    refundOfBillLineId, settlementStatus, paidFen, refundedFen,
    payableByViewer, checkoutHref, paymentProviderInstanceId, attemptCount,
    settledAt
- current line settlement status in `getBillDetail` is derived from
  `deriveBillPaymentState`; stable outputs are:
  - `UNPAID`
  - `PROCESSING`
  - `PAID`
  - `REFUND_PENDING`
  - `REFUNDED`

## Proposed Address And Object

- `apps/frontend/src/pages/CommerceBillDetailPage.vue`
  - first reset body content
  - remove header subtitle
- task packet logs
  - record the reset and post-reset design discussion

## State Diff

- From:
  Bill Detail page is a filled-out generic summary/list document page.
- To:
  Bill Detail page becomes an intentionally cleared shell so the next UI can be
  designed from real bill information instead of incrementally patching the old
  layout.

## Blast Radius Forecast

- frontend page only for the first reset mutation
- current scenario coverage may need temporary adjustment if any tests assert
  Bill Detail content instead of route reachability
- payment checkout back-link still depends on `/bills/:billId` remaining valid

## Invariants Check

- keep Bill Detail route `/bills/:billId`
- keep loading/error/invalid-id handling unless the human asks to reset those
  too
- keep back navigation behavior intact
- keep `bill-detail.page` and stable route-level testability

## Prerequisite Reset Result

- removed `PuPageHeader` subtitle from `CommerceBillDetailPage.vue`
- removed the current successful-state body content
- retained:
  - invalid bill-id notice
  - loading state
  - error state
  - bill-detail back navigation

## Verification Result

- `pnpm exec biome check apps/frontend/src/pages/CommerceBillDetailPage.vue`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `git diff --check -- apps/frontend/src/pages/CommerceBillDetailPage.vue`

## Current IA Direction

- requested information architecture should include:
  - order entry (`查看订单`)
  - status
  - bill-line subtotal entries with signed amount, payer, and description
  - total amount
  - payment action when payable bill lines exist
- current product/data interpretation:
  - primary user-facing `状态` should be bill settlement state, not raw
    `bill.status`
  - `总金额` should be returned by backend, not recomputed in frontend
  - header meta should keep `总金额 ￥40.00` on one row, not wrap into stacked
    label/value lines
  - payment checkout is bill-line-scoped, not bill-scoped
- current API constraint:
  - bill lines expose `userId`, but not payer display name
  - if UI must show explicit payer names, backend projection needs enrichment
- current action constraint:
  - page uses one selection-driven checkout CTA, not mixed page-level plus
    row-level pay buttons
  - selectable eligibility should follow backend `payableByViewer`, not a
    frontend `userId` equality guess

## Current Wireframe Direction

- page header:
  - `查看订单` moves into `PuPageHeader` actions
  - `状态` and `总金额` move into the `meta` slot
  - meta layout should be `flex-row justify-between`
  - amount copy should stay inline, for example `总金额 ￥40.00`
- bill summary:
  - user-facing `状态` remains settlement-oriented
  - `总金额` should be returned by backend, not recomputed in frontend
  - currency symbol must follow actual bill currency data
- bill lines:
  - use `PuCard(selectable)` plus `PuCheckbox` as the carrier
  - line layout should contain:
    - amount
    - status tag
    - payer avatar and payer name
    - description text
  - only `payableByViewer` bill lines are selectable/payable
  - non-payable lines should render disabled checkbox state
  - selected bill line drives the page-level checkout CTA
- footer CTA:
  - single CTA text is `支付 $XX.YY`
  - CTA hides completely when no payable line exists
- backend enrichment now implied by IA:
  - bill should expose backend-computed total amount
  - bill line payer needs enriched avatar/name, not only `userId`

## Scheme Review

- `PuCard(selectable)` plus `PuCheckbox` is still a good fit, but selection
  ownership must stay on the card layer.
- `PuCheckbox` should be visual-only inside the card:
  - current design-web guidance says interactive cards must not contain nested
    interactive controls
  - therefore the checkbox should use disabled/read-only presentation and
    pointer-blocked semantics, like the current `RideHailingSkuCard`
  - actual single-select state should come from `usePuSelect`
- non-payable lines should disable both:
  - checkbox visual state
  - card selection interaction
- default selection should be:
  - first payable bill line, if any
  - otherwise no selection and no footer CTA
- page-level CTA should bind strictly to the selected payable line:
  - label `支付 $XX.YY`
  - target selected line `checkoutHref`
- payer area should be treated as enriched projection, not client stitching:
  - avatar src
  - display name
  - optional viewer hint such as `你`

## Implementation Steps

1. Expand backend `BillDetailProjection.bill` with a backend-owned total amount
   field and explicit currency presentation source.
2. Expand backend `BillDetailProjection.lines[]` with payer presentation data:
   avatar src, display name, and any viewer/self marker the UI needs.
3. Keep `payableByViewer` as the only selectable/payable guard; do not
   duplicate that business rule in frontend.
4. Rebuild `CommerceBillDetailPage` header:
   move `查看订单` into actions and render `状态` plus inline `总金额` in the
   meta slot.
5. Build a BillLine card surface:
   `PuCard(selectable)` owns interaction, while `PuCheckbox` is visual-only and
   mirrors selected/disabled state.
6. Use `usePuSelect` in single-select mode for payable bill lines and seed the
   first payable line as default selection.
7. Render non-payable lines in the same layout but with disabled card/checkbox
   interaction state.
8. Add a single footer CTA bound to the selected line:
   text `支付 $XX.YY`, action to that line's checkout page, hidden when no
   payable line exists.
9. Update or add focused tests for:
   header meta rendering, default selection, disabled non-payable lines, CTA
   label, and selected-line checkout routing.

## Implementation Result

- completed step 1:
  backend now returns `bill.totalAmountFen`
- completed step 2:
  backend now enriches `lines[].payer` from user records
- completed step 3:
  frontend selection/payability follows backend `payableByViewer` only
- completed step 4:
  `CommerceBillDetailPage` header now uses actions + meta slots as planned
- completed step 5:
  `BillLineCard.vue` renders amount, status tag, payer avatar/name, and
  description with a visual-only checkbox
- completed step 6:
  payable line selection uses `usePuSelect` in explicit single-select mode with
  first-payable defaulting
- completed step 7:
  non-payable lines remain visible and disabled
- completed step 8:
  footer CTA now routes only the selected payable bill line to checkout
- completed step 9:
  RideHailing system scenario now covers two-participant bill detail and
  checkout routing

## Implementation Note

- design-web `PuCard` does not inherit arbitrary attrs, so stable
  `bill-detail.line` anchors live on a native wrapper; the inner selectable
  `PuCard` keeps the role/button interaction surface.

## Verification Result

- `pnpm exec biome check apps/frontend/src/pages/CommerceBillDetailPage.vue apps/frontend/src/domains/commerce/ui/bill-detail/BillLineCard.vue apps/frontend/src/domains/commerce/ui/order-detail/BillCard.vue apps/frontend/src/domains/commerce/model/bill-display.ts tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts apps/backend/src/domains/payment/use-cases/get-bill-detail.ts apps/backend/src/repositories/UserRepository.ts`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts -t "commerce_ride_hailing_ordering_reaches_order_detail"`
