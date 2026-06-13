# ConfirmDialog Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/overlay/ConfirmDialog.vue`.
- Package target: `PuDialog`.
- Desired final state: package owns confirmation dialog shell and action button
  treatments.

## Current Contract

- Props: `open`, `title`, `message`, `description`, `confirmLabel`,
  `cancelLabel`, `confirmTone`, `loading`, `disabled`, `maxWidth`.
- Events: `close`, `confirm`.
- Slots: default content.

## Migration Shape

- From: local `Modal` plus local `Button`.
- To: direct `PuDialog` usage at confirmation sites.
- Compatibility strategy: map `message`/`description` to package description
  and content slots, `confirmLabel`/`cancelLabel` to package action text props,
  `loading` to `confirmLoading`, `disabled` to `confirmDisabled`, and
  destructive intent to package `tone="error"` because `PuDialog` uses status
  tones rather than control tones.

## Risks

- Destructive confirmation tone must stay clear.
- Mobile action stacking may shift.
- `PuDialog` close emits reasons; usage sites should close on all non-confirm
  close/cancel paths unless a mutation is pending.

## Verification

- Passed: frontend build, token lint, frontend unit tests, old overlay import
  scan, `PuDialog` old-prop vocabulary scan, and `git diff --check`.
