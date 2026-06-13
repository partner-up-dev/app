# WheelPicker Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/forms/WheelPicker.vue`.
- Package target: `PuWheelPicker`.
- Desired final state: package owns wheel-picker gesture, keyboard, snapping,
  tone, and variant behavior.

## Current Contract

- Props: `modelValue`, `options`, `variant`, `tone`, `itemHeight`,
  `visibleCount`, `disabled`, `ariaLabel`, `emptyLabel`.
- Slot: `option`.
- Events: `update:modelValue`, `change`.

## Migration Shape

- From: local wheel-picker implementation.
- To: `PuWheelPicker`; APIs are intentionally similar because this component
  was promoted to the package.
- Compatibility strategy: direct usage-site replacement. Do not keep a local
  wrapper for visual or gesture parity.

## Execution

- `FormModeTimeControl.vue` now imports `PuWheelPicker` directly from
  `@partner-up-dev/design-web`.
- `shared/ui/forms/WheelPicker.vue` was deleted after the single current call
  site was cleared.

## Risks

- Pointer capture, wheel snapping, and keyboard behavior are interaction risks.
- Package uses canonical `tone` plus `variant`; preserve typo compatibility only
  if current call sites still rely on it.

## Verification

- Build, token lint, frontend unit tests.
- Target wrapper import scan.
- Browser interaction smoke on the one current usage remains optional for the
  next manual UI pass because package and local APIs are equivalent and the
  package owns wheel gesture behavior now.
