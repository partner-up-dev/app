# design-web 0.4.6 Update

## Objective & Hypothesis

Complete the consumer-side follow-up after upgrading
`@partner-up-dev/design-web` from `0.4.5` to `0.4.6`.

Hypothesis: the package upgrade is installed and the package-shipped agent
skill is valid. App migration is limited to stale `PuPageHeader` props because
the app does not currently consume `PuCheckbox`, `PuCheckboxGroup`, or
`PuFloatPanel`.

## Guardrails Touched

- Constraint route: package public API changed while product behavior should
  remain unchanged.
- Frontend unit: `apps/frontend/package.json`, `pnpm-lock.yaml`, and design-web
  consumers.
- Package skill guidance: use package public APIs and package-shipped
  `skills/design-web`; do not edit local agent skill copies.
- Dirty worktree guardrail: unrelated ordering/backend work exists and must not
  be overwritten.

## Evidence Sources

- `apps/frontend/node_modules/@partner-up-dev/design-web/CHANGELOG.md`
- `apps/frontend/node_modules/@partner-up-dev/design-web/MIGRATION.md`
- `apps/frontend/node_modules/@partner-up-dev/design-web/skills/design-web`
- Local package diff between pnpm package directories:
  - `@partner-up-dev/design-web@0.4.5`
  - `@partner-up-dev/design-web@0.4.6`

## Changelog Findings

`0.4.6` patch changes:

- Reset web `PuCheckbox` and remove `PuCheckboxGroup`.
- Simplify `PuPageHeader` into a neutral two-row page header with fixed main
  row and optional meta row.
- Add `usePuSelect`.
- Add `PuFloatPanel`.

Migration guide requires action only when consumers use the old checkbox group
or old checkbox contract.

## PuPageHeader Migration

`PuPageHeader` in `0.4.6`:

- Keeps: `title`, `subtitle`, `titleAs`, `showBack`, `backLabel`, `size`,
  `variant`, `actions`, `back-icon`, `meta`, `subtitle`, and `title`.
- Removes: `layout`, `bordered`, body/default slot, and container variants
  `soft`, `outline`, `solid`.
- Uses `variant="plain"` for no separator and `variant="line"` for bottom
  separation.
- Remains neutral; there is no `tone`.

App scan found no `layout`, `bordered`, or default slot use on `PuPageHeader`.
One stale prop was found and migrated:

- `apps/frontend/src/domains/commerce/ui/ordering/OrderingPageShell.vue`
  changed `density="compact"` to `size="sm"`.

## Other Component Impact

- No `PuCheckbox`, `PuCheckboxGroup`, or `PuFloatPanel` usage found in
  `apps/frontend/src`.
- No app migration is required for `usePuSelect` because it is a new additive
  composable.

## Verification

Passed:

- `pnpm dlx @tanstack/intent@latest list --json`
  - discovered local `@partner-up-dev/design-web@0.4.6`
- `pnpm dlx @tanstack/intent@latest load @partner-up-dev/design-web#design-web`
- `pnpm dlx @tanstack/intent@latest validate apps/frontend/node_modules/@partner-up-dev/design-web/skills/design-web`
  - `Validated 1 skill files — all passed`
- `pnpm check:type:frontend`
- `pnpm check:lint:frontend`

Note: `pnpm check:lint:frontend` exits successfully, but the report-only naming
audit still reports an unrelated weak-name finding for
`RideHailingOrderingContent.vue`.

## Next Step

Review the package upgrade and the single `PuPageHeader` consumer migration
alongside the active ordering worktree changes before committing.
