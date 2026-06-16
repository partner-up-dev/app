# Form Capability Needs For Design Web

## Context

This note captures frontend form usage found during Slice 3A of the
`@partner-up-dev/design-web` migration. It is intended as upstream input for
future web design package work, not as an app-side API contract.

Update on 2026-06-14: `@partner-up-dev/design-web@0.4.3` resolves several
items that were previously listed as upstream needs. Keep this file as a
capability ledger: resolved items are marked rather than deleted so future
migration decisions can see why Slice 3 changed direction.

Update on 2026-06-16: `@partner-up-dev/design-web@0.4.4` corrects the chip
editor boundary. `PuChipInput` is now a single editable chip; `PuChipsEditor`
is the string-array tag/chip collection editor.

The app can already use:

- `PuFormItem` for visible labels, hints, required markers, explicit errors,
  and form-injected errors.
- `PuInput` for string-backed single-line controls, including
  `datetime-local` as of `0.4.1`.
- `PuTextarea` for string-backed multiline controls.
- `PuForm` for structural form containers with a documented `submit` event as
  of `0.4.1`.
- `PuPicker`, `PuCheckbox`, and `PuCheckboxGroup` where the current interaction
  model fits.
- `PuNumberInput` for `number | null` numeric app state, including min/max/step.
- `PuSelect` for dense web-native single selection.
- `PuChipInput` for editing one chip value.
- `PuChipsEditor` for plain editable string-array token input.

## Current App Usage Patterns

### Plain Field Controls

Common usage:

- text, URL, and image URL fields
- numeric fields such as participant counts, durations, offsets, prices, ratio
  basis points, sort order, quantities, and rule IDs
- `datetime-local`, `date`, and `time` fields
- multiline text such as notes, descriptions, JSON/rule text, message bodies,
  rejection reasons, and meeting point descriptions

Migration status:

- Text and textarea fields are straightforward with `PuFormItem`,
  `PuInput`, and `PuTextarea`.
- `datetime-local` is now viable with `PuInput native-type="datetime-local"`.
- Numeric fields are now viable with `PuNumberInput` when the app owns
  `number | null` state.

### Select And Datalist

Remaining native usage:

- enum selects: status, type, product type, pricing model, rule operator,
  frequency, mode, visibility, charge mode
- entity selects: POI, feedback questionnaire template/instance, offer/product
  references
- datalist-backed text fields: PR type, location, place mode location

Migration status:

- `PuSelect` now covers dense web-native one-of-many selection.
- `PuInput` now documents native `list` forwarding, so datalist-backed
  free-text fields can migrate without adopting a picker interaction.
- `PuPicker` remains appropriate only when the product wants a picker/drawer
  interaction rather than dense native selection.
- The first 0.4.3 app pass has migrated the bounded admin analytics, PR
  filter, Anchor Event status/template, and POI selector group.

### Submit Boundaries

Remaining native form usage:

- compact PR forms: `NLPRForm.vue`, `InlineNLPRForm.vue`
- external form integration: `UpdatePRStatusForm.vue` has `formId`
- larger editor forms: `PREditor.vue`
- admin entity forms: payment and ride-hailing pages
- application forms: route/location application pages

Migration status:

- `PuForm` can now be evaluated because it emits `submit`.
- 0.4.3 documents native form attribute fallthrough and external submit button
  support.
- Some app forms rely on native `id`/external submit behavior or page-level
  mutation ownership. Native `id`/external submit is no longer the blocker;
  mutation ownership and exposed parent contracts still require careful
  per-form migration.
- The first 0.4.3 app pass migrated `NLPRForm.vue` and
  `UpdatePRStatusForm.vue`, preserving parent-owned submit contracts.

### Boolean And Multi-Select

Remaining usage:

- weekday checkbox grids in POI availability rules
- opt-in/confirmation-like booleans in domain-specific controls
- admin rule editors with condition arrays

Migration status:

- `PuCheckbox` and `PuCheckboxGroup` exist, but dense admin checkbox-grid
  layouts may need better documented layout and option APIs before broad
  migration.

## Upstream Needs

### Resolved In 0.4.3: Numeric Field Model Support

Current issue:

- `PuInput native-type="number"` has `modelValue: string`.
- App state often uses `number | null`.
- Direct `v-model.number` fails type-checking against the package component
  because the component contract is string-only.

