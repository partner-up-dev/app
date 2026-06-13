# Component Slice Index

Each component migration owns one file under `components/`. Files are working
plans, not permission to edit production code.

## Prerequisite

| File                          | Scope                                                          | Status |
| ----------------------------- | -------------------------------------------------------------- | ------ |
| `components/00-type-entry.md` | Remove the local package-root type shim and use package types. | Done   |

## Selected First Slice Candidate

This is the proposed first execution slice after the user explicitly starts
code changes.

| Order | File                              | Scope                                                                 | Status                                                |
| ----- | --------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------- |
| 1     | `components/00-type-entry.md`     | Real package declarations through `@partner-up-dev/design-web@0.4.0`. | Done                                                  |
| 2     | `components/inline-notice.md`     | Prove `PuInlineNotice` compatibility through the local facade.        | Done; direct usage-site cleanup moved to second slice |
| 3     | `components/empty-state.md`       | Replace local `PuCard` composition with `PuEmptyState`.               | Done; direct usage-site cleanup moved to second slice |
| 4     | `components/loading-indicator.md` | Replace local spinner with `PuLoadingState`.                          | Done; direct usage-site cleanup moved to second slice |
| 5     | `components/page-scaffold.md`     | Confirm `PuPageScaffold` wrappers through real package declarations.  | Done; direct usage-site cleanup moved to second slice |
| 6     | `components/page-footer.md`       | Fix footer padding as a bounded page chrome correction.               | Done                                                  |

## First Pass: Already Close To Package Ownership

| File                              | Local Component                           | Package Target                               | Status                                                   |
| --------------------------------- | ----------------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| `components/inline-notice.md`     | `shared/ui/feedback/InlineNotice.vue`     | `PuInlineNotice`                             | Done; usage sites migrated directly and wrapper deleted  |
| `components/page-scaffold.md`     | `shared/ui/layout/PageScaffold*.vue`      | `PuPageScaffold`                             | Done; usage sites migrated directly and wrappers deleted |
| `components/empty-state.md`       | `shared/ui/feedback/EmptyState.vue`       | `PuEmptyState`                               | Done; usage sites migrated directly and wrapper deleted  |
| `components/loading-indicator.md` | `shared/ui/feedback/LoadingIndicator.vue` | `PuLoadingState`                             | Done; usage sites migrated directly and wrapper deleted  |
| `components/page-footer.md`       | `shared/ui/sections/PageFooter.vue`       | App chrome over `PuPageScaffold` footer slot | Done                                                     |

## Second Pass: Low-State Display And Forms

| File                              | Local Component                                                   | Package Target                                        | Status                                                |
| --------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `components/chip.md`              | `shared/ui/display/Chip.vue` usage sites                          | `PuChip`                                              | Done; local chip deleted                              |
| `components/tag.md`               | Non-interactive status/category labels                            | `PuTag`                                               | Done; status labels migrated directly                 |
| `components/chip-group.md`        | `shared/ui/display/ChipGroup.vue`, `FitChipGroup.vue` usage sites | `PuChipGroup`                                         | Done; local group helpers deleted                     |
| `components/cell.md`              | `shared/ui/display/Cell.vue` usage sites                          | `PuCell`                                              | Done; local cell deleted                              |
| `components/info-row.md`          | `shared/ui/display/InfoRow*.vue` usage sites                      | `PuDescriptionList`, `PuDescriptionItem`, or `PuCell` | Done; local info-row primitives deleted               |
| `components/img.md`               | Domain/native image surfaces and app image primitives             | `PuImg`                                               | Done for selected surfaces; expanded scope applied    |
| `components/avatar.md`            | `shared/ui/identity/Avatar.vue`                                   | `PuImg`                                               | Done; direct usage-site migration and wrapper deleted |
| `components/form.md`              | Existing native form containers with validation semantics         | `PuForm`                                              | Gated                                                 |
| `components/form-field.md`        | `shared/ui/forms/FormField.vue` usage sites                       | `PuFormItem`                                          | Done; local field wrapper deleted                     |
| `components/text-input.md`        | `shared/ui/forms/TextInput.vue` usage sites                       | `PuInput`                                             | Done; local input wrapper deleted                     |
| `components/textarea-input.md`    | `shared/ui/forms/TextareaInput.vue` usage sites                   | `PuTextarea`                                          | Done; local textarea wrapper deleted                  |
| `components/toggle-switch.md`     | `shared/ui/forms/ToggleSwitch.vue` usage sites                    | `PuToggleSwitch`                                      | Done; local switch wrapper deleted                    |
| `components/segmented-control.md` | `shared/ui/controls/SegmentedControl.vue` usage sites             | `PuSegmented`, `PuSegmentedItem`                      | Done; local segmented control deleted                 |
| `components/wheel-picker.md`      | `shared/ui/forms/WheelPicker.vue` usage sites                     | `PuWheelPicker`                                       | Done; local wheel picker deleted                      |

## Selected Second Slice Candidate

Completed after explicit user start.

