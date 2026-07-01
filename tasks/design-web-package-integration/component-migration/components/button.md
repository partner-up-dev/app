# Button Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/actions/Button.vue`.
- Package target: `PuButton`.
- Desired final state: package owns command button rendering and the local
  `Button.vue` primitive is deleted after usage sites move to `PuButton`.

## Current Contract

- Props: `type`, `form`, `variant`, `appearance`, `tone`, `size`, `loading`,
  `disabled`, `block`, `fullWidth`.
- Slots: default, `leading`, `trailing`.
- Event: `click`.
- Current references: highest blast radius shared primitive. Inventory on
  2026-06-13 found 220 `<Button>` tags and 97 imports of the local primitive.

## Migration Shape

- From: local `appearance` plus mixed `tone` treatment vocabulary.
- To: package `shape`, semantic `tone`, visual `variant`, `size`, `loading`,
  `feedback`, `block`, and structured `action`.
- Migration strategy: direct usage-site migration only. Do not preserve
  `Button.vue` as a compatibility facade around `PuButton`.

## Proposed Mapping

- `appearance="pill"` -> `shape="pill"`; `appearance="rect"` ->
  `shape="rect"`.
- `tone="primary"` -> `tone="primary" variant="solid"`.
- `tone="primary-outline"` -> `tone="primary" variant="outline"`.
- `tone="secondary"` -> map per current visual treatment after checking rect
  versus pill usages.
- `tone="outline"` -> `tone="neutral" variant="outline"`.
- `tone="surface"` -> likely `tone="neutral" variant="soft"`.
- `tone="tertiary"` -> `tone="tertiary" variant="solid"`.
- `tone="dashed"` -> `tone="neutral" variant="dashed"`.
- `tone="danger"` -> `tone="danger" variant="outline"` unless a solid danger
  call site is explicitly intended.
- `tone="ghost"` -> `tone="neutral" variant="ghost"`.
- `loading` -> package `loading`.
- `type` -> package `:action="{ native: type }"` if needed.
- Existing inventory found no `form` attribute usage on local `<Button>`, so
  the package API not exposing a `form` prop is not currently a blocker.

## Risks

- `data-testid` and attrs must remain on the real interactive element.
- Existing CSS reaches into `.ui-button` and `.ui-button__label`; those
  dependencies must be mapped or removed in the same slice.
- Button is broad enough that a visual diff or staged PR is warranted.
- Form submit buttons need `:action="{ native: 'submit' }"` because `PuButton`
  defaults native actions to `type="button"` when no native action is supplied.

## Verification

- Build, token lint, full frontend unit tests.
- Targeted PR action tests.
- Browser smoke on PR detail, Anchor Event, Me, Admin PR, Commerce checkout,
  and ordering support surfaces.

## Slice Result

- All local `Button` usage sites now import and render `PuButton` directly.
- Static old prop vocabulary was mapped at usage sites:
  `appearance` -> `shape`, old local `tone` values -> package
  `tone` / `variant`, `full-width` -> `block`, and submit/reset `type` ->
  `action.native`.
- The only dynamic old tone surface,
  `APRNotificationSubscriptions.vue`, now computes package `tone` and uses
  `variant="outline"` directly.
- Local CSS dependencies on `.ui-button` and `.ui-button__label` were removed
  or retargeted to package DOM classes where they only owned layout.
- `apps/frontend/src/shared/ui/actions/Button.vue` was deleted.

## Slice Verification

- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `pnpm test:unit:frontend` passed, 26 files / 117 tests.
- Old local `Button` / `FeedbackButton` reference scan returned no findings
  under `apps/frontend/src`.
- Old `PuButton` prop vocabulary scan returned no findings on `<PuButton>`.
- `git diff --check` passed.
