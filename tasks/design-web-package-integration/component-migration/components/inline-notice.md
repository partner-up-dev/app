# InlineNotice Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/feedback/InlineNotice.vue` usage
  sites.
- Package target: `PuInlineNotice`.
- Desired final state: usage sites import `PuInlineNotice` directly and the
  local `InlineNotice.vue` facade is deleted after call sites clear.

## Current Contract

- Props: `tone`, `title`, `message`, `dismissible`, `closeLabel`.
- Event: `close`.
- Slot: default body content.
- Current implementation already wraps `PuInlineNotice`.

## Migration Shape

- From: local wrapper maps directly to package component and supplies
  `common.close` as default close label.
- To: update call sites to use `PuInlineNotice` and pass `close-label` where
  dismissible notices need the app-local translated label.
- Completion rule: no `<InlineNotice>` usage and no local `InlineNotice.vue`
  file remain unless a concrete package API blocker is recorded.
- Parity rule: do not recreate the old notice wrapper for spacing, close
  behavior, DOM shape, or default prop compatibility. Use package-native notice
  behavior unless an app semantic exception is discussed first.
- First-slice result: package compatibility was proven through the facade; the
  second slice now owns direct usage-site cleanup.

## Risks

- Dismissible usage sites may need an explicit translated close label if the
  package default is not product-appropriate.
- Moving `data-testid` or attrs away from the rendered package root if call
  sites rely on them.

## Verification

- `pnpm --filter @partner-up-dev/frontend build` - passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` - passed.
- `pnpm test:unit:frontend` - passed.
- Second-slice verification should include build, token lint, frontend unit
  tests, and smoke on pages with dismissible/local notices.

## Slice Result

- Usage sites now import `PuInlineNotice` directly.
- `apps/frontend/src/shared/ui/feedback/InlineNotice.vue` was deleted.
