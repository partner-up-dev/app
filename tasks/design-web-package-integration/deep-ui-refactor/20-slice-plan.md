# Slice Plan

## Planning Rule

Each slice should reduce local UI ownership while preserving product workflow
semantics. A slice may accept package-native visual and micro-interaction
differences, but it should not hide package components behind compatibility
wrappers just to preserve old markup or styling.

## Slice 1: Platform Residuals

Status: completed.

Scope:

- `PageHeader` -> direct `PuPageHeader` usage at call sites.
- `ErrorToast` -> direct package feedback components at call sites.
- Delete local `shared/ui/navigation/PageHeader.vue` and
  `shared/ui/feedback/ErrorToast.vue` after call sites clear.

Working decisions:

- Persistent route, page, and region errors should become
  `PuInlineNotice tone="error"`.
- Dismissible command/form errors should become
  `PuInlineNotice tone="error" dismissible` unless a usage is genuinely
  transient page-level feedback.
- Do not introduce app-wide `PuSnackbarHost` in this slice. The current
  `ErrorToast` usages are embedded in page or form flow; replacing them with
  a global snackbar queue would change feedback placement and lifecycle more
  than necessary.
- Preserve `PageHeader` back behavior deliberately. If a usage depends on the
  old fallback route behavior, map it at the usage site or through a small
  composable before deleting the local facade.

Expected direct package imports:

- `PuPageHeader`
- `PuInlineNotice`

Verification:

- Frontend build.
- Frontend token lint.
- Frontend unit tests.
- Source scan shows no `@/shared/ui/navigation/PageHeader.vue` imports.
- Source scan shows no `@/shared/ui/feedback/ErrorToast.vue` imports.
- Source scan shows no `<PageHeader` or `<ErrorToast` tags.
- `git diff --check`.

Implementation notes:

- Added `shared/routing/useFallbackBack.ts` to preserve the old fallback-back
  behavior without retaining a UI wrapper.
- Migrated `PageHeader` usage sites directly to `PuPageHeader`.
- Migrated embedded persistent and dismissible `ErrorToast` usage sites to
  direct `PuInlineNotice tone="error"` usage.
- Deleted `shared/ui/navigation/PageHeader.vue`,
  `shared/ui/feedback/ErrorToast.vue`, and the one-line
  `AdminCommerceProductErrorToast.vue` wrapper.
- Updated `PRPage.creator-actions.test.ts` to assert the summary heading
  semantically instead of relying on the deleted local
  `.page-header__title` class.

## Slice 2: Admin Container Primitives

Status: candidate.

Scope:

- Replace `BentoLayout`/`BentoItem` with `PuBentoGrid`/`PuBentoItem` at usage
  sites when the layout is truly bento/dashboard-like.
- Evaluate `AdminRailPanel` usage sites for direct `PuCard`, `PuCellGroup`, or
  local admin container retention.
- Keep `AdminPageScaffold` only if it remains a real admin layout container
  over `PuPageScaffold` rather than a visual facade.

Primary risk:

- Admin pages use these containers broadly. Migration should be batched by
  domain/page group, not all admin pages at once unless the diff stays small.

## Slice 3: Eligible Field Controls

Status: in progress. First 0.4.1-enabled datetime cleanup completed, and first
low-risk field-control group implemented. Detailed field-control lane planning
lives in `40-slice3-field-control-plan.md`; package-side capability needs live
in `50-form-capability-needs.md`.

Scope:

- Replace eligible text, URL, email, tel, search, number, password,
  datetime-local, and textarea controls with `PuFormItem` +
  `PuInput`/`PuTextarea`.
- Keep validation/error message ownership at the owning domain component.
- Avoid local field CSS clones such as `field-input`, `pm-field-input`,
  `analytics-input`, and `text-area` where package controls cover the intent.

Still out of scope for this slice by default:

- Native `select` and datalist-backed controls unless the product accepts a
  `PuPicker` interaction.
- Broad `PuForm` adoption unless a specific form can use package
  schema/validation and submit semantics directly.

0.4.1 uplift already applied:

- `AdminAnalyticsPage.vue` filter inputs use `PuInput`, including
  `native-type="datetime-local"`.
- `PRFilterRail.vue`, `AdminPRBasicView.vue`, and `PoiBasicSection.vue`
  datetime-local fields use direct `PuInput`.

## Slice 4: Read-Only Display Cleanup

Status: candidate.

Scope:

- Replace local KPI cards, summary grids, fact grids, status labels, and row
  groups with `PuBentoItem`, `PuCard`, `PuDescriptionList`,
  `PuDescriptionItem`, `PuCellGroup`, `PuCell`, `PuTag`, or `PuChipGroup`.
- Prefer this for admin analytics and commerce/admin summary surfaces before
  changing high-interaction user flows.

## Slice 5: PR Editor Structure

Status: candidate.

Scope:

- Split `PREditor.vue` and admin PR editor forms by field group and product
  responsibility.
- Keep writes, cache invalidation, routing, and telemetry in parent components
  or domain composables.
- Move reusable product field groups into PR-domain components.

## Slice 6: Anchor Event Low-Risk States

Status: candidate.

Scope:

- Replace remaining local loading/error/empty displays in list/card modes with
  package components.
- Use `PuEmptyState`, `PuInlineNotice`, `PuLoadingState`, or `PuSkeleton`
  according to the state.

## Slice 7: Anchor Event High-Risk Interactions

Status: deferred.

Scope:

- Form Mode selection state, no-match state, matched handoff, long-press CTA,
  carousel, card swipe projection, and splash handoff.

Required before implementation:

- Draw a state topology and sequence diagram for the surface.
- Identify which components own local interaction state versus route/process
  state.
- Confirm any package substitution that changes gesture or transition
  semantics.
