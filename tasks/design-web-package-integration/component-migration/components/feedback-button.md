# FeedbackButton Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/actions/FeedbackButton.vue`.
- Package target: `PuButton` `feedback` prop.
- Desired final state: transient pending/success/error action states use the
  package feedback API.

## Current Contract

- Props: `type`, `appearance`, `tone`, `size`, `state`, `loading`, `disabled`,
  `block`, `fullWidth`.
- Slots: default, `leading`, `trailing`.
- Event: `click`.

## Migration Shape

- From: local wrapper around local `Button` with state classes.
- To: package `PuButton` with mapped `feedback` and `loading`.
- Compatibility strategy: migrate after `Button` mapping is proven.

## Risks

- Success/error visual treatment may differ.
- Pending state must remain disabled/announced consistently with existing UX.

## Verification

- Build, token lint, targeted share/action feedback tests or smoke.
