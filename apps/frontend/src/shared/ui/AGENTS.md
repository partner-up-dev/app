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

- `containers/SurfaceCard.vue`: standard card shell for reusable section, inset, and outline surfaces.
- `containers/ExpandableCard.vue`: collapsible card shell. Use `keep-content-mounted` only when collapsed content owns expensive local state or setup work.
- `containers/ChoiceCard.vue`: selectable card primitive for button-like choices and RouterLink navigation choices.
- `layout/PageScaffold.vue`, `PageScaffoldFlow.vue`, `PageScaffoldCentered.vue`, and `DesktopPageScaffold.vue`: shared page scaffolds. Prefer these for route pages instead of duplicating root safe-area layout.
- `layout/FullScreenPageScaffold.vue`: viewport-height page scaffold with header/content/footer regions where the middle region should flex and own scrolling.
- `layout/FooterRevealPageScaffold.vue`: viewport-first page scaffold where header + content fill the first screen and footer appears through normal page scroll.

Forms and controls:

- `forms/FormField.vue`: label + control + hint/error wrapper for plain form rows. It does not own the input shell.
- `forms/TextareaInput.vue`: shared textarea primitive with stable shell, optional char count, and configurable rows/max length.
- `forms/ToggleSwitch.vue`: labeled boolean switch primitive with `v-model`; consuming components own copy, workflow meaning, and side effects.
- `forms/WheelPicker.vue`: finite vertical option picker with centered snap selection for generic single-value choices.
- `forms/ProductLocalDateCalendarPicker.vue`: product-local date-key calendar grid for visible-window multi-select flows.
- `controls/SegmentedControl.vue`: generic mutually exclusive mode selector; keep domain labels, state, workflow transitions, and option-level scenario test IDs in the consuming surface.

Display and feedback:

- `display/InfoRow.vue`: neutral label/value layout for metadata.
- `display/InfoRowAction.vue`: label row with a trailing inline button for metadata rows whose action target is only the trailing affordance.
- `display/Cell.vue`: compact title/value row with optional suffix icon or suffix slot for generic list and settings surfaces.
- `display/Chip.vue` and `display/ChipGroup.vue`: neutral tokenized chips for tags, lightweight roster labels, and compact metadata groups.
- `display/FitChipGroup.vue`: single-line chip row that measures available width and only shows whole chips that fully fit.
- `feedback/InlineNotice.vue`: inline success/info/warning/error banner.
- `feedback/EmptyState.vue`: empty or not-found shell with title, description, icon, and optional actions slot.
- `identity/Avatar.vue`: generic avatar with image/fallback behavior.

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
