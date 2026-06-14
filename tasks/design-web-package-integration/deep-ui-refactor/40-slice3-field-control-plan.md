# Slice 3 Field Control Plan

## Decision

Slice 3 is ready to start, but it should not be one broad migration over every
raw form control. The current codebase still has many field-control sites mixed
with domain-specific validation, native `select`, datalist, route pickers,
dynamic arrays, and submit lifecycle. Treat this as a sequence of smaller
field-control slices.

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

## Lane B: PuForm Containers

`PuForm` is now viable because `0.4.1` documents a `submit` event, but it
should be adopted only per form boundary.

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

## Lane C: Deferred Controls

Defer unless explicitly discussed:

- Native `select` fields.
- Datalist-backed fields (`list` / `:list`), because `PuInput` does not expose
  a public `list` prop.
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
