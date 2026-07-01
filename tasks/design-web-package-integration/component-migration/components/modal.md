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
- To: direct `PuModal` imports at usage sites with required `open`, `maxWidth`,
  `title`, and close behavior.
- Compatibility strategy: do not keep a local wrapper. Remove parent
  `useBodyScrollLock` calls that only existed for the migrated modal, because
  package overlays own `lockScroll` by default.

## Risks

- Double scroll locking if old parent locks remain after package adoption.
- Workflows that intentionally cannot dismiss on overlay/Escape must set
  `closeOnOverlay=false` and `closeOnEscape=false` at the usage site.
- Focus and accessibility behavior may change.

## Verification

- Passed: frontend build, token lint, frontend unit tests, old overlay import
  scan, old scroll-lock scan, and `git diff --check`.
- WeChat OAuth non-dismissible behavior is represented directly with
  `closeOnOverlay=false` and `closeOnEscape=false`.
