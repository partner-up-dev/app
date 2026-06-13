`src/shared/ui` owns true cross-domain UI primitives only.

Use `shared/ui` when all of these are true:

- the component is reusable across multiple screens or domains
- the API is stable and intentionally narrow
- the component does not encode domain-specific copy or workflow rules
- the component can be documented as a primitive instead of a usage pattern

Do not move a component into `shared/ui` just because two pages happen to look similar once. Repetition alone is not enough if the semantics are domain-owned.

## Preferred Primitives

Actions:

- `actions/Button.vue`: shared button primitive. Prefer it over page-local button classes; use `appearance="pill"` for compact CTA clusters and `appearance="rect"` for dialogs or block actions. Keep `tone` choices narrow.
- `actions/ActionLink.vue`: shared action-looking link primitive for RouterLink and external anchor CTAs.
- `actions/FeedbackButton.vue`: shared transient feedback action button for short-lived pending/success/error feedback states.

Containers and layout:

- `PuCard` from `@partner-up-dev/design-web`: standard card shell for reusable grouped content, outline surfaces, and collapsible sections. Use `variant` for treatment and `keep-content-mounted` only when collapsed content owns local state that must survive collapse.
- `containers/ChoiceCard.vue`: selectable card primitive for button-like choices and RouterLink navigation choices.
- `PuPageScaffold` from `@partner-up-dev/design-web`: page scaffold for route pages, centered flows, full-screen flows, desktop aside pages, and reveal-footer layouts. Prefer direct package usage instead of recreating safe-area page chrome locally.
- `sections/PageFooter.vue`: product page footer chrome with `variant="minimal"` for compact support/navigation footers and `variant="brand"` for landing-style brand/legal footers. Prefer extending this variant API over creating another page footer component.

Forms and controls:

- `PuFormItem`, `PuInput`, `PuTextarea`, `PuToggleSwitch`, and `PuWheelPicker` from `@partner-up-dev/design-web`: default form-field, text-control, switch, and wheel-picker primitives. Use them directly at usage sites rather than adding local wrappers.
- `PuSegmented` and `PuSegmentedItem` from `@partner-up-dev/design-web`: default mutually exclusive mode selector. Keep domain labels, state, workflow transitions, and option-level scenario test IDs in the consuming surface.
- `forms/ProductLocalDateCalendarPicker.vue`: product-local date-key calendar grid for visible-window multi-select flows.

Display and feedback:

- `PuDescriptionList` and `PuDescriptionItem` from `@partner-up-dev/design-web`: default label-value metadata and read-only fact layout.
- `PuCell` from `@partner-up-dev/design-web`: default compact row for settings, list rows, and action rows.
- `PuChip`, `PuChipGroup`, and `PuTag` from `@partner-up-dev/design-web`: default token, chip group, and read-only label primitives.
- `PuInlineNotice`, `PuEmptyState`, and `PuLoadingState` from `@partner-up-dev/design-web`: default local notice, empty state, and loading state primitives.
- `PuImg` from `@partner-up-dev/design-web`: default image primitive, including avatar-style fallback when `name`, `fallbackInitial`, `shape`, and `bordered` are enough for the surface.

Overlay:

- `overlay/Modal.vue`: generic modal primitive. Add scroll locking with `useBodyScrollLock(computed(() => open.value))` in the parent when needed.
- `overlay/ConfirmDialog.vue`: standard confirm/cancel dialog built on `Modal` and `Button`.
- `overlay/BottomDrawer.vue`: bottom drawer overlay for secondary mobile-oriented workflows.

## Reuse Rules

- Prefer composing these primitives in pages and domain sections before creating new page-local shells.
- Keep action treatment styles inside the lowest action primitives (`Button` and `ActionLink`); higher-level shared components, domain components, and pages should compose primitives instead of re-declaring those styles.
- If a component needs backend-derived policy logic, workflow branching, or domain vocabulary, keep it in the owning domain and compose shared primitives inside it.
- If a primitive variant is needed in a third distinct place, extend the shared primitive API instead of cloning the component locally.
- When extending a primitive API, update this file in the same change so the new contract stays discoverable.
