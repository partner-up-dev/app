# TextareaInput Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/forms/TextareaInput.vue` usage
  sites.
- Package target: `PuTextarea`.
- Desired final state: package owns textarea shell, count, invalid/disabled
  states, and variants directly at call sites.

## Current Contract

- Props: `inputId`, `modelValue`, `disabled`, `placeholder`, `rows`,
  `maxLength`, `showCount`, `minHeight`.
- Event: `update:modelValue`.
- Package `PuTextarea` supports `autoHeight`, `maxlength`, and `showCount`, but
  does not expose `rows` or `minHeight` in the generated declarations.

## Migration Shape

- From: native textarea with local count rendering.
- To: `PuTextarea` with `id`, `modelValue`, `maxlength`, `showCount`,
  `disabled`, and field `variant`.
- Completion rule: no `<TextareaInput>` usage and no local `TextareaInput.vue`
  file remain unless a concrete package API blocker is recorded. Handle
  `rows` / `minHeight` at usage sites with supported package props and local
  composition CSS where needed.
- Parity rule: do not wrap `PuTextarea` to recreate old `rows`, `minHeight`,
  resize, count, or native textarea DOM behavior. Use package-native textarea
  behavior unless the difference breaks product input semantics.

## Risks

- Min-height, resize behavior, and character count layout may change.

## Verification

- Build, token lint, frontend unit tests.
- PR message / natural language PR create smoke where textarea inputs are used.

## Slice Result

- Local textarea inputs were migrated directly to `PuTextarea`.
- `apps/frontend/src/shared/ui/forms/TextareaInput.vue` was deleted.
