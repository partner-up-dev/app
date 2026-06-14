# Form Capability Needs For Design Web

## Context

This note captures frontend form usage found during Slice 3A of the
`@partner-up-dev/design-web` migration. It is intended as upstream input for
future web design package work, not as an app-side API contract.

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
- Numeric fields work visually with `native-type="number"`, but model typing
  is not ergonomic when the app owns `number | null` state.

### Select And Datalist

Remaining native usage:

- enum selects: status, type, product type, pricing model, rule operator,
  frequency, mode, visibility, charge mode
- entity selects: POI, feedback questionnaire template/instance, offer/product
  references
- datalist-backed text fields: PR type, location, place mode location

Migration status:

- `PuPicker` exists, but it changes the interaction to a drawer/picker flow.
  That can be right for mobile or constrained flows, but is not always a
  direct replacement for dense admin selects.
- `PuInput` does not expose a documented `list` prop, so datalist-backed fields
  stay native unless the app accepts a different autocomplete/combobox pattern.

### Submit Boundaries

Remaining native form usage:

- compact PR forms: `NLPRForm.vue`, `InlineNLPRForm.vue`
- external form integration: `UpdatePRStatusForm.vue` has `formId`
- larger editor forms: `PREditor.vue`
- admin entity forms: payment and ride-hailing pages
- application forms: route/location application pages

Migration status:

- `PuForm` can now be evaluated because it emits `submit`.
- Some app forms rely on native `id`/external submit behavior or page-level
  mutation ownership. Those need explicit package support or careful app-side
  mapping before migration.

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

### P0: Numeric Field Model Support

Current issue:

- `PuInput native-type="number"` has `modelValue: string`.
- App state often uses `number | null`.
- Direct `v-model.number` fails type-checking against the package component
  because the component contract is string-only.

Needed package capability:

- Either support `modelValue: string | number | null` for numeric native type,
  or provide a dedicated numeric component/helper such as `PuNumberInput`.
- Emit a stable numeric value mode, preferably with explicit empty handling:
  empty -> `null`, valid number -> `number`, invalid intermediate text handled
  deliberately.
- Publish types for this behavior so app code does not need local computed
  string adapters for every numeric field.

### P0: Native Numeric Constraints

Current issue:

- App numeric controls often use native `min`, `max`, and sometimes `step`.
- `PuInput` public props do not document `min`, `max`, or `step`.

Needed package capability:

- Public props for `min`, `max`, and `step` when `nativeType` is numeric/date
  compatible.
- Pass-through typing and runtime forwarding to the internal native input.
- Optional invalid-state integration with `PuFormItem` / `PuForm`.

### P1: Select Field For Dense Admin UI

Current issue:

- Native `select` remains common in dense admin workflows.
- `PuPicker` is available but is a drawer-style picker interaction, which is
  not always the right admin-table/editor interaction.

Needed package capability:

- A web-native select-like component, for example `PuSelect`, supporting:
  options, labels, disabled options, placeholder, clearable state, and
  `PuFormItem` integration.
- Keyboard and screen-reader behavior comparable to native select or a robust
  combobox.
- Compact density suitable for admin panels.

### P1: Autocomplete / Datalist Replacement

Current issue:

- Several fields are free-text but aided by datalist suggestions.
- `PuInput` does not document a `list` prop, and `PuPicker` changes the model
  from free text to explicit option picking.

Needed package capability:

- Either document and type native `list` forwarding on `PuInput`, or provide a
  `PuCombobox` / `PuAutocomplete` component.
- Must support free text plus suggestions, not only fixed option selection.
- Should support option labels distinct from submitted values.

### P1: Form Submit Integration

Current issue:

- `PuForm` now emits `submit`, but the app still needs confidence around native
  form behaviors before broad migration.

Needed package capability:

- Document whether `PuForm` forwards `id`, `name`, `autocomplete`, `novalidate`,
  `method`, and `action`.
- Document external submit button support through native `form` attributes.
- Provide typed submit event examples with `preventDefault` semantics clearly
  stated.
- Consider helper props for pending/disabled submit state only if that does not
  blur mutation ownership.

### P2: Textarea Sizing Controls

Current issue:

- App textareas use fixed minimum heights such as 80px, 96px, or 112px, plus
  native resize behavior.
- `PuTextarea` supports `autoHeight`, but public docs do not expose rows,
  minRows, maxRows, or resize policy.

Needed package capability:

- Public `rows`, `minRows`, `maxRows`, or `minHeight` strategy.
- Clear interaction between `autoHeight` and manual resize.
- This would reduce app-side class styling for multiline editors.

### P2: Change/Input Event Ergonomics

Current issue:

- Some current fields mark dirty on native `input` or `change`.
- `PuInput` emits `update:modelValue`, `focus`, `blur`, but not a documented
  raw `input` or `change` event.

Needed package capability:

- Document the intended dirty-state hook.
- If package components should replace native controls in dirty-tracked admin
  editors, expose typed `input`/`change` events or recommend
  `update:modelValue`.

## App Migration Implications

Recommended package-side priority:

1. Numeric model and numeric constraint support.
2. Dense web select and autocomplete/combobox support.
3. `PuForm` native attribute and external-submit documentation.
4. Textarea sizing controls.
5. Dirty-state event guidance.

Until then, the frontend should:

- Continue migrating string-backed text and textarea fields directly.
- Use local computed adapters for small numbers only when the replacement is
  otherwise worth it.
- Keep native select and datalist controls out of direct migration slices.
- Adopt `PuForm` only per form boundary after submit semantics are checked.
