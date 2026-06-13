# ChipGroup Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/display/ChipGroup.vue` and
  `FitChipGroup.vue` usage sites.
- Package target: `PuChipGroup`.
- Desired final state: package owns grouped chip spacing and wrapping where
  package API matches; local group helpers are deleted after call sites clear.

## Current Contract

- `ChipGroup` props: `as`, `gap`, `align`.
- `FitChipGroup` props: `items`, `maxItems`, `gap`, `tone`, `size`,
  `ariaLabel`, `chipClass`.

## Migration Shape

- From: simple flex wrapper plus custom measurement component.
- To: usage sites import `PuChipGroup` and render package chips/tags directly.
  Replace `FitChipGroup` with explicit sliced item rendering plus overflow
  count at the usage site when item limits are product-owned.
- Completion rule: no `<ChipGroup>` / `<FitChipGroup>` usage and no local group
  helper files remain unless a concrete package API blocker is recorded.
- Parity rule: do not rebuild `FitChipGroup` as a wrapper around `PuChipGroup`
  for measurement parity. If dynamic measurement is truly product-owned, pause
  and discuss the exception.

## Risks

- Installed `0.4.0` `PuChipGroup` exposes `fit`; overflow count remains
  usage-site owned if needed.
- Removing measurement behavior may change dense metadata rows; verify usable
  truncation/overflow rather than exact old wrapping.

## Slice Result

- `EventCard.vue` now renders sliced available-location chips directly inside
  `PuChipGroup fit`.
- `PRFactsCard.vue` uses `PuChipGroup` for preference and roster preview token
  lists.
- `ChipGroup.vue` and `FitChipGroup.vue` were deleted.

## Verification

- Build, token lint, frontend unit tests.
- Browser smoke on narrow containers using fit chips.
