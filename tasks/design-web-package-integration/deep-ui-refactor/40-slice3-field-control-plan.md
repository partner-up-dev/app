# Slice 3 Field Control Plan

## Decision

Slice 3 is ready to start, but it should not be one broad migration over every
raw form control. The current codebase still has many field-control sites mixed
with domain-specific validation, native `select`, datalist, route pickers,
dynamic arrays, and submit lifecycle. Treat this as a sequence of smaller
field-control slices.

## 0.4.3 Reassessment

`@partner-up-dev/design-web@0.4.3` changes the Slice 3 boundary materially.
The detailed reassessment lives in `45-slice3-0.4.3-reassessment.md`.

Newly viable package APIs:

- `PuNumberInput` for numeric app state, including `number | null`, `min`,
  `max`, and `step`.
- `PuSelect` for dense web-native single selection.
- `PuInput` with documented native `list` forwarding for datalist-backed
  free-text fields.
- `PuTextarea` with documented `rows`, `form`, and `change`.
- `PuForm` with documented native form attributes and external submit support.
- `PuChipInput` for plain editable string-array token input.

Implication:

- Native `select`, datalist-backed fields, and numeric fields are no longer
  deferred by default.
- They still need bounded sub-slices because many remaining controls live in
  large editor forms or dynamic admin DSL editors.

## Current Evidence

Read-only scans on 2026-06-14 found raw `input`/`textarea` controls in these
main clusters:

- Admin PR/POI:
  `AdminPRBasicView.vue`, `AdminPRMessagesView.vue`, `PRFilterRail.vue`,
  `PoiBasicSection.vue`, `PoiReviewSection.vue`, `PoiSelectorRail.vue`.
- Admin Anchor Event:
  details, default meeting point, capacity defaults, location pool, location
  meeting points, preference tags, landing rollout, time-pool strategy, route
  pool, and route applications components.
- Admin Commerce:
  product management editors, pricing rules, JSON logic, offer, placement,
  fulfillment, payment, and ride-hailing pages.
- PR user flows:
  `PREditor.vue`, `NLPRForm.vue`, `InlineNLPRForm.vue`,
  `PRJoinGateConfigEditor.vue`, `DateTimeRangePicker.vue`,
  `PRPlaceModeField.vue`, and `PRWaitlistActions.vue`.

The scan also found multiple native `select` and datalist-backed fields. These
remain separate from the straightforward `PuInput`/`PuTextarea` lane.

## Lane A: Straight Field Controls

Use direct package fields:

- `PuFormItem` for label, hint, required, and error text.
- `PuInput` for single-line text, URL, email, tel, search, number, password,
  date, time, and datetime-local.
- `PuTextarea` for multiline text.

0.4.3 adjustment:

- Use `PuNumberInput`, not `PuInput`, for numeric app state.
- Use `PuInput list` for datalist-backed free-text suggestions.
- Use `PuTextarea rows` for low-risk native textarea sizing.

Good first targets:

- `AdminPRMessagesView.vue`: only textareas, low interaction complexity.
- `PoiReviewSection.vue`: one textarea, low blast radius.
- `AnchorEventDefaultMeetingPointEditor.vue`: one textarea plus one text input.
- `AnchorEventCapacityDefaultsEditor.vue`: two number inputs.
- `AnchorEventDetailsEditor.vue`: title/type/description fields while leaving
  native status `select` untouched.
- `PRJoinGateConfigEditor.vue`: text/number/textarea controls, no native
  submit lifecycle.

Rules:

- Do not keep local field wrappers.
- Do not migrate native `select` or datalist fields in this lane.
- Preserve owner validation and dirty-state events at the usage site.
- Remove local `.field-input`, `.field-textarea`, `.pm-field-input`, or
  `.text-area` CSS only when all users in that component are gone.

## Lane B: Select And Datalist Controls

Use direct package controls:

- `PuSelect` for fixed one-of-many choices.
- `PuInput` with native `list` forwarding for free text plus suggestions.

Good targets:

- `AdminAnalyticsPage.vue` mode filter select.
- `PRFilterRail.vue` type/location datalist fields and status select.
- `AnchorEventDetailsEditor.vue` status select.
- `AnchorEventFeedbackQuestionnairePicker.vue`.
- `PoiSelectorRail.vue` selector/search controls.

Rules:

- Do not use `PuSelect` for free-text suggestions; use `PuInput list`.
- Do not include multi-select, option groups, async option loading, or custom
  option rendering in this lane.

## Lane C: Numeric Controls

Use `PuNumberInput` for numeric state.

Good targets:

