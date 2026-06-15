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
lives in `40-slice3-field-control-plan.md`; the 0.4.3 reassessment lives in
`45-slice3-0.4.3-reassessment.md`; package-side capability needs live in
`50-form-capability-needs.md`.

Original scope:

- Replace eligible text, URL, email, tel, search, number, password,
  datetime-local, and textarea controls with `PuFormItem` +
  `PuInput`/`PuTextarea`.
- Keep validation/error message ownership at the owning domain component.
- Avoid local field CSS clones such as `field-input`, `pm-field-input`,
  `analytics-input`, and `text-area` where package controls cover the intent.

0.4.3 uplift:

- `PuNumberInput` now covers `number | null` app state plus min/max/step.
- `PuSelect` now covers dense web-native single selection.
- `PuInput` now explicitly documents native `list` forwarding.
- `PuTextarea` now explicitly documents `rows`, `form`, and `change`.
- `PuForm` now documents native attributes and external submit support.
- `PuChipInput` now covers plain editable string-array token input.

Current direction:

- Native `select`, datalist-backed controls, and nullable numeric fields are no
  longer globally deferred.
- Continue batching by usage boundary. Do not do one broad raw-control sweep.
- Keep multi-select, option groups, async/custom select rendering, and
  non-plain tag editors out of low-risk sub-slices.
- The first 0.4.3 implementation pass is recorded in
  `46-slice3-0.4.3-implementation.md`.

0.4.1 uplift already applied:

- `AdminAnalyticsPage.vue` filter inputs use `PuInput`, including
  `native-type="datetime-local"`.
- `PRFilterRail.vue`, `AdminPRBasicView.vue`, and `PoiBasicSection.vue`
  datetime-local fields use direct `PuInput`.

0.4.3 recommended next sub-slices:

- Slice 3B: select and datalist rebaseline with `PuSelect` and `PuInput list`.
- Slice 3C: numeric field cleanup with `PuNumberInput`.
- Slice 3D: `PuForm` boundary cleanup where native form identity and external
  submit behavior are preserved.
- Slice 3E: plain editable token input cleanup with `PuChipInput`, starting
  with PR editor preferences if the interaction contract is confirmed.

0.4.3 implementation notes:

- Completed the bounded Slice 3B select/datalist group.
- Completed the bounded Slice 3C Anchor Event numeric group.
- Completed the small Slice 3D `PuForm` boundaries for `NLPRForm.vue` and
  `UpdatePRStatusForm.vue`, plus direct field-control migration for
  `PRJoinGateConfigEditor.vue`.
- Completed Slice 3E for the plain `PREditor.vue` preferences tag input.
- Deferred `InlineNLPRForm.vue`, broad `PREditor.vue` field migration,
  `FormModePreferenceControl.vue`, and larger admin commerce/payment form
  groups.

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

Status: completed.

Scope:

- Replace remaining local loading/error/empty displays in list/card modes with
  package components.
- Use `PuEmptyState`, `PuInlineNotice`, `PuLoadingState`, or `PuSkeleton`
  according to the state.

Implementation notes:

- Detailed scope and deferrals live in `60-slice6-anchor-event-states.md`.
- Keep Card Mode empty-stack creation controls out of this slice; that path
  carries form and assisted-create workflow behavior and belongs with the
  high-risk interaction lane.
- Migrated low-risk Anchor Event loading/error/empty states directly to
  `PuLoadingState`, `PuInlineNotice`, and `PuEmptyState` at usage sites.

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

## Slice 8: Chip And Tag Display Cleanup

Status: completed.

Scope:

- Replace local badge, pill, and static status/category label markup with
  direct `PuTag` usage.
- Replace token-display chip lists with direct `PuChip`/`PuChipGroup` usage.
- Start with PR detail/header status metadata and delete `PRStatusBadge` once
  its usage sites are cleared.

Planning notes:

- Detailed badge audit lives in `70-chip-tag-badge-audit.md`.
- Keep selectable/removable tag editors out of a passive display cleanup slice
  unless the interaction contract is explicitly reviewed.
