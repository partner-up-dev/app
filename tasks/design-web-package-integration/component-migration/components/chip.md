# Chip Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/display/Chip.vue` usage sites.
- Package target: `PuChip`.
- Desired final state: package owns chip shape, tone, variant, size, and optional
  removable/action behavior directly at call sites; the local `Chip.vue`
  facade is deleted after call sites clear.

## Current Contract

- Props: `as`, `tone`, `size`.
- Slots: default.
- Local tones include `secondary`, `primary`, `surface`, `outline`, `danger`,
  and `warning`.
- Related package split: `PuChip` covers token/filter/removable semantics;
  `PuTag` covers compact non-interactive status/category labels.

## Migration Shape

- From: local `tone` mixes semantic color and visual treatment.
- To: import `PuChip` at usage sites and map each old `tone` use to the closest
  package `tone` / treatment at the call site.
- Completion rule: no `<Chip>` usage and no local `Chip.vue` file remain unless
  a concrete package API blocker is recorded.
- Parity rule: do not wrap `PuChip` to recreate old tone vocabulary, exact
  sizes, borders, or chip spacing. Use package-native chip/tag vocabulary and
  adjust usage sites semantically.

## Risks

- Local `outline` is treatment, not package tone.
- Local `warning` is not part of package `PuChipTone`; use a supported tone or
  move true status labels to `PuTag` if the package vocabulary fits.
- Size and min-height may shift list/card alignment; this is acceptable unless
  content becomes unreadable or interaction targets become unusable.
- `ChipGroup` / `FitChipGroup` call sites may need simultaneous migration to
  `PuChipGroup` or local layout CSS so old chip imports do not linger.

## Verification

- Build, token lint, frontend unit tests.
- Visual smoke on PR facts, partner/status labels, and event cards.

## Slice Result

- Token/list labels now use `PuChip` directly at usage sites.
- Read-only status labels were moved to `PuTag` instead of overloading chip
  tone.
- `apps/frontend/src/shared/ui/display/Chip.vue` was deleted.
