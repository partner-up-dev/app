# TabBar Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/navigation/TabBar.vue`.
- Package target: `PuTabs`.
- Desired final state: value-based tab navigation uses the package `PuTabs`
  API directly and local `TabBar.vue` is deleted after usage sites clear.
- Status: Done. `PRCreatePage.vue` and `AnchorEventListModeSurface.vue` now
  import `PuTabs` directly, and the local `TabBar.vue` file was deleted.

## Current Contract

- Props: `items`, `modelValue`, `ariaLabel`.
- Item shape: `{ key, label, disabled?, tabClass? }`.
- Event: `update:modelValue`.
- Current references: inventory on 2026-06-13 found 2 `<TabBar>` tags:
  `PRCreatePage.vue` and `AnchorEventListModeSurface.vue`.

## Migration Shape

- From: local key-based horizontal tabbar with per-item `tabClass` escape hatch.
- To: package `PuTabs` with value-based `{ value, label, disabled?, showDot? }`
  items, `v-model`, package variant, and package keyboard behavior.
- Migration strategy: direct usage-site migration only. Do not keep
  `TabBar.vue` as a wrapper around `PuTabs`.

## Proposed Mapping

- `item.key` -> `value`.
- `item.label` -> `label`.
- `item.disabled` -> `disabled`.
- `v-model` / `update:modelValue` -> `PuTabs` `v-model`.
- `ariaLabel` -> no direct app-side mapping in this slice. Current `PuTabs`
  public API does not expose a way to label its internal `role="tablist"`;
  record this as a package API follow-up rather than creating a local wrapper.
- `tabClass` -> retired. It was used only for the expired-date dashed visual
  treatment in list mode and is not recreated around `PuTabs`.
- Layout spacing between list-mode tabs and the `date-panel` is owned by the
  parent `.date-section` flex `gap`, not by a package `customClass` hook.

## Risks

- Existing `tabClass` usage was visual-only product chrome. It was removed
  instead of recreated as an app wrapper or per-tab package-class override.
- `PuTabs` is value-based and should not be migrated as index-only state.
- Package follow-up: expose an `ariaLabel` / `ariaLabelledby` API or equivalent
  forwarding to the internal tablist.

## Verification

- `pnpm --filter @partner-up-dev/frontend build` - passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` - passed.
- `pnpm test:unit:frontend` - passed, 26 files / 117 tests.
- Local reference scan for `TabBar`, `tab-bar__`, and `tabClass` under
  `apps/frontend/src` returned no findings.
- `git diff --check` - passed.