Resolved package capability:

- `PuNumberInput` supports numeric app state as `number | null`.
- Empty input emits `null`; valid numeric input emits `number`.
- Invalid intermediate text is held locally.

### Resolved In 0.4.3: Native Numeric Constraints

Current issue:

- App numeric controls often use native `min`, `max`, and sometimes `step`.
- `PuInput` public props do not document `min`, `max`, or `step`.

Resolved package capability:

- `PuNumberInput` documents `min`, `max`, and `step`.

### Resolved In 0.4.3: Select Field For Dense Admin UI

Current issue:

- Native `select` remains common in dense admin workflows.
- `PuPicker` is available but is a drawer-style picker interaction, which is
  not always the right admin-table/editor interaction.

Resolved package capability:

- `PuSelect` supports string/number/null values, options, placeholder,
  clearable state, native select attributes, and `PuFormItem` composition.

Remaining later needs:

- Multi-select, option groups, async loading, and custom option rendering are
  still deferred by the first API.

### Partially Resolved In 0.4.3: Autocomplete / Datalist Replacement

Current issue:

- Several fields are free-text but aided by datalist suggestions.
- `PuInput` does not document a `list` prop, and `PuPicker` changes the model
  from free text to explicit option picking.

Resolved package capability:

- `PuInput` documents native `list` forwarding for datalist-backed free-text
  suggestions.

Remaining later needs:

- A richer `PuCombobox` / `PuAutocomplete` could still be useful when option
  labels must differ from submitted values or when async/custom suggestions
  are needed.

### Resolved In 0.4.3: Form Submit Integration

Current issue:

- `PuForm` now emits `submit`, but the app still needs confidence around native
  form behaviors before broad migration.

Resolved package capability:

- `PuForm` documents native `id`, `name`, `autocomplete`, `novalidate`,
  `action`, and `method` fallthrough.
- It documents default prevention, native `SubmitEvent` emission, validation
  call expectations, and external submit button support.

### Mostly Resolved In 0.4.3: Textarea Sizing Controls

Current issue:

- App textareas use fixed minimum heights such as 80px, 96px, or 112px, plus
  native resize behavior.
- `PuTextarea` supports `autoHeight`, but public docs do not expose rows,
  minRows, maxRows, or resize policy.

Resolved package capability:

- `PuTextarea` documents native `rows` forwarding.
- `PuTextarea` documents `autoHeight` and default vertical resize behavior.

Remaining later needs:

- `minRows` / `maxRows` may still be useful if fixed `rows` is not enough.

### Resolved In 0.4.3: Change/Input Event Ergonomics

Current issue:

- Some current fields mark dirty on native `input` or `change`.
- `PuInput` emits `update:modelValue`, `focus`, `blur`, but not a documented
  raw `input` or `change` event.

Resolved package capability:

- `PuInput` and `PuTextarea` document `update:modelValue` as the live dirty
  hook and expose `change` for browser committed-value semantics.

### Corrected In 0.4.4: Editable Chip Inputs

Current app relevance:

- `PREditor.vue` preferences tags input has migrated to `PuChipsEditor`.
- `FormModePreferenceControl.vue` is more complex than a plain string-array
  editor because it owns curated options, descriptions, drawer state,
  category-specific selection, custom draft creation, and custom label
  editing.
- `FormModePreferenceControl.vue` custom preference values use individual
  `PuChipInput` instances, while curated options remain
  `PuChipGroup` + `PuChip`.

Remaining later needs:

- `PuChipsEditor` suggestions and custom option listbox behavior are deferred
  by the first API.

## App Migration Implications

Recommended package-side priority:

1. Numeric model and numeric constraint support.
2. Dense web select and autocomplete/combobox support.
3. `PuForm` native attribute and external-submit documentation.
4. Textarea sizing controls.
5. Dirty-state event guidance.

Until then, the frontend should:

- Continue migrating string-backed text and textarea fields directly.
- Prefer `PuNumberInput` for numeric app state.
- Prefer `PuSelect` for dense single selection and `PuInput list` for
  datalist-backed free-text suggestions.
- Adopt `PuForm` only per form boundary, even though native form attributes and
  external submit are now documented.
- Use `PuChipsEditor` for plain string-array token entry; discuss richer option
  selection surfaces before migrating them.
