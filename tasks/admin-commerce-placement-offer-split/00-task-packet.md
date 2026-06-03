# Task Packet - Admin Commerce Placement Offer Split

## Objective & Hypothesis

- Objective & Hypothesis: split the combined Merchandising `Placement + Offer`
  admin surface into independent `Offer Admin` and `Placement Admin` pages while
  keeping both under the Merchandising navigation group. Hypothesis: frontend
  route and editor separation can reuse the existing combined workspace read API
  because Offer and Placement writes are already separate.

## Guardrails Touched

- Typed input: Intent.
- Mode: Explore -> Execute.
- Durable owner: ecommerce Merchandising admin surface.
- Frontend surfaces:
  - `apps/frontend/src/app/router.ts`
  - `apps/frontend/src/domains/admin/ui/navigation/adminNavigationModel.ts`
  - `apps/frontend/src/pages/AdminCommerceOfferPage.vue`
  - `apps/frontend/src/pages/AdminCommercePlacementPage.vue`
  - `apps/frontend/src/domains/admin-commerce/ui/json-logic/JsonLogicRuleEditor.vue`
  - `apps/frontend/src/domains/admin-commerce/model/json-logic/jsonLogicRuleEditorModel.ts`
  - `apps/frontend/src/domains/admin-commerce/model/placement-matching-rules/placementMatchingRuleEditorModel.ts`
  - `apps/frontend/src/locales/zh-CN.jsonc`
  - `apps/frontend/src/locales/schema.ts`
- Existing contracts to preserve:
  - Backend admin commerce API shape.
  - Placement `matchingRule` remains JSON Logic-compatible.
  - Placement `bindingRules` remain `{ fieldKey, contextPath, lock: true }[]`.
  - Offer and Placement stay in the Merchandising group.

## Verification

- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` exited 0. It reported
  two current-worktree findings in ordering UI files, not in the admin files
  touched by this task:
  - `src/domains/commerce/ui/ordering/RentalOrderingContent.vue`
  - `src/domains/commerce/ui/ordering/RideHailingSkuCard.vue`
- Source scan found no remaining frontend references to
  `AdminCommercePlacementOfferPage`, `admin-commerce-placement-offer`,
  `navCommercePlacementOffer`, or `commerce-placement-offer`.
- Browser smoke:
  - Vite frontend listened at `http://127.0.0.1:5173/`.
  - Unauthenticated `/admin/commerce/offers` redirected to
    `/admin/login?redirect=/admin/commerce/offers`.
  - Unauthenticated `/admin/commerce/placements` redirected to
    `/admin/login?redirect=/admin/commerce/placements`.
  - Legacy `/admin/commerce/placement-offer` redirected through the route guard
    to `/admin/login?redirect=/admin/commerce/placements`.
  - Authenticated page mount smoke was blocked because Browser security policy
    rejected the attempted session setup action.
