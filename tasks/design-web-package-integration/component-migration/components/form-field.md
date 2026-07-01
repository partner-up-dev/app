# FormField Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/forms/FormField.vue` usage sites.
- Package target: `PuFormItem`.
- Desired final state: package owns labels, hints, error text, required marker,
  and form field wrapper directly at call sites.

## Current Contract

- Props: `as`, `label`, `forId`, `hint`, `error`, `required`.
- Slots: default control and `labelTrailing`.
- Related package components: `PuFormItem` owns field label/hint/error;
  `PuForm` owns schema-backed validation containers, not generic submit forms.

## Migration Shape

- From: local label/control/message wrapper.
- To: usage sites import `PuFormItem` and compose package controls inside it.
- Completion rule: no `<FormField>` usage and no local `FormField.vue` file
  remain unless a concrete package API blocker is recorded.
- Parity rule: do not wrap `PuFormItem` to recreate the old label stack,
  required marker, hint/error spacing, or `labelTrailing` compatibility. Use
  package-native field composition; pause only if a trailing-label affordance is
  product-owned and cannot be composed directly.

## Risks

- Slot structure and spacing may affect dense form layouts; package-native
  spacing is acceptable.
- Explicit error text must remain visible when it carries product validation
  meaning.
- If `PuFormItem` is used with package inputs, avoid double field shell spacing.
- `labelTrailing` has no documented direct slot in `PuFormItem`; usage sites
  with trailing label affordances may need small local composition around the
  package component.

## Verification

- Build, token lint, frontend unit tests.
- Form workflow smoke for PR create/edit and admin editors touched by the slice.

## Slice Result

- Local field wrappers were migrated directly to `PuFormItem`.
- `apps/frontend/src/shared/ui/forms/FormField.vue` was deleted.
