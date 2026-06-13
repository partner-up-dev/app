# ToggleSwitch Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/forms/ToggleSwitch.vue` usage
  sites.
- Package target: `PuToggleSwitch`.
- Desired final state: package owns switch rendering and semantics directly at
  call sites.

## Current Contract

- Props: `modelValue`, `label`, `disabled`.
- Events: `update:modelValue`, `change`.

## Migration Shape

- From: local switch button.
- To: `PuToggleSwitch` with the same core props and events.
- Completion rule: no `<ToggleSwitch>` usage and no local `ToggleSwitch.vue`
  file remain unless a concrete package API blocker is recorded.
- Parity rule: do not wrap `PuToggleSwitch` to keep old switch DOM, size,
  label placement, or emitted event compatibility.

## Risks

- Size defaults and spacing may shift admin/editor layout.
- Ensure label remains visible and accessible.

## Verification

- Build, token lint, frontend unit tests.
- Admin editor smoke where toggles are used.

## Slice Result

- Local switches were migrated directly to `PuToggleSwitch`.
- `apps/frontend/src/shared/ui/forms/ToggleSwitch.vue` was deleted.
