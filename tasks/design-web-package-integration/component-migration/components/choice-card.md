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
- Compatibility strategy: only use interactive card roots when the card content
  has no nested interactive controls.

## Risks

- Package caveat: interactive cards must not contain nested interactive
  controls.
- Route action disabled behavior must remain equivalent.

## Verification

- Build, token lint, frontend unit tests.
- Admin rail/product list navigation smoke where choice cards are used.
