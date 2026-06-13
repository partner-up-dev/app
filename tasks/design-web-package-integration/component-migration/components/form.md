# Form Migration

## Target

- Local owner: no current shared `Form.vue` primitive; native `<form>` elements
  exist in page and domain workflow components.
- Package target: `PuForm`.
- Desired final state: validated form containers with package-supported
  schema/validate semantics use `PuForm`.

## Current Contract

- Existing forms rely on native `@submit.prevent` behavior in pages and domain
  components.
- Shared field structure currently comes from `FormField`, not a form container.
- Package `PuForm` public reference lists `schema`, `cellPadding`, default
  slot, and validation types.

## Migration Shape

- From: native `<form>` containers plus local field primitives.
- To: use `PuForm` only when its validation API is an actual semantic match.
- Migration rule: do not mechanically replace native forms in the second slice.
  This gate is about product-level submit/validation semantics, not old
  component behavior. First migrate `FormField`, `TextInput`, `TextareaInput`,
  and `ToggleSwitch`; then choose a small form surface for `PuForm` only if it
  can own the container directly.
- Parity rule: do not wrap `PuForm` to emulate native-form or old local-form
  behavior. If `PuForm` cannot directly own a form container's product
  semantics, leave that form native for now and record the blocker.

## Risks

- Package declarations expose `validate()` but do not document a `submit` emit.
- Native submit semantics may be product-owned. Do not replace them with a
  package form through an adapter layer.
- Schema ownership may cross domain validation boundaries.

## Verification

- Build, token lint, frontend unit tests.
- If any `PuForm` usage is introduced: targeted workflow smoke for the touched
  form's submit path and validation/error display.

## Slice Result

- No `PuForm` container was introduced in the second slice.
- Native `<form>` containers remain where they own submit behavior.
- `PuForm` stays gated for a future small, explicit validation-container
  migration.
