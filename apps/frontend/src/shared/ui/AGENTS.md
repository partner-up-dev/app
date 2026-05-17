`src/shared/ui` owns true cross-domain UI primitives only.

Use `shared/ui` when all of these are true:

- the component is reusable across multiple screens or domains
- the API is stable and intentionally narrow
- the component does not encode domain-specific copy or workflow rules
- the component can be documented as a primitive instead of a usage pattern

Do not move a component into `shared/ui` just because two pages happen to look similar once. Repetition alone is not enough if the semantics are domain-owned.

## Preferred Primitives

- `actions/Button.vue`: shared button primitive for pill and rect actions; prefer it over page-local button classes.
- `actions/ActionLink.vue`: shared action-looking link primitive for RouterLink and external anchor CTAs.
- `actions/FeedbackButton.vue`: shared action button wrapper for short-lived pending/success/error feedback states.
- `containers/SurfaceCard.vue`: shared card shell for section, outline, and inset treatments.
- `containers/ChoiceCard.vue`: shared selectable card shell for button and RouterLink choices.
- `layout/FullScreenPageScaffold.vue`: viewport-height page shell with dedicated header/content/footer slots for pages whose middle region should flex and own scrolling.
- `layout/FooterRevealPageScaffold.vue`: viewport-first page shell with dedicated header/content/footer slots for pages that should keep `header + content` in the first screen and reveal the footer through normal page scrolling.
- `forms/FormField.vue`: label + control + hint/error wrapper for plain field rows.
- `forms/TextareaInput.vue`: shared textarea primitive with the governed shell used by cross-domain text-entry surfaces.
- `forms/ToggleSwitch.vue`: labeled boolean switch primitive with `v-model`; consuming components own copy, workflow meaning, and side effects.
- `forms/WheelPicker.vue`: finite vertical option picker with centered snap selection for generic single-value choices.
- `forms/ProductLocalDateCalendarPicker.vue`: product-local date-key calendar grid for fixed-window multi-select flows; keep date-window policy in the owning page or domain.
- `controls/SegmentedControl.vue`: generic mutually exclusive mode selector; keep domain labels, state, workflow transitions, and option-level scenario test IDs in the consuming surface.
- `display/InfoRow.vue`: neutral label/value layout for metadata.
- `display/InfoRowAction.vue`: label row with a right-side inline action button for metadata rows whose action target is only the trailing affordance.
- `display/Cell.vue`: compact title/value row with optional suffix icon or suffix slot for generic list and settings surfaces; pass `border` to show the bottom divider.
- `display/Chip.vue` and `display/ChipGroup.vue`: lightweight shared tag/group primitives.
- `feedback/InlineNotice.vue`: inline notice banner for page-level or section-level feedback.
- `feedback/EmptyState.vue`: empty/not-found shell with optional icon and actions.
- `overlay/ConfirmDialog.vue`: standard confirm/cancel dialog for simple destructive or blocking confirmations.
- `identity/Avatar.vue`: generic avatar with image/fallback behavior.

## Reuse Rules

- Prefer composing these primitives in pages and domain sections before creating new page-local shells.
- Keep action treatment styles inside the lowest action primitives (`Button` and `ActionLink`); higher-level shared components, domain components, and pages should compose primitives instead of re-declaring those styles.
- If a component needs backend-derived policy logic, workflow branching, or domain vocabulary, keep it in the owning domain and compose shared primitives inside it.
- If a primitive variant is needed in a third distinct place, extend the shared primitive API instead of cloning the component locally.
- When extending a primitive API, update `src/AGENTS.components.md` in the same change so the new contract stays discoverable.
