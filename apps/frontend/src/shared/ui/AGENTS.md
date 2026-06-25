`src/shared/ui` owns true cross-domain UI primitives only.

Use `shared/ui` when all of these are true:

- the component is reusable across multiple screens or domains
- the API is stable and intentionally narrow
- the component does not encode domain-specific copy or workflow rules
- the component can be documented as a primitive instead of a usage pattern

Do not move a component into `shared/ui` just because two pages happen to look similar once. Repetition alone is not enough if the semantics are domain-owned.

## Preferred Primitives

Actions:

- `PuButton` from `@partner-up-dev/design-web`: default package action primitive for command buttons, native form submit/reset actions, route CTAs, href CTAs, icon actions, action-looking links, and short-lived pending/success/error feedback states. Use `shape`, `tone`, `variant`, `action`, `feedback`, `loading`, and `block` directly at usage sites instead of adding local action wrappers.

Containers and layout:

- `PuCard` from `@partner-up-dev/design-web`: standard card shell for reusable grouped content, outline surfaces, and collapsible sections. Use `variant` for treatment and `keep-content-mounted` only when collapsed content owns local state that must survive collapse.
- `PuCard` from `@partner-up-dev/design-web`: use `selectable` for button-like choices and `action` for route or href card targets instead of adding a local choice-card wrapper.
- `PuPageScaffold` from `@partner-up-dev/design-web`: page scaffold for route pages, centered flows, full-screen flows, desktop aside pages, and reveal-footer layouts. Prefer direct package usage instead of recreating safe-area page chrome locally.
- `PuHeader` from `@partner-up-dev/design-web`: standard page, panel, and surface header. For route pages inside `PuPageScaffold`, use the scaffold `pageHeader` slot so the scaffold keeps owning standard inset and spacing; reserve raw `header` for custom header structures with consumer-owned spacing.
- `sections/PageFooter.vue`: product page footer chrome with `variant="minimal"` for compact support/navigation footers and `variant="brand"` for landing-style brand/legal footers. Prefer extending this variant API over creating another page footer component.

Forms and controls:

- `PuFormItem`, `PuInput`, `PuTextarea`, `PuToggleSwitch`, and `PuWheelPicker` from `@partner-up-dev/design-web`: default form-field, text-control, switch, and wheel-picker primitives. Use them directly at usage sites rather than adding local wrappers.
- `PuChipInput` and `PuChipsEditor` from `@partner-up-dev/design-web`: use `PuChipInput` for editing one chip value, and `PuChipsEditor` for string-array tag/chip collection editing. Keep domain suggestion, selection, and submission behavior in the consuming surface.
- `PuSegmented` and `PuSegmentedItem` from `@partner-up-dev/design-web`: default mutually exclusive mode selector. Keep domain labels, state, workflow transitions, and option-level scenario test IDs in the consuming surface.
- `forms/ProductLocalDateCalendarPicker.vue`: product-local date-key calendar grid for visible-window multi-select flows.

Display and feedback:

- `PuDescriptionList` and `PuDescriptionItem` from `@partner-up-dev/design-web`: default label-value metadata and read-only fact layout.
- `PuCell` from `@partner-up-dev/design-web`: default compact row for settings, list rows, and action rows.
- `PuChip`, `PuChipGroup`, and `PuTag` from `@partner-up-dev/design-web`: default token, chip group, and read-only label primitives.
- `PuInlineNotice`, `PuEmptyState`, and `PuLoadingState` from `@partner-up-dev/design-web`: default local notice, empty state, and loading state primitives.
- `PuImg` from `@partner-up-dev/design-web`: default image primitive, including avatar-style fallback when `name`, `fallbackInitial`, `shape`, and `bordered` are enough for the surface.

Navigation:

- `PuTabs` from `@partner-up-dev/design-web`: default value-based tab navigation primitive. Use `{ value, label, disabled?, showDot? }` tab items directly at usage sites instead of preserving local tab wrappers or per-tab style escape hatches.

Overlay:

- `PuModal` from `@partner-up-dev/design-web`: generic focused modal shell. Use direct package imports at usage sites; set `closeOnOverlay` or `closeOnEscape` only when the workflow needs custom dismissal rules.
- `PuDialog` from `@partner-up-dev/design-web`: structured confirmation and short focused workflow dialog. Use package action text, loading, disabled, tone, and slots directly instead of adding a local confirm wrapper.
- `PuDrawer` from `@partner-up-dev/design-web`: drawer shell for secondary workflows, filters, and details. Use `visible` / `update:visible` directly, and map close payloads at the usage site only when product semantics depend on close reason.

## Reuse Rules

- Prefer composing these primitives in pages and domain sections before creating new page-local shells.
- Compose package `PuButton` / `PuCard` directly instead of re-declaring reusable action recipes. Keep app-specific layout around action groups in the owning page or domain surface.
- If a component needs backend-derived policy logic, workflow branching, or domain vocabulary, keep it in the owning domain and compose shared primitives inside it.
- If a primitive variant is needed in a third distinct place, extend the shared primitive API instead of cloning the component locally.
- When extending a primitive API, update this file in the same change so the new contract stays discoverable.
