# Avatar Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/identity/Avatar.vue`.
- Package target: `PuImg`.
- Desired final state: package owns avatar image/fallback rendering directly at
  usage sites; local `Avatar.vue` is deleted.

## Current Contract

- Props: `src`, `alt`, `name`, `fallback`, `size`, `shape`, `bordered`.
- Fallback derives from explicit fallback, then first letter of name, then `?`.

## Migration Shape

- From: local image/fallback markup.
- To: use `PuImg` directly in identity usage sites with `name`,
  `fallbackInitial`, `shape`, `bordered`, and package size props.
- Completion rule: no `<Avatar>` usage and no local `Avatar.vue` file remain.
- Parity rule: do not recreate the old avatar sizing or fallback markup through
  a wrapper. Use package-native image/fallback behavior.

## Risks

- Earlier package references were stale. Installed `0.4.0` declarations expose
  `name`, `fallbackInitial`, `shape`, and `bordered`.
- Size names differ from package image preset sizes.
- Accessible fallback labeling must remain meaningful.

## Slice Result

- `MePage.vue` and `UserProfilePage.vue` now use `PuImg` directly.
- `apps/frontend/src/shared/ui/identity/Avatar.vue` was deleted.

## Verification

- Build, token lint, frontend unit tests.
- Browser smoke where roster/avatar surfaces render.
