# ChoiceCard Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/containers/ChoiceCard.vue`.
- Package target: `PuCard` with `action`, `selectable`, and `active`.
- Desired final state: selectable/navigation card shells use package card
  action semantics where safe.

## Current Contract

- Props: `to`, `type`, `tone`, `active`, `disabled`.
- Event: `click`.
- Slot: default content.

## Migration Shape

- From: local `button` or `RouterLink` root with active/disabled treatment.
- To: `PuCard` action/selectable behavior.
- Compatibility strategy: no local wrapper. Replace usage sites directly with
  `PuCard` and delete `ChoiceCard.vue` after call sites clear. Only use
  interactive card roots when the card content has no nested interactive
  controls.

## Selected Mapping

- Button-like choice: `<PuCard selectable :active="..." :disabled="..." @click="...">`.
- Route card: `<PuCard :action="{ to: routeTarget }" :active="..." ...>`.
- Local `tone="low"` maps to `variant="soft"`; default maps to
  `variant="outline"`.
- Preserve page/domain classes and `data-testid` at usage sites.

## Risks

- Package caveat: interactive cards must not contain nested interactive
  controls.
- Route action disabled behavior must remain equivalent.
- Some usage sites may be static previews rather than choices. Those should use
  non-interactive `PuCard` instead of `selectable`.

## Verification

- Passed: frontend build, token lint, frontend unit tests, source reference
  scan, old-prop vocabulary scan, and `git diff --check`.
