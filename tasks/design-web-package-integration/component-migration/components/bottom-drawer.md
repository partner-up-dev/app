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
- Compatibility strategy: preserve the local `open` prop and translate close
  reasons if call sites depend on them.

## Risks

- Package uses `visible`, not `open`.
- Close reason vocabulary differs.
- Safe-area, max-height, and body scroll behavior are mobile-sensitive.

## Verification

- Build, token lint, targeted drawer workflow tests or smoke.
- Mobile browser smoke for PR share and commerce drawer flows.
