# ErrorToast Usage Review

## Current Component

`shared/ui/feedback/ErrorToast.vue` is a local error surface with only:

- `message: string`
- `persistent?: boolean`
- `close` event when not persistent

It renders embedded page content, not a fixed-position toast stack.

## Usage Shape

Initial scan found 39 `ErrorToast` instances:

- 27 persistent embedded errors.
- 12 dismissible embedded command/form errors.

There are no usages that clearly require a global snackbar queue in the first
replacement slice.

## Typical Persistent Usage Sites

Route/page load failure:

- `apps/frontend/src/pages/PRPage.vue`
  - top-level `v-else-if="error"` after `PuLoadingState`
  - target: `PuInlineNotice tone="error"` inside `PuPageScaffold`
- `apps/frontend/src/pages/PRPairingCodePage.vue`
  - detail query error and unavailable fallback
  - target: `PuInlineNotice tone="error"`
- `apps/frontend/src/pages/MePage.vue`
  - page-level `errorMessage`
  - target: `PuInlineNotice tone="error"`
- `apps/frontend/src/pages/RouteApplicationPage.vue`
  - application page error
  - target: `PuInlineNotice tone="error"`
- `apps/frontend/src/pages/LocationApplicationPage.vue`
  - application page error
  - target: `PuInlineNotice tone="error"`

Admin workspace load failure:

- `apps/frontend/src/pages/AdminPaymentPage.vue`
  - `workspaceQuery.error.value`
  - target: `PuInlineNotice tone="error"`
- `apps/frontend/src/pages/AdminRideHailingPage.vue`
  - `workspaceQuery.error.value`
  - target: `PuInlineNotice tone="error"`
- `apps/frontend/src/pages/AdminCommerceFulfillmentPage.vue`
  - workspace load failure
  - target: `PuInlineNotice tone="error"`
- `apps/frontend/src/pages/AdminCommercePlacementPage.vue`
  - workspace load failure
  - target: `PuInlineNotice tone="error"`
- `apps/frontend/src/pages/AdminAnchorEventPage.vue`
  - page/workspace load failure
  - target: `PuInlineNotice tone="error"`

Domain region load failure:

- `apps/frontend/src/domains/event/ui/surfaces/AnchorEventFormModeSurface.vue`
  - form mode query error after `PuLoadingState`
  - target: `PuInlineNotice tone="error"`
- `apps/frontend/src/domains/pr/ui/composites/PRFactsCard.vue`
  - facts-card query error
  - target: `PuInlineNotice tone="error"` inside card/facts region
- `apps/frontend/src/domains/pr/ui/forms/PREditor.vue`
  - detail load error before editable fields
  - target: `PuInlineNotice tone="error"`

## Typical Dismissible Usage Sites

Command/form mutation failure:

- `apps/frontend/src/domains/pr/ui/forms/PREditor.vue`
  - `commandErrorMessage`
  - close handler: `resetCommandErrors`
  - target: `PuInlineNotice tone="error" dismissible @close="resetCommandErrors"`
- `apps/frontend/src/domains/pr/ui/forms/NLPRForm.vue`
  - create mutation error
  - close handler: `createMutation.reset()`
  - target: `PuInlineNotice tone="error" dismissible`
- `apps/frontend/src/domains/pr/ui/sections/InlineNLPRForm.vue`
  - create mutation error
  - close handler: `createMutation.reset()`
  - target: `PuInlineNotice tone="error" dismissible`
- `apps/frontend/src/pages/PRPage.vue`
  - update-status error inside `PuModal`
  - close handler: `resetStatusUpdate`
  - target: `PuInlineNotice tone="error" dismissible`

Admin mutation failure:

- `apps/frontend/src/pages/AdminPaymentPage.vue`
  - `pageErrorMessage`
  - close handler: `clearErrors`
  - target: `PuInlineNotice tone="error" dismissible`
- `apps/frontend/src/pages/AdminRideHailingPage.vue`
  - `pageErrorMessage`
  - close handler: `clearErrors`
  - target: `PuInlineNotice tone="error" dismissible`
- `apps/frontend/src/pages/AdminCommercePlacementPage.vue`
  - `pageErrorMessage`
  - close handler: `clearErrors`
  - target: `PuInlineNotice tone="error" dismissible`
- `apps/frontend/src/pages/AdminCommerceOfferPage.vue`
  - `pageErrorMessage`
  - close handler: `clearErrors`
  - target: `PuInlineNotice tone="error" dismissible`
- `apps/frontend/src/pages/AdminAnchorEventPage.vue`
  - `mutationErrorMessage`
  - close handler: `resetMutationErrors`
  - target: `PuInlineNotice tone="error" dismissible`
- `apps/frontend/src/domains/admin/ui/pr/views/AdminPRBasicView.vue`
  - `mutationErrorMessage`
  - close handler: `resetMutationErrors`
  - target: `PuInlineNotice tone="error" dismissible`
- `apps/frontend/src/domains/admin-commerce/ui/product-management/sections/AdminCommerceProductErrorToast.vue`
  - context-owned `errorMessage`
  - close handler: `context.clearErrorMessage`
  - target: either direct `PuInlineNotice` in that section or delete this
    one-line wrapper by moving the package component to the usage site.

## Proposed Replacement Rule

- Use `PuInlineNotice tone="error"` for all persistent embedded errors.
- Use `PuInlineNotice tone="error" dismissible` for all existing closeable
  command/form errors.
- Do not use `PuSnackbar`/`PuSnackbarHost` in Slice 1 unless a usage is found
  that is not embedded in a local page, form, modal, or region.

## Slice 1 Result

- All `ErrorToast` usage sites were migrated to direct `PuInlineNotice`
  usage.
- Existing close handlers were preserved through `dismissible @close`.
- `AdminCommerceProductErrorToast.vue` was removed; its usage site now renders
  `PuInlineNotice` directly from the product management page.
- No global snackbar host was introduced.
