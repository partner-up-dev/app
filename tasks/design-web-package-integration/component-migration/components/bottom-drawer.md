# BottomDrawer Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/overlay/BottomDrawer.vue`.
- Package target: `PuDrawer`.
- Desired final state: package owns drawer shell, overlay, Escape/overlay close,
  footer/header slots, and body scrolling.

## Current Contract

- Props: `open`, `title`, `ariaLabel`, `showClose`, `closeOnBackdrop`,
  `closeOnEscape`, `maxWidth`, `minHeight`, `zIndex`.
- Event: `close` with local reasons `backdrop`, `close-button`, `escape`.
- Slots: `header`, default body, `footer`.

## Migration Shape

- From: local bottom drawer overlay.
- To: `PuDrawer` using `visible` / `update:visible` and `close`.
- Compatibility strategy: do not keep a local wrapper. Use package
  `visible`/`update:visible` at call sites. Translate close payloads only inside
  the usage site when product semantics depend on reason. The current known
  semantic mapping is `PuDrawer` reason `overlay` equals the old `backdrop`
  reason in the form-mode preference drawer and should keep its auto-save
  behavior.

## Risks

- Package uses `visible`, not `open`.
- Close reason vocabulary differs: `overlay` / `escape` / `close-button`.
- Safe-area, max-height, and body scroll behavior are mobile-sensitive.

## Verification

- Passed: frontend build, token lint, frontend unit tests, old overlay import
  scan, old scroll-lock scan, `PuDrawer` old-prop vocabulary scan, and `git
diff --check`.
