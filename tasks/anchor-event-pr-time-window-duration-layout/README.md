# PR Time Window Duration Layout

## Objective & Hypothesis

- Intent class: Reality.
- Symptom: On `/e/4?mode=form`, the advanced-mode duration editor should be one row with label on the left and numeric input on the right.
- Initial hypothesis: `FormModeTimeControl.vue` hides `.pr-time-window-editor__field-label` for wheel-picker labels, and `PRTimeWindowEditor.vue` reuses that same label class plus the full-width select control style for the duration input.

## Guardrails Touched

- Owner: `apps/frontend/src/domains/event/ui/controls/PRTimeWindowEditor.vue`.
- Caller surface: Form Mode time control under Anchor Event route.
- Protected invariants: date/time picker slot behavior, mode switching, model emission, existing test IDs, and fixed-duration hint behavior.

## Verification

- Capture direct browser evidence on `https://partner-up.localhost/e/4?mode=form`.
- Run the focused frontend unit test for `PRTimeWindowEditor` if implementation proceeds.
- Run frontend token lint if styles change.

## Current Understanding

- `PRTimeWindowEditor.vue` defines `pr-time-window-editor__duration-field` as a vertical flex field and the number input reuses `pr-time-window-editor__select` with `width: 100%`.
- `FormModeTimeControl.vue` applies `:deep(.pr-time-window-editor__field-label) { display: none; }`, which hides the duration label too because duration uses the same label class.
- Browser evidence at `390x844` on `https://partner-up.localhost/e/4?mode=form`: `.pr-time-window-editor__duration-field` is `354px` wide, `.pr-time-window-editor__duration-field .pr-time-window-editor__field-label` has `display: none`, and its `input` is `354px` wide.
- Direct callers found: `FormModeTimeControl.vue` uses date/time slots and hides generic field labels; `AnchorEventAssistedPRTimeWindowInlineEditor.vue` uses default selects. There is no duration slot, so duration layout belongs inside `PRTimeWindowEditor.vue`.
- Existing `PRTimeWindowEditor.test.ts` covers default-mode selection behavior but not `ADVANCED` duration layout.
- Implemented fix: duration now uses `pr-time-window-editor__duration-label` and `pr-time-window-editor__duration-input`; the duration field is a row with left label and right constrained input.
- Added recurrence guard in `PRTimeWindowEditor.test.ts` for advanced custom duration markup.
- Post-fix browser evidence at `390x844`: duration field is row flex, label is visible at `48px`, and input is `128px` wide instead of full `354px`.

## Next Step

- Complete.
