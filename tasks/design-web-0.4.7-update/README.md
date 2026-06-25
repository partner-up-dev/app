# design-web 0.4.7 Update

## Objective & Hypothesis

Upgrade the frontend `@partner-up-dev/design-web` dependency from `0.4.6` to
`0.4.7`, validate the package-shipped `skills/design-web` agent skill, and
apply any required consumer migrations inside `apps/frontend`.

Hypothesis: this is a `Constraint` change. Product behavior should remain the
same, while the package public API and package-shipped skill may require
consumer-side adjustments.

## Guardrails Touched

- Constraint route: dependency and package boundary change without intended PRD
  changes.
- Frontend durable owner: `apps/frontend` package boundary and consumer code.
- Deployment / skill guidance: package dependency update is the skill update
  mechanism; do not hand-edit local skill copies.

## Current Understanding

- Frontend dependency is now `@partner-up-dev/design-web@0.4.7`.
- Registry verification:
  - `dist-tags.latest` resolves to `0.4.7`.
  - publish time for `0.4.7` is `2026-06-25T07:25:19Z`.
- A previous `pnpm view ... versions` call returned stale data without
  `0.4.7`, so migration evidence should be taken from the downloaded package
  tarball rather than that initial listing.
- Source-of-truth release evidence from
  `https://raw.githubusercontent.com/partner-up-dev/design/main/packages/web/`:
  - `package.json` version is `0.4.7`
  - `CHANGELOG.md` documents `PuHeader` introduction and `PuPageHeader`
    removal
  - `MIGRATION.md` requires consumer migration for `PuPageHeader` removal and
    the prior `PuCheckbox` reset
- Consumer scan in `apps/frontend/src` found:
  - `PuPageHeader` usage in 18 files
  - `PuPageScaffold` `#header` slot usage in 18 files
  - `PuCheckbox` usage in 2 files
- Applied migration outcome:
  - all `PuPageHeader` consumers in `apps/frontend/src` were removed
  - standard page headers now use `PuPageScaffold` `pageHeader` + `PuHeader`
  - custom raw headers remain only on pages that still need non-standard
    layout structure such as `AdminLoginPage.vue` and
    `WeChatOAuthCallbackPage.vue`
  - adjacent page-header consumers were also normalized:
    `LocationPickerPage.vue`
  - follow-up runtime repair:
    - `PRPage.vue` originally used `v-if` directly on the `#pageHeader` slot
      template, which prevented the scaffold from receiving the named slot at
      runtime on `/pr/:id`
    - fix: keep the `pageHeader` slot itself unconditional and move the
      condition onto the nested `PuHeader`
  - follow-up cleanup:
    - inline former `PRCreateHeader.vue` into `PRCreatePage.vue`
    - delete unused `PRHeroHeader.vue`
  - follow-up back-affordance repair:
    - old `PuPageHeader showBack` semantics were restored on migrated pages:
      keep the back arrow icon visible, remove mistaken visible `返回首页`
      text, and preserve the previous `backLabel` meaning through
      `aria-label`
    - `LocationPickerPage.vue` remains a custom-header exception because it
      did not come from `PuPageHeader showBack`
  - follow-up scaffold-padding audit:
    - widened the `PuPageScaffold` scan to cover CSS custom-property
      overrides, internal scaffold-class deep selectors, and wrapper shells
    - `OrderingPageShell.vue` now uses the `PuPageScaffold` `padding` prop for
      its `noPadding` mode instead of zeroing scaffold padding with a wrapper
      class
    - `OrderingPageShell.vue` also pins
      `--pu-page-scaffold-region-gap` to zero so the ordering shell keeps the
      previous zero-gap header/body/footer stacking semantics after the
      scaffold migration
    - `CommerceBillDetailPage.vue` now declares `padding=\"none\"` directly on
      `PuPageScaffold` instead of simulating the layout through
      `--pu-page-padding-bottom`
    - remaining hits such as `StudySprintPomodoroPage.vue`,
      `ContactSupportPage.vue`, and `AnchorEventLandingPage.vue` still need
      case-by-case treatment because they tune safe-area rhythm, alignment, or
      reveal-layout internals rather than mapping cleanly to scaffold
      `padding=\"none\"`

## Migration Signals

- `0.4.7` additive changes:
  - `PuButton` adds `xs`
  - `PuRadio` is added
  - visual adjustments for `PuCheckbox`, `PuCard`, `PuMultiStopToggle`
- `0.4.7` compatibility-sensitive changes:
  - `PuPageHeader` is removed in favor of public `PuHeader`
  - `PuPageScaffold` now differentiates scaffold-owned `pageHeader` from raw
    custom `header`
  - header outer padding moves from header component ownership to the page or
    surface host
- Consumer migration likely needs more than an import rename because the new
  `PuHeader` migration guide explicitly requires:
  - move page-level headers into the `PuPageScaffold` `pageHeader` slot
  - set `titleAs=\"h1\"` when the page title remains the primary heading
  - move back affordances into `leading`
  - move outer padding to the containing page or slot wrapper
- Verified old `PuPageHeader@0.4.6` back behavior from the cached package
  bundle:
  - `showBack` rendered an icon-only back button
  - `backLabel` was wired to the button `aria-label`, not visible button text
  - app-side `PuHeader` migration should preserve that icon-only affordance
    instead of rendering visible `返回首页` copy in the header leading area

## Evidence Sources

- `apps/frontend/package.json`
- `pnpm-lock.yaml`
- `docs/40-deployment/rollout.md`
- downloaded `@partner-up-dev/design-web@0.4.7` package contents

## Verification

Passed:

- `pnpm dlx @tanstack/intent@latest list --json`
  - discovered local `@partner-up-dev/design-web@0.4.7`
- `pnpm dlx @tanstack/intent@latest load @partner-up-dev/design-web#design-web`
- `pnpm dlx @tanstack/intent@latest validate apps/frontend/node_modules/@partner-up-dev/design-web/skills/design-web`
  - `Validated 1 skill files — all passed`
- `pnpm check:type:frontend`
- `pnpm check:lint:frontend`
- `pnpm check:build:frontend`
- Playwright runtime spot checks
  - `https://partner-up.local/pr/39`
  - `https://partner-up.local/pr/new`
  - `https://partner-up.local/events`
  - each page exposed a `PuPageScaffold` page header with an icon-only back
    button and the expected `aria-label`

Notes:

- `pnpm check:lint:frontend` still reports the existing report-only weak-name
  findings for `RideHailingOrderContent.vue` and
  `RideHailingOrderingContent.vue`; they are unrelated to this migration.

## Next Step

Ready for review.