- Revisit `AnchorEventCapacityDefaultsEditor.vue` to remove local string
  adapters.
- `AnchorEventLandingRolloutEditor.vue`.
- `AnchorEventTimePoolStrategyEditor.vue`.
- Admin commerce product/SKU/pricing/cancellation numeric fields.
- Admin payment and ride-hailing numeric config fields.

Rules:

- Keep string-backed numeric-looking fields on `PuInput` when formatting must
  be preserved exactly.
- Batch dynamic JSON/rule-editor fields separately if they are part of a DSL
  editing surface.

## Lane D: PuForm Containers

`PuForm` is now viable because the package documents `submit`, native form
attributes, and external submit button support. It should still be adopted only
per form boundary.

Forms using `id`/external submit no longer need to be deferred for that reason.

Candidate order:

1. `InlineNLPRForm.vue` and `NLPRForm.vue`: compact PR submission forms with
   simple native submit behavior.
2. `UpdatePRStatusForm.vue`: small status submit form if package form semantics
   keep the existing `formId` integration intact.
3. `PREditor.vue`: larger and should wait until field groups are split or at
   least mapped.
4. Admin payment/ride-hailing forms: use later, because they combine entity
   selection, multiple selects, and persistence actions.

Rules:

- Do not wrap old native markup in `PuForm` just to claim migration.
- Use `PuForm` when the submit boundary is the real form boundary.
- Keep submit side effects and mutation ownership in the current owner
  component/composable.
- Pause before changing form IDs or external button submit relationships.

## Lane E: Editable Token Inputs

Use `PuChipInput` for plain string-array token entry.

Good targets:

- `PREditor.vue` preferences tags input.

Needs discussion:

- `FormModePreferenceControl.vue` remains a richer interaction surface with
  drawer descriptions, curated options, custom draft creation, and removal.
  `PuChipInput` may cover part of it, but it is not a passive or mechanical
  replacement.

## Deferred Controls

Defer unless explicitly discussed:

- Multi-select, option-group, async-option, or custom-rendered select fields.
- Checkbox grids and weekday selectors unless a matching package control is
  selected.
- Dynamic JSON/rule editors where input widgets are embedded in a DSL editor.

## Proposed First Subslice

Status: implemented for the first low-risk field-control group.

Start with Lane A, not `PuForm`.

Suggested scope:

- `AdminPRMessagesView.vue`
- `PoiReviewSection.vue`
- `AnchorEventDefaultMeetingPointEditor.vue`
- `AnchorEventCapacityDefaultsEditor.vue`
- `AnchorEventDetailsEditor.vue` text/textarea fields only

This keeps the first field-control slice small, exercises `PuTextarea` and
number/text `PuInput`, and avoids submit, select, datalist, and dynamic-array
semantics.

Verification:

- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- `pnpm test:unit:frontend`
- targeted scans for raw field CSS in touched files
- `git diff --check`

Implementation notes:

- Migrated `AdminPRMessagesView.vue`, `PoiReviewSection.vue`,
  `AnchorEventDefaultMeetingPointEditor.vue`,
  `AnchorEventCapacityDefaultsEditor.vue`, and the text/textarea fields in
  `AnchorEventDetailsEditor.vue`.
- Kept the native status `select` in `AnchorEventDetailsEditor.vue`.
- `PuInput native-type="number"` required local computed string adapters for
  nullable numeric state. This is recorded as an upstream design package need
  in `50-form-capability-needs.md`.

Verification:

- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `pnpm test:unit:frontend` passed.
- `git diff --check` passed.
- Targeted scans found no raw `<input>` or `<textarea>` in touched files.
- Targeted field CSS scan found only the intentionally retained native status
  `select` in `AnchorEventDetailsEditor.vue`.

## 0.4.3 Implementation Pass

Status: implemented and verified.

Detailed implementation notes live in `46-slice3-0.4.3-implementation.md`.

Scope completed:

- Lane B: migrated the bounded select/datalist group to `PuSelect` and
  `PuInput list`.
- Lane C: migrated the bounded Anchor Event numeric group to `PuNumberInput`.
- Lane D: migrated only real small form boundaries to `PuForm`, and migrated
  the dynamic join-gate field group to package field controls.
- Lane E: migrated the plain `PREditor.vue` preferences string-array editor to
  `PuChipInput`.

Still deferred:

- `InlineNLPRForm.vue`, because only replacing the outer form would leave the
  custom inline input/send/voice composition untouched.
- Broad `PREditor.vue` field migration and larger admin commerce/payment
  forms.
- `FormModePreferenceControl.vue`, because it is not a plain chip input.
