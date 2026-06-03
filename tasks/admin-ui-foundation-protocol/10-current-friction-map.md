# Current Friction Map

## Evidence Snapshot

Inspected current surfaces:

- `apps/frontend/src/domains/admin/ui/layout/AdminPageScaffold.vue`
- `apps/frontend/src/pages/AdminCommerceProductPage.vue`
- `apps/frontend/src/domains/admin-commerce/ui/product-management/sections/AdminCommerceProductActionsContent.vue`
- `apps/frontend/src/domains/admin-commerce/ui/product-management/sections/AdminCommerceSpuEditorContent.vue`
- `apps/frontend/src/domains/admin-commerce/ui/product-management/sections/AdminCommerceSkuEditorContent.vue`
- `apps/frontend/src/domains/admin-commerce/ui/product-management/sections/AdminCommerceCancellationPolicyEditorContent.vue`
- `apps/frontend/src/domains/admin-commerce/ui/product-management/productManagementContext.ts`

## User-Observed Frictions

| Friction | Current Shape | Foundation Problem |
| --- | --- | --- |
| Creating SKU requires moving between top and bottom of page | Product Admin renders `new SPU` / `new SKU` in scaffold `#actions`, while SPU/SKU save actions live inside editor bottoms | Action locality is not governed. Creation and save belong to the active object workspace, not a generic page-top action slot. |
| Same field kind uses different primitives | Current Product Admin uses raw `input`, `select`, `textarea`, `ToggleSwitch`, and ad hoc text fields for structured values | There is no Admin field family that encodes type, parse/format, validation, disabled reason, and error display. |
| Form components and navigation components are siblings | `AdminCommerceProductPage.vue` composes navigation, actions, rail, and main editors at the same route level; shared state is injected through `productManagementContext` | Workspace state ownership is implicit. Rails, forms, and action bars need clear intent/event contracts under a controller. |
| Missing operation success/failure feedback | Editors catch errors into shared `context.errorMessage`; success feedback is mostly implicit selection change after create/update | Mutation feedback is not a first-class protocol with pending, success, failure, retry, and target placement. |
| Layout space use feels low-efficiency and uneven across sizes | `AdminPageScaffold` defines a two-column shell, but editor cards stack full-width and action areas are detached from local context | Responsive behavior only changes columns. It does not define density, sticky local actions, rail collapse behavior, or editor section ergonomics. |
| Containers feel like visual wrappers instead of workflow boundaries | `BentoItem` wraps editors, while sections inside editors define their own headings/actions | Container semantics are not explicit: selection boundary, editor boundary, validation boundary, and mutation boundary are mixed. |

## Root Cause Claim

The Admin UI currently has pieces of a shell, but not a complete interaction grammar.

The missing grammar is:

```text
select object -> load state -> edit draft -> validate -> execute command -> receive feedback -> continue or recover
```

Without that grammar, each page decides where actions live, which input primitive to use, how errors surface, and how rail/workspace state moves between components.

## Product Admin Pilot Pressure

Product Admin is a useful pilot because it has nested objects:

- SPU selection and creation.
- SKU selection and creation under selected SPU.
- SKU cancellation policy under selected SKU.
- Repeated structured data such as pricing rules, parameter groups, notice blocks, facts, and cancellation tiers.

This means a good protocol must support nested object editing without forcing users to jump between unrelated regions.
