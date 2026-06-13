# TabBar Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/navigation/TabBar.vue`.
- Package target: `PuTabs`.
- Desired final state: value-based tab navigation uses the package `PuTabs`
  API directly and local `TabBar.vue` is deleted after usage sites clear.

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
- `ariaLabel` -> native `aria-label` attr if package forwarding supports it;
  otherwise confirm whether `customClass` or package API is sufficient before
  production migration.

## Risks

- Existing `tabClass` usage may be visual-only product chrome. If the class is
  only styling, prefer package-native `variant`, `size`, or `showDot`; do not
  recreate a wrapper to preserve arbitrary per-tab classes.
- `PuTabs` is value-based and should not be migrated as index-only state.

## Verification

- Build, token lint, frontend unit tests.
- Targeted browser smoke on PR create tabs and Anchor Event list mode tabs.