| Order | File                                                                                                                            | Scope                                                                                                                                                                                                              | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1     | `components/inline-notice.md` + `components/empty-state.md` + `components/loading-indicator.md` + `components/page-scaffold.md` | Clean first-slice local wrappers by migrating usage sites directly to package components and deleting local facades if call sites clear.                                                                           | Done   |
| 2     | `components/img.md` + `components/avatar.md`                                                                                    | Expand `PuImg` beyond avatar into Anchor Event card and PR preview card image surfaces; delete Avatar because package supports identity fallback props.                                                            | Done   |
| 3     | `components/chip.md` + `components/tag.md` + `components/chip-group.md`                                                         | Replace local chip/group call sites with `PuChip`, `PuTag`, and `PuChipGroup`; delete `Chip`, `ChipGroup`, and `FitChipGroup` if call sites clear.                                                                 | Done   |
| 4     | `components/cell.md`                                                                                                            | Replace local `Cell` call sites with `PuCell`; delete the local primitive if call sites clear.                                                                                                                     | Done   |
| 5     | `components/info-row.md`                                                                                                        | Replace `InfoRow` and `InfoRowAction` call sites with `PuDescriptionList`/`PuDescriptionItem` for read-only facts or `PuCell` for actions; delete local primitives if call sites clear.                            | Done   |
| 6     | `components/form-field.md` + `components/text-input.md` + `components/textarea-input.md`                                        | Replace field usage sites with `PuFormItem`, `PuInput`, and `PuTextarea`; keep product field meaning and accessible labeling, but accept package-native sizing, count, DOM, and interaction changes.               | Done   |
| 7     | `components/toggle-switch.md`                                                                                                   | Replace local switch usage sites with `PuToggleSwitch`; delete local primitive if call sites clear.                                                                                                                | Done   |
| 8     | `components/segmented-control.md`                                                                                               | Replace local segmented usage sites with `PuSegmented` + `PuSegmentedItem`; keep the mode-selection product intent, accept package-native keyboard/event behavior, and delete local primitive if call sites clear. | Done   |
| 9     | `components/wheel-picker.md`                                                                                                    | Replace the local wheel picker with `PuWheelPicker`; accept package-owned gesture, snapping, keyboard, and tone behavior; delete local primitive if call sites clear.                                              | Done   |
| 10    | `components/form.md`                                                                                                            | Only attach `PuForm` to specific form containers when it can directly own product-level submit/validation semantics without an adapter wrapper.                                                                    | Gated  |

## Third Pass: Overlay

| File                           | Local Component                       | Package Target | Status |
| ------------------------------ | ------------------------------------- | -------------- | ------ |
| `components/modal.md`          | `shared/ui/overlay/Modal.vue`         | `PuModal`      | Done   |
| `components/confirm-dialog.md` | `shared/ui/overlay/ConfirmDialog.vue` | `PuDialog`     | Done   |
| `components/bottom-drawer.md`  | `shared/ui/overlay/BottomDrawer.vue`  | `PuDrawer`     | Done   |

## Selected Third Slice Candidate

Started after explicit user approval.

| Order | File                           | Scope                                                                                                                                                                                                                               | Status |
| ----- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1     | `components/modal.md`          | Replace local `Modal` call sites with `PuModal`, remove parent scroll-lock duplication where package `lockScroll` owns it, and delete the local modal shell after call sites clear.                                                 | Done   |
| 2     | `components/confirm-dialog.md` | Replace local `ConfirmDialog` call sites directly with `PuDialog`; map labels, loading, disabled, and destructive tone through package props without creating a compatibility wrapper.                                              | Done   |
| 3     | `components/bottom-drawer.md`  | Replace local `BottomDrawer` call sites with `PuDrawer`; use `visible`/`update:visible`, map close payloads at usage sites when product semantics depend on close reason, and delete the local drawer shell after call sites clear. | Done   |

## Fourth Pass: Broad Action Surface

| File                            | Local Component                        | Package Target             | Status   |
| ------------------------------- | -------------------------------------- | -------------------------- | -------- |
| `components/button.md`          | `shared/ui/actions/Button.vue`         | `PuButton`                 | Done     |
| `components/action-link.md`     | `shared/ui/actions/ActionLink.vue`     | `PuButton` action prop     | Done     |
| `components/feedback-button.md` | `shared/ui/actions/FeedbackButton.vue` | `PuButton` feedback prop   | Done     |
| `components/choice-card.md`     | `shared/ui/containers/ChoiceCard.vue`  | `PuCard` action/selectable | Done     |

## Selected Fourth Slice Candidate

Started after explicit user direction to handle `ActionLink` and `ChoiceCard`.

| Order | File                        | Scope                                                                                                                                                                                                        | Status |
| ----- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1     | `components/action-link.md` | Replace local `ActionLink` call sites with `PuButton` plus structured `action`; map routes to `{ to }`, anchors to `{ href, external, target, rel }`, and delete the local primitive after call sites clear. | Done   |
| 2     | `components/choice-card.md` | Replace local `ChoiceCard` call sites with `PuCard`; use `selectable` for button-like choices, `action` for route cards, and delete the local primitive after call sites clear.                              | Done   |

## Selected Fifth Slice Candidate

Completed after explicit user start.

| Order | File                            | Scope                                                                                                                                                                                           | Status   |
| ----- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1     | `components/button.md`          | Replace local `Button` usage sites directly with `PuButton`, map old prop vocabulary at each usage site, clean CSS selectors that target local button internals, and delete the local primitive. | Done |
| 2     | `components/feedback-button.md` | Replace local `FeedbackButton` usage sites directly with `PuButton feedback`, keep product pending/success/error state intent at the usage site, and delete the local primitive.                | Done |

## Sixth Pass: Tabs

| File                      | Local Component                    | Package Target | Status   |
| ------------------------- | ---------------------------------- | -------------- | -------- |
| `components/tab-bar.md`   | `shared/ui/navigation/TabBar.vue`  | `PuTabs`       | Proposed |

## Deferred Domain Or Product Chrome

These should not be first-pass package migrations unless a component slice needs
them directly: `PageHeader`, `ProductLocalDateCalendarPicker`,
`TimelinePolicyPicker`, `MultiStopToggle`, and domain-owned
PR/Event/Route/Commerce UI.
