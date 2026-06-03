# Task Packet - Admin Commerce Visual Editors

## Objective & Hypothesis

- Objective & Hypothesis: replace the Product Admin raw JSON editors for SPU/SKU basics and SKU cancellation policy with visual, typed controls. Hypothesis: the existing backend contracts for `salesPolicy`, `servicePolicy`, `presentation`, `SkuFacts`, fixed-total `PricingModel`, and cancellation `tiers` are structured enough to edit directly in the frontend without changing persistence or API shape.

## Scope Draft

- In scope:
  - `/admin/commerce/products` SPU editor:
    - sales quantity policy
    - rental service requirements
    - presentation assets, selling points, parameter groups, and notice blocks
    - SPU facts as simple key/value pairs
  - `/admin/commerce/products` SKU editor:
    - Rental and RideHailing facts by product type
    - fixed-total pricing model
    - read-only/blocked treatment for dynamic quote DSL until its business language is agreed
  - `/admin/commerce/products` SKU cancellation policy editor:
    - operator buffer minutes
    - editable refund tiers
  - shared pricing rule editor:
    - SPU pricing rules and Offer pricing rules use the same visual editor and draft/build model
    - pricing rule targets support SKU, SPU, and ORDER levels
- Out of scope for this slice:
  - Placement matching rule visual editor
  - Dynamic quote calculator DSL editor
  - Order/Fulfillment read-model visualization
  - Backend schema/API changes

## Guardrails Touched

- Typed input: Intent.
- Durable owner: ecommerce Merchandising admin surface.
- Frontend surfaces:
  - `apps/frontend/src/pages/AdminCommerceProductPage.vue`
  - `apps/frontend/src/domains/admin-commerce/model/product-management/*`
  - `apps/frontend/src/domains/admin-commerce/ui/product-management/*`
  - `apps/frontend/src/locales/zh-CN.jsonc`
  - `apps/frontend/src/locales/schema.ts`
- Component split ownership:
  - Page/View owns containers and layout placement only.
  - Product-management content owns its own data access, draft state, business logic, validation, mutation orchestration, and editor UI.
  - Shared context owns only cross-content coordination state, such as selected SPU/SKU, creation mode, workspace query identity, and shared error aggregation.
- Existing contracts to preserve:
  - Backend admin commerce request payload shape.
  - Product type must match service policy type.
  - SKU facts type must match selected SPU product type.
  - SPU pricing rules remain array-shaped but are not redesigned in this slice.
  - Saving cancellation policy still creates a new policy version and rebinds the SKU.

## Verification

- `pnpm --filter @partner-up-dev/frontend build` passed after the visual editor implementation.
- `pnpm --filter @partner-up-dev/frontend build` passed after the product-management component split.
- `pnpm --filter @partner-up-dev/frontend build` passed after extracting shared SPU/Offer pricing rule editor.
- Targeted source scan passed:
  - `rg -n "json-textarea|parseJsonText|prettyJson|salesPolicyText|servicePolicyText|pricingRulesText|presentationText|factsText|tiersText|pricingModelText|JSON\\.parse|JSON\\.stringify" apps\\frontend\\src\\pages\\AdminCommerceProductPage.vue`
  - no matches.
- Component split source scan passed:
  - `rg -n "defineComponent|json-textarea|parseJsonText|prettyJson|salesPolicyText|servicePolicyText|pricingRulesText|presentationText|factsText|tiersText|pricingModelText|JSON\\.parse|JSON\\.stringify" apps\\frontend\\src\\pages\\AdminCommerceProductPage.vue apps\\frontend\\src\\domains\\admin-commerce\\ui\\product-management apps\\frontend\\src\\domains\\admin-commerce\\model\\product-management`
  - no matches.
- Pricing rule source scan passed:
  - `rg -n "pricingRulesText|targetSkuIdText|targetSkuIdLabel|pricingRulesLabel.*JSON|JSON\\.parse|JSON\\.stringify" apps\\frontend\\src\\pages\\AdminCommercePlacementOfferPage.vue apps\\frontend\\src\\domains\\admin-commerce\\ui\\pricing-rules apps\\frontend\\src\\domains\\admin-commerce\\model\\pricing-rules apps\\frontend\\src\\domains\\admin-commerce\\model\\product-management apps\\frontend\\src\\domains\\admin-commerce\\ui\\product-management apps\\frontend\\src\\locales`
  - no matches.
- `apps/frontend/src/pages/AdminCommerceProductPage.vue` is now 103 lines and owns only the admin page/container assembly for the product-management surface.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` exited 0. It reported existing findings in `src/shared/ui/forms/MultiStopToggle.vue`; none were in the product-management files touched by this task.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` also exited 0 after shared pricing rule extraction with the same existing `MultiStopToggle.vue` findings only.
- Browser smoke check:
  - Vite frontend served at `http://127.0.0.1:5173/`.
  - Playwright opened `/admin/commerce/products` with a seeded admin localStorage session.
  - Page stayed on `/admin/commerce/products`, rendered the Product admin shell, and reported `textareaCount: 0` / `jsonTextareaCount: 0`.
  - Backend-backed commerce requests returned 500 in this local smoke check, so this is a frontend mount/no-raw-JSON-editor check rather than a full data workflow verification.
  - After shared pricing rule extraction, Playwright also opened `/admin/commerce/placement-offer`; the route mounted without page errors, but the same backend 500s kept the data-backed editor bodies behind loading state.