- Current execution explicitly excludes `FormModePreferenceControl` `tag-pill`
  and `PREditor` / `PRForm.scss` tag editor controls.

Implementation notes:

- Migrated PR status/type display, admin provider status, analytics outcome
  status, PR roster display labels, Anchor Event demand-card labels, and PR
  facts roster overflow marker to direct `PuTag`, `PuChip`, or `PuChipGroup`.
- Deleted the local `PRStatusBadge` wrapper.

## Slice 9: Form Mode Preference Composition Pilot

Status: completed.

Scope:

- Treat `FormModePreferenceControl.vue` as the first composition-based
  migration rather than another one-to-one replacement.
- Compose the drawer from direct package primitives:
  `PuCell`, `PuDrawer`, `PuChipGroup`, `PuChip`, `PuChipInput`,
  `PuInlineNotice`, and `PuButton`.
- Replace local `tag-pill*` and `inline-message*` ownership with package
  components.
- Keep the domain interaction contract explicit: one selected tag per
  category, multiple uncategorized selections, custom tag normalization,
  mutation submission for new custom labels, and unchanged
  `update:modelValue` output.

Planning notes:

- Detailed packet lives in `80-form-mode-preference-composition.md`.
- `PuChipInput` should own the custom preference entry subset, not the whole
  curated option selector. Package docs still defer suggestions and custom
  listbox behavior.
- Treat the implementation as a pilot. Record what package composition
  generalized, what still required domain-owned state, and what should inform
  Slice 10.

Implementation notes:

- Migrated `FormModePreferenceControl.vue` to direct `PuChipGroup`, `PuChip`,
  `PuChipInput`, `PuFormItem`, and `PuInlineNotice` composition.
- Preset preference candidates now render as selectable package chips.
- Custom preference entry is now a `PuChipInput` lane with chip-slot
  composition for selectable/removable custom values.
- Removed local `tag-pill*`, `inline-message*`, and draft-input state.
- Kept category selection, uncategorized selection, label normalization, and
  custom-tag submission as domain-owned logic.

Verification:

- Passed `pnpm --filter @partner-up-dev/frontend build`.
- Passed `pnpm --filter @partner-up-dev/frontend lint:tokens`.
- Passed `pnpm test:unit:frontend`.
- Passed targeted source scan for old `FormModePreferenceControl` local pill
  and inline-message symbols.
- Passed `git diff --check`.

## Slice 10: Composition Pattern Rollout

Status: candidate.

Scope:

- Use the actual Slice 9 implementation evidence to identify other components
  that need composition-plus-refactor rather than one-to-one replacement.
- Focus on surfaces that mix local UI primitives, package-eligible containers,
  product state, and repeated display/form structures.
- Implement follow-up candidates one at a time; do not turn this into a broad
  raw-field or passive badge sweep.

Initial candidates:

- `InlineNLPRForm.vue`: compact high-signal candidate for `PuForm` +
  `PuFormItem` + `PuInput` + icon `PuButton` + `PuInlineNotice`.
- `PRPartnerSection.vue`: section-level content/container split with
  `PuCard`, facts/summary composition, notices, and direct actions.
- `PRFactsCard.vue`, `AdminNavigationPanel.vue`, and
  `FormModeNoMatchResult.vue`: medium-confidence candidates that need a short
  topology note before implementation.

Planning notes:

- Detailed rollout packet lives in `90-composition-pattern-rollout.md`.
- Gesture-heavy surfaces such as the full Form Mode surface still require
  topology mapping before production edits.
- `AdminCommerceSpuEditor.vue` is explicitly out of Slice 10.
- With `AdminCommerceSpuEditor.vue` out of scope, no current Slice 10
  candidate should plan around `PuChipInput`; remaining candidates use
  `PuInput`, `PuButton`, `PuInlineNotice`, `PuCard`, `PuDescriptionList`,
  `PuCellGroup`, `PuChip`, or `PuChipGroup` according to their semantics.
