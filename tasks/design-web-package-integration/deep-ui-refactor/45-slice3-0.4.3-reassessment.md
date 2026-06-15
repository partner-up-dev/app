# Slice 3 Reassessment After Design Web 0.4.3

## Objective & Hypothesis

Reassess Slice 3 after upgrading `@partner-up-dev/design-web` from `0.4.1`
to `0.4.3`. The hypothesis is that 0.4.3 resolves enough form-control gaps to
move Slice 3 beyond text/textarea cleanup into number, select, datalist,
submit-boundary, and tag-input cleanup.

## Upgrade Evidence

- `pnpm view @partner-up-dev/design-web version` reports `0.4.3`.
- `apps/frontend/package.json` now depends on
  `@partner-up-dev/design-web@0.4.3`.
- `pnpm-lock.yaml` resolves the GitHub Packages tarball for `0.4.3`.
- `apps/frontend/node_modules/@partner-up-dev/design-web/package.json`
  reports `version: 0.4.3`.
- `dist/version.d.ts` declares `version = "0.4.3"`.
- TanStack Intent checks passed:
  - `pnpm dlx @tanstack/intent@latest list --json`
  - `pnpm dlx @tanstack/intent@latest load @partner-up-dev/design-web#design-web`
  - `pnpm dlx @tanstack/intent@latest validate apps/frontend/node_modules/@partner-up-dev/design-web/skills/design-web`

## 0.4.3 Capability Delta

Resolved or newly viable:

- `PuNumberInput`
  - Binds numeric app state as `number | null`.
  - Supports `min`, `max`, and `step`.
  - Holds invalid intermediate text locally instead of emitting misleading
    numeric values.
- `PuSelect`
  - Covers web-native one-of-many selection.
  - Supports `string | number | null` values, placeholder, clearable state,
    and native `id` / `name` / `form` / `aria-*` forwarding.
- `PuInput`
  - Explicitly documents `list` forwarding for native datalist-backed
    free-text suggestions.
  - Emits `change` and documents `update:modelValue` as the live dirty hook.
- `PuTextarea`
  - Explicitly documents `rows`, `form`, `change`, and default vertical
    resize behavior.
- `PuForm`
  - Explicitly documents native form attributes, submit event semantics, and
    external submit buttons through native `form` attributes.
- `PuChipInput`
  - Covers editable string-array token input with removable chips and draft
    entry.

Still bounded:

- `PuSelect` does not cover multi-select, option groups, async loading, or
  custom option rendering.
- `PuChipInput` does not cover suggestions or custom option listbox behavior.
- `PuTextarea` does not expose minRows/maxRows; use `rows` or `autoHeight`
  first.
- `PuPicker` still changes the interaction model; use `PuSelect` for dense
  web/admin selects unless a picker interaction is desired.

## Slice 3 Impact

The old Slice 3 split is now too conservative. Native `select`,
datalist-backed input, and nullable numeric fields should no longer be
globally deferred. They should move into named sub-slices with verification
per form boundary or page cluster.

Do not do one broad form sweep. The remaining raw fields are concentrated in
large admin commerce, admin PR/POI, PR editor, event editor, and application
flows. Many combine state normalization, dirty tracking, dynamic arrays, or
submit lifecycle.

## Recommended Next Sub-Slices

### Slice 3B: Select And Datalist Rebaseline

Scope:

- Replace simple native enum/entity selects with `PuSelect`.
- Replace datalist-backed free-text inputs with `PuInput` plus native
  `list` forwarding.

Good candidates:

- `AdminAnalyticsPage.vue` mode filter select.
- `PRFilterRail.vue` type/location datalist fields and status select.
- `AnchorEventDetailsEditor.vue` status select.
- `AnchorEventFeedbackQuestionnairePicker.vue`.
- `PoiSelectorRail.vue` simple selector/search controls.

Guardrails:

- Use `PuSelect` only where option values are simple `string | number | null`.
- Keep custom option rendering, grouped options, async option loading, and
  multi-select out of this sub-slice.

### Slice 3C: Numeric Field Cleanup

Scope:

- Replace nullable or constrained numeric fields with `PuNumberInput`.
- Remove local string adapters introduced only because `PuInput` was
  string-backed for numeric state.

Good candidates:

- `AnchorEventCapacityDefaultsEditor.vue` can be revisited to remove local
  string adapters.
- `AnchorEventLandingRolloutEditor.vue`.
- `AnchorEventTimePoolStrategyEditor.vue`.
- Admin commerce pricing/product/SKU/cancellation numeric fields.
- Admin payment and ride-hailing numeric config fields.

Guardrails:

- Use `PuInput` only when the number is intentionally string-backed or must
  preserve formatting exactly.
- Keep dynamic JSON/rule editors batched separately if the field is part of a
  DSL editor.

### Slice 3D: PuForm Boundary Cleanup

Scope:

- Adopt `PuForm` where the component owns the real submit boundary.
- Preserve parent-owned mutation/cache/routing side effects.

Good candidates:

- `UpdatePRStatusForm.vue`, because 0.4.3 explicitly supports native `id` and
  external submit button integration.
- `NLPRForm.vue` and `InlineNLPRForm.vue`, after checking current compact
  submit semantics.
- Route/location application forms, if the page-local native form can become a
  direct package form without changing scenario-test nodes.

Guardrails:

- Do not wrap legacy form markup just to count migration.
- Preserve `data-testid` on real interactive elements.
- Pause before changing exposed `submitForm()` contracts used by parent pages.

### Slice 3E: Editable Token Inputs

Scope:

- Use `PuChipInput` for plain string-array token entry.

Good candidates:

- `PREditor.vue` preferences `tags-input` is now a likely direct candidate.

Needs discussion before implementation:

- `FormModePreferenceControl.vue` is not a plain tag input. It owns option
  descriptions, drawer state, selection affordances, custom draft creation,
  and removal. `PuChipInput` may cover part of the behavior, but not the whole
  interaction contract.

## Updated Upstream Need State

Resolved by 0.4.3:

- Numeric model support.
- Native numeric constraints.
- Dense single select.
- Native datalist forwarding.
- Form native attributes and external submit documentation.
- Textarea `rows` / native attribute forwarding.
- Dirty-state event guidance for input/textarea.

Still useful upstream later:

- Select option groups, multi-select, async options, and custom option
  rendering.
- Chip input suggestions and custom option listbox behavior.
- Textarea minRows/maxRows if fixed row count is not sufficient.

## Verification For The Upgrade/Reassessment

- Passed `pnpm --filter @partner-up-dev/frontend build`.
- Passed `pnpm --filter @partner-up-dev/frontend lint:tokens`.
- Passed `pnpm test:unit:frontend`.
- Passed `git diff --check`.
