# ConfirmDialog Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/overlay/ConfirmDialog.vue`.
- Package target: likely `PuDialog`, or `PuModal` plus `PuButton` if `PuDialog`
  does not cover the exact contract.
- Desired final state: package owns confirmation dialog shell and action button
  treatments.

## Current Contract

- Props: `open`, `title`, `message`, `description`, `confirmLabel`,
  `cancelLabel`, `confirmTone`, `loading`, `disabled`, `maxWidth`.
- Events: `close`, `confirm`.
- Slots: default content.

## Migration Shape

- From: local `Modal` plus local `Button`.
- To: inspect `PuDialog` API before choosing direct package dialog or composed
  package modal/buttons.
- Compatibility strategy: migrate after `Button` and `Modal` slices are stable.

## Risks

- Destructive confirmation tone must stay clear.
- Mobile action stacking may shift.

## Verification

- Build, token lint, targeted confirmation workflow tests.
