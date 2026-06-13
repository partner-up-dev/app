# Modal Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/overlay/Modal.vue`.
- Package target: `PuModal`.
- Desired final state: package owns modal dialog shell, overlay, Escape/overlay
  close behavior, scroll lock, and accessibility context.

## Current Contract

- Props: `open`, `maxWidth`, `title`.
- Event: `close`.
- Slots: default, `header`.
- Current implementation Teleports to body and emits close on overlay or
  Escape.

## Migration Shape

- From: local Teleport dialog shell.
- To: `PuModal` with required `open`, `maxWidth`, `title`, and close behavior.
- Compatibility strategy: preserve `open` plus `close` contract; audit parent
  `useBodyScrollLock` usage before enabling package `lockScroll`.

## Risks

- Double scroll locking if both parent and package lock the body.
- Close-on-overlay and close-on-escape defaults must match existing workflows.
- Focus and accessibility behavior may change.

## Verification

- Build, token lint, frontend unit tests.
- Targeted PR/WeChat/support modal workflow tests or smoke.
- Browser smoke on mobile viewport.
