# TextInput Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/forms/TextInput.vue` usage sites.
- Package target: `PuInput`.
- Desired final state: package owns single-line input shell and states directly
  at call sites.

## Current Contract

- Props: `inputId`, `modelValue`, `type`, `disabled`, `placeholder`,
  `inputmode`, `autocomplete`, `maxLength`.
- Events: currently only `update:modelValue` is exposed by the local wrapper;
  `PuInput` also emits focus, blur, clear, icon click, and click.

## Migration Shape

- From: native input with local styling.
- To: `PuInput` with `id`, `modelValue`, `type`, `inputmode`,
  `autocomplete`, `maxlength`, and state props.
- Completion rule: no `<TextInput>` usage and no local `TextInput.vue` file
  remain unless a concrete package API blocker is recorded. Convert `inputId`
  to package `id` at usage sites.
- Parity rule: do not wrap `PuInput` to keep old native-input DOM, attr
  forwarding behavior, height, border, or event surface.

## Risks

- `maxlength` prop casing differs.
- Product-critical test selectors may move to package-native semantic nodes;
  update tests intentionally instead of preserving old DOM through a wrapper.

## Verification

- Build, token lint, frontend unit tests.
- Form workflow smoke for surfaces touched by changed call sites.

## Slice Result

- Local text inputs were migrated directly to `PuInput`.
- `apps/frontend/src/shared/ui/forms/TextInput.vue` was deleted.
