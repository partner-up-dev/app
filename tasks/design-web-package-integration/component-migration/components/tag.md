# Tag Migration

## Target

- Local owner: no current shared `Tag.vue` primitive.
- Package target: `PuTag`.
- Desired final state: non-interactive status and category labels use package
  tag rendering instead of local pill/span styles or overloaded `Chip` tone
  usage.

## Current Contract

- Status/category labels are currently split across local `Chip` use,
  page-local `status-pill`/badge classes, and domain-local tag styles.
- Local `Chip` is also used for token-like labels, so not every chip should
  become `PuTag`.

## Migration Shape

- From: status/category labels are implemented as local chips or page/domain
  spans.
- To: use `PuTag` for compact non-interactive labels.
- Completion rule: status/category labels touched in this slice import
  `PuTag` directly from the package. Do not introduce a local `Tag.vue` facade
  and do not route status labels through local `Chip`.

## Risks

- `PuTag` has no slots in the generated reference; it uses a `text` prop.
- Package tag uses `text`, `tone`, `variant`, `shape`, and `size`; slot content
  is not the component contract.
- Some domain tags are interactive/removable and should remain `PuChip` or a
  domain-specific editor control.

## Verification

- Build, token lint, frontend unit tests.
- Visual smoke on status labels in application lists and admin review surfaces
  if any are touched.

## Slice Result

- `PuTag` was introduced for read-only status labels in route/location
  application lists, Me page WeChat binding status, admin route application
  review cards, POI review, and PR partner capacity status.
- No local `Tag.vue` facade was introduced.
