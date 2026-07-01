# Slice 11: Upload, Select, And Multi-Stop Controls

## Objective & Hypothesis

Objective: migrate the next form-control cluster to direct
`@partner-up-dev/design-web` package components: `PuFileUpload`,
`PuFilesUpload`, `PuMultiStopToggle`, and `PuSelect`.

Hypothesis: this cluster removes the last local upload UI wrapper, deletes the
local multi-stop toggle primitive, and clears a meaningful group of native
`<select>` controls without touching high-risk picker or state-machine
surfaces.

## Current Mode

- Input route: `Constraint`.
- Active mode: `Execute`.
- Current status: implemented and verified.
- Scope boundary: frontend UI component migration and task-local planning.

## Guardrails Touched

- Use direct package components at usage sites. Do not preserve old local
  upload/select/toggle wrappers around package components.
- Preserve backend upload transport, mutation contracts, route workflows, and
  product validation semantics.
- Do not use package internals or story-only helpers.
- Keep `AdminCommerceSpuEditor.vue` out of this slice by prior human
  constraint.
- Do not pull `PuPicker` into this slice. It is a drawer/picker interaction,
  not a native select replacement.

## Package API Constraints

- `PuFileUpload` is for one attachment value by file picker, drag/drop, or URL.
- `PuFilesUpload` is for multiple attachments/URLs and owns collection UI.
- Both upload components emit file/URL selection events but do not replace app
  backend upload transport. The app should keep `useCloudStorage` and user
  avatar mutations as domain/shared transport logic.
- `PuMultiStopToggle` options provide accessible value text but do not render
  visible labels. Keep the current adjacent active-mode label in
  `PRTimeWindowEditor.vue`.
- `PuSelect` values are `string | number | null`; typed computed adapters are
  needed for enum fields and nullable ids.
- `PuSelect` does not cover multi-select, option groups, async loading, or
  custom option rendering.

## Scope

### 1. File Upload Controls

Primary target: delete the shared upload UI wrapper after usage sites clear.

- `apps/frontend/src/shared/upload/ImageUrlInput.vue`
  - Replace this local UI primitive with direct package component usage at call
    sites.
  - Keep `apps/frontend/src/shared/upload/useCloudStorage.ts` as the backend
    image-upload transport.
- `apps/frontend/src/pages/LocationApplicationPage.vue`
  - Single required image upload, URL output.
  - Candidate: `PuFileUpload mode="file"` or `mode="both"` depending on
    whether manual URL entry remains intentionally supported.
- `apps/frontend/src/domains/feedback/ui/FeedbackQuestionnaireForm.vue`
  - Single feedback image upload, upload-only today.
  - Candidate: `PuFileUpload mode="file"`.
- `apps/frontend/src/domains/admin/ui/anchor-event/components/AnchorEventMediaEditor.vue`
  - Two single image URL fields: event cover and beta group QR code.
  - Candidate: two direct `PuFileUpload` instances.
- `apps/frontend/src/pages/MePage.vue`
  - Single avatar file upload through `useUpdateCurrentUserAvatar`.
  - Candidate: direct `PuFileUpload mode="file"`; keep avatar mutation as the
    transport boundary.
- `apps/frontend/src/domains/admin/ui/poi/sections/PoiBasicSection.vue`
  - POI gallery is currently a manual URL/input/upload plus hand-rolled grid.
  - Candidate: `PuFilesUpload` with a `string[]` gallery adapter and direct
    remove/update events.

Secondary optional targets if the first upload pass stays small:

- `apps/frontend/src/domains/admin/ui/anchor-event/components/AnchorEventDefaultMeetingPointEditor.vue`
- `apps/frontend/src/domains/admin/ui/pr/views/AdminPRBasicView.vue`
- `apps/frontend/src/domains/admin/ui/poi/sections/PoiBasicSection.vue`
  meeting-point image URL

These are URL-only image fields. They can become `PuFileUpload mode="url"` if
the field should present as an attachment URL entry rather than a plain URL
input.

### 2. Multi-Stop Toggle

Primary target:

- `apps/frontend/src/domains/event/ui/controls/PRTimeWindowEditor.vue`
  - Replace the local `MultiStopToggle` import and usage with direct
    `PuMultiStopToggle`.
  - Preserve the visible active-mode label beside the toggle.

Delete after usage clears:

- `apps/frontend/src/shared/ui/forms/MultiStopToggle.vue`

### 3. PuSelect Series

First pass should focus on non-Commerce and already-adjacent admin form
surfaces:

- `apps/frontend/src/domains/admin/ui/poi/sections/PoiBasicSection.vue`
  - Availability rule mode, kind, and frequency.
