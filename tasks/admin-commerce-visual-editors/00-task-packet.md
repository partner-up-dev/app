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
- Out of scope for this slice:
  - Offer pricing rules visual editor
  - Placement matching rule visual editor
  - Dynamic quote calculator DSL editor
  - Order/Fulfillment read-model visualization
  - Backend schema/API changes

## Guardrails Touched

- Typed input: Intent.
- Durable owner: ecommerce Merchandising admin surface.
- Frontend surfaces:
  - `apps/frontend/src/pages/AdminCommerceProductPage.vue`
  - `apps/frontend/src/locales/zh-CN.jsonc`
  - `apps/frontend/src/locales/schema.ts`
- Existing contracts to preserve:
  - Backend admin commerce request payload shape.
  - Product type must match service policy type.
  - SKU facts type must match selected SPU product type.
  - SPU pricing rules remain array-shaped but are not redesigned in this slice.
  - Saving cancellation policy still creates a new policy version and rebinds the SKU.

## Verification

- `pnpm --filter @partner-up-dev/frontend build` passed.
- Targeted source scan passed:
  - `rg -n "json-textarea|parseJsonText|prettyJson|salesPolicyText|servicePolicyText|pricingRulesText|presentationText|factsText|tiersText|pricingModelText|JSON\\.parse|JSON\\.stringify" apps\\frontend\\src\\pages\\AdminCommerceProductPage.vue`
  - no matches.
- Browser smoke check:
  - Vite frontend served at `http://127.0.0.1:5173/`.
  - Playwright opened `/admin/commerce/products` with a seeded admin localStorage session.
  - Page stayed on `/admin/commerce/products`, rendered the Product admin shell, and reported `textareaCount: 0` / `jsonTextareaCount: 0`.
  - Backend-backed commerce requests returned 500 in this local smoke check, so this is a frontend mount/no-raw-JSON-editor check rather than a full data workflow verification.
