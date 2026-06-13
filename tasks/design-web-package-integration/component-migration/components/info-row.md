# InfoRow Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/display/InfoRow.vue` and
  `InfoRowAction.vue` usage sites.
- Package target: `PuDescriptionList`, `PuDescriptionItem`, or `PuCell`.
- Desired final state: read-only facts use package description components;
  actionable rows use package cell/action patterns; local info-row primitives
  are deleted after call sites clear.

## Current Contract

- `InfoRow`: label/value layout with inline or stack mode.
- `InfoRowAction`: label plus trailing clickable value and optional suffix icon.
- Current dense surface: `PRFactsCard` uses `InfoRow`, `InfoRowAction`,
  `Chip`, and `ChipGroup` together.

## Migration Shape

- From: two local metadata row primitives.
- To: use `PuDescriptionList` with `PuDescriptionItem` for read-only fact
  groups; use `PuCell` for interactive value affordances.
- Completion rule: no `<InfoRow>` / `<InfoRowAction>` usage and no local
  info-row files remain unless a concrete package API blocker is recorded.
- Parity rule: do not recreate the old inline/stack row component on top of
  `PuDescriptionItem` or `PuCell`. Let grouped facts adopt package-native
  description-list structure.

## Risks

- `PuDescriptionItem` inline layout has specific label/value alignment rules.
- `PuDescriptionItem` is documented for use inside `PuDescriptionList`; a
  standalone row migration may be structurally wrong even if it compiles.
- Interactive value affordances must remain keyboard reachable, but the exact
  old row/button DOM does not need to remain.

## Verification

- Build, token lint, targeted smoke on PR facts and metadata surfaces.

## Slice Result

- `PRFactsCard.vue` now uses `PuDescriptionList` and `PuDescriptionItem`
  directly.
- Action affordances are composed at the usage site with native buttons in
  `PuDescriptionItem` action slots.
- `InfoRow.vue` and `InfoRowAction.vue` were deleted.
