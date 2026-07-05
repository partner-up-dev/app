# Shared UI Local Rules

`src/shared/ui` owns true cross-domain UI primitives only.

Durable app-local primitive ownership lives in `docs/30-unit-tdd/frontend-shared-ui-primitives.md`.
Package component selection, props, slots, events, imports, and caveats belong to the `@partner-up-dev/design-web#design-web` Intent skill.

## Local Hazards

- Use `shared/ui` only when the component is reusable across multiple screens or domains, has a stable narrow API, carries no domain-specific copy or workflow rules, and can be documented as a primitive rather than a usage pattern.
- Prefer matching `@partner-up-dev/design-web` components before creating local primitives or wrappers.
- Keep domain vocabulary, backend-derived policy logic, workflow branching, and submission behavior in the owning domain or process layer.
- Repetition alone is not a promotion reason when the semantics are domain-owned.
- When extending a shared primitive API, update this file and the relevant Unit TDD owner in the same change.

## App-Owned Primitive Pointers

- `sections/PageFooter.vue`: product page footer chrome. Extend its variant API only when the footer treatment is stable across consumers.
- `forms/ProductLocalDateCalendarPicker.vue`: product-local date-key calendar grid for visible-window multi-select flows.