- `apps/frontend/src/domains/admin/ui/pr/views/AdminPRBasicView.vue`
  - PR status, visibility, feedback questionnaire instance, and feedback
    questionnaire template selects.
- `apps/frontend/src/pages/AdminRideHailingPage.vue`
  - Provider and status selects.
- `apps/frontend/src/pages/AdminPaymentPage.vue`
  - Provider, status, and charge mode selects.
- `apps/frontend/src/pages/AdminFeedbackQuestionnairesPage.vue`
  - Template selector in the rail.

Already migrated examples to follow:

- `apps/frontend/src/domains/admin/ui/pr/components/PRFilterRail.vue`
- `apps/frontend/src/domains/admin/ui/anchor-event/components/AnchorEventFeedbackQuestionnairePicker.vue`
- `apps/frontend/src/domains/admin/ui/anchor-event/components/AnchorEventDetailsEditor.vue`

Deferred `PuSelect` groups:

- `apps/frontend/src/domains/admin-commerce/ui/product-management/sections/AdminCommerceSpuEditor.vue`
  remains out of scope by prior human constraint.
- Other Admin Commerce product/pricing/json-logic editors should be considered
  as a later commerce-owned select-control slice, because they contain many
  related selects and custom model adapters.
- `AnchorEventInlinePlaceSelector.vue` should not be part of this `PuSelect`
  group. Its preview-plus-location selection may be a later `PuPicker` or
  composition trial.

## Non-Goals

- Do not migrate generated poster/thumbnail uploads that call
  `useCloudStorage().uploadImage(blob)`. Those are programmatic uploads, not
  user file upload controls.
- Do not introduce a new local `ImageUrlInput` wrapper around package upload
  components.
- Do not migrate `ProductLocalDateCalendarPicker`.
- Do not replace Form Mode `PuWheelPicker` usage with `PuPicker`.
- Do not change backend upload payloads or persisted URL/string-array shapes.

## Implementation Order

1. Completed: replaced `MultiStopToggle` first and deleted the local primitive.
2. Completed: migrated `ImageUrlInput` usage sites to direct `PuFileUpload`
   usage, then deleted `ImageUrlInput.vue`.
3. Completed: migrated POI gallery to `PuFilesUpload`, with explicit
   `string[]` to package-item mapping.
4. Completed: migrated the non-Commerce `PuSelect` group.
5. Completed: re-scanned for leftover `ImageUrlInput`, `MultiStopToggle`, and
   raw native selects in the targeted files.

## Implementation Notes

- Added `apps/frontend/src/shared/upload/useDesignWebImageUpload.ts` as a
  non-UI adapter between design-web upload item state and app-owned URL string
  state.
- Kept `apps/frontend/src/shared/upload/useCloudStorage.ts` as the backend
  upload transport. Generated poster/thumbnail uploads still call it directly
  and were not migrated.
- Migrated upload controls:
  - `LocationApplicationPage.vue`: required POI image upload via
    `PuFileUpload mode="file"`.
  - `FeedbackQuestionnaireForm.vue`: dynamic image upload questions via direct
    `PuFileUpload`.
  - `AnchorEventMediaEditor.vue`: cover image and beta group QR via
    `PuFileUpload mode="both"`.
  - `MePage.vue`: avatar file selection via direct `PuFileUpload`, with the
    existing avatar mutation preserved.
  - `PoiBasicSection.vue`: POI gallery via `PuFilesUpload mode="both"`.
  - URL-only meeting-point image fields via `PuFileUpload mode="url"`.
- Migrated `PRTimeWindowEditor.vue` to direct `PuMultiStopToggle`; its fallback
  date/time select controls also now use `PuSelect`.
- Migrated `PuSelect` targets in POI availability rules, admin PR basic
  selects, payment provider config, ride-hailing provider config, and feedback
  questionnaire template selection.
- Deferred raw selects after this pass:
  - `AdminCommerceOfferPage.vue` and `AdminCommercePlacementPage.vue`.
  - Admin Commerce product/pricing/json-logic editors from the earlier audit.
  - `AnchorEventInlinePlaceSelector.vue`, because it is a place-selection
    interaction candidate rather than a simple native-select replacement.

## Verification

- Passed `pnpm --filter @partner-up-dev/frontend build`.
- Passed `pnpm --filter @partner-up-dev/frontend lint:tokens`.
- Passed `pnpm test:unit:frontend`.
- Passed targeted source scans:
  - no `ImageUrlInput` imports or tags
  - no `@/shared/ui/forms/MultiStopToggle.vue` import
  - no `<select` remains in the targeted Slice 11 files; remaining source
    matches are deferred Commerce pages or `AnchorEventInlinePlaceSelector.vue`
  - no local upload primitive classes from `ImageUrlInput.vue`
- Passed `git diff --check`.
