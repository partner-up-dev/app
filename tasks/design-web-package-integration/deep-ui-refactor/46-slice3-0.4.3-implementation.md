# Slice 3 Implementation After Design Web 0.4.3

## Objective & Hypothesis

Objective: use the 0.4.3 form-control APIs to complete a bounded Slice 3 pass
without doing a broad raw-control sweep.

Hypothesis: `PuSelect`, `PuNumberInput`, `PuForm`, `PuChipInput`,
`PuInput list`, and `PuTextarea rows` can remove several local form-control
implementations while preserving current domain state ownership and submit
side effects.

## Guardrails Touched

- Use package components directly at usage sites. Do not add local UI wrappers.
- Keep mutation, routing, validation, and dirty-state ownership in existing
  domain components/composables.
- Use computed adapters only for type narrowing between package value unions
  and narrower domain models.
- Do not migrate complex option/tag editors that need suggestions, drawers,
  curated descriptions, multi-select, or custom option rendering.

## Implemented Scope

Slice 3B select and datalist rebaseline:

- `AdminAnalyticsPage.vue`: rendered mode filter select -> `PuSelect`.
- `PRFilterRail.vue`: PR type/location datalist fields -> `PuInput list`;
  status select -> `PuSelect`.
- `AnchorEventDetailsEditor.vue`: status select -> `PuSelect`.
- `AnchorEventFeedbackQuestionnairePicker.vue`: template select ->
  `PuSelect` with nullable numeric model.
- `PoiSelectorRail.vue`: POI selector -> `PuSelect`; new POI name ->
  `PuInput`.

Slice 3C numeric cleanup:

- `AnchorEventCapacityDefaultsEditor.vue`: nullable partner counts ->
  `PuNumberInput`; removed local string adapters.
- `AnchorEventTimePoolStrategyEditor.vue`: duration and lead fields ->
  `PuNumberInput`.
- `AnchorEventLandingRolloutEditor.vue`: ratio and assignment revision fields
  -> `PuNumberInput`; local draft form now allows `number | null`.
- `AnchorEventOtherSection.vue`: participation frequency limit ->
  `PuNumberInput`; removed string adapter.

Slice 3D form and dynamic field boundaries:

- `NLPRForm.vue`: native form boundary -> `PuForm`; fixed stale
  `::maxlength` typo while preserving submit handler ownership.
- `UpdatePRStatusForm.vue`: native form boundary -> `PuForm`; preserved
  `formId`, exposed `submitForm()`, and parent-owned submit event.
- `PRJoinGateConfigEditor.vue`: dynamic key/version/title/body controls ->
  `PuFormItem`, `PuInput`, and `PuTextarea`; removed DOM event value reader.

Slice 3E editable token input:

- `PREditor.vue`: plain preferences tag input -> `PuChipInput`.
- `PRForm.scss`: removed local `tags-input`, `tag`, and `remove-tag` styling.

## Deferred

- `InlineNLPRForm.vue`: still has custom inline input, voice button, and send
  button composition. Replacing only the outer form would be a weak migration.
- Full `PREditor.vue` field migration: still a larger form restructuring task.
- `FormModePreferenceControl.vue`: not a plain chip input; it owns curated
  options, drawer descriptions, custom tag creation, and removal semantics.
- Admin commerce/payment/ride-hailing raw fields: still need their own page or
  domain-boundary slices.
- Multi-select, option groups, async/custom option rendering, checkbox grids,
  and DSL/rule editors.

## Verification

Final verification after this implementation pass:

- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `pnpm test:unit:frontend` passed.
- `git diff --check` passed.
- Targeted raw-control scan passed for the touched non-deferred files.
- `PREditor.vue` still has deferred raw fields and a native form boundary; the
  migrated preferences tag editor has no old `tags-input`, `tag`,
  `remove-tag`, `newPreference`, `addPreference`, or `removePreference`
  implementation residue. The remaining `removePreference` text is only the
  existing i18n key used as `PuChipInput` remove label.
