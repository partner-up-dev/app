# PageScaffold Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/layout/PageScaffold*.vue`.
- Package target: `PuPageScaffold`.
- Desired final state: route usage sites import `PuPageScaffold` directly with
  explicit package props; local `PageScaffold*.vue` wrappers are deleted after
  call sites clear unless a concrete route-layout semantic blocker is recorded.

## Current Contract

- Existing local wrappers already render `PuPageScaffold`.
- Route pages import named wrappers such as `PageScaffoldFlow`,
  `PageScaffoldCentered`, `FullScreenPageScaffold`, and
  `FooterRevealPageScaffold`.
- Confirmed package values: `viewport` is `"document" | "screen"`, `layout` is
  `"single" | "aside"`, `width` is `"page" | "wide" | "full"`,
  `contentPlacement` is `"start" | "center"`, and `footerPlacement` is
  `"auto" | "inside" | "reveal"`.

## Migration Shape

- From: multiple app wrappers around `PuPageScaffold`.
- To: replace usage sites with `PuPageScaffold`:
  `PageScaffold` -> default props; `PageScaffoldFlow` -> default plus existing
  header/footer slot composition; `PageScaffoldCentered` ->
  `content-placement="center"`; `FullScreenPageScaffold` ->
  `viewport="screen"`; `FooterRevealPageScaffold` ->
  `footer-placement="reveal"` plus explicit `content-placement`; and
  `DesktopPageScaffold` -> `layout="aside" width="wide" sticky-aside`.
- Completion rule: no local `PageScaffold*` imports or files remain unless a
  concrete product-owned layout semantic blocker is recorded.
- Parity rule: do not recreate old scaffold wrappers for class names, slot
  aliases, or layout defaults. Use explicit `PuPageScaffold` props at the route
  usage site. If a route-level layout abstraction appears genuinely
  product-owned, pause and discuss before keeping it.
- First-slice result: wrappers were left structurally unchanged because they
  already delegated to `PuPageScaffold`; the type entry covered their package
  props.
- Second-slice result: usage sites now import `PuPageScaffold` directly with
  explicit package props, and all local `PageScaffold*` wrappers were deleted.

## Risks

- Safe-area, full-screen height, footer reveal, and scroll ownership are page
  geometry risks.
- Route pages may rely on wrapper-specific class names or slot placement; those
  should move to package-native route composition rather than a compatibility
  wrapper unless explicitly approved.

## Verification

- `pnpm --filter @partner-up-dev/frontend build` - passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` - passed.
- Browser smoke on Home and PR detail mobile footer surfaces - passed.
