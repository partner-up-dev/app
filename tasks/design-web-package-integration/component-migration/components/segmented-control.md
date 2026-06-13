# SegmentedControl Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/controls/SegmentedControl.vue`
  usage sites.
- Package target: `PuSegmented` and `PuSegmentedItem`.
- Desired final state: package owns radio/tab keyboard behavior and visual rail.

## Current Contract

- Props: `modelValue`, `options`, `ariaLabel`, `size`, `tone`, `block`.
- Option fields: `value`, `label`, `icon`, `ariaLabel`, `testId`,
  `disabled`.
- Event: `update:modelValue`.
- Current call sites use this as a radio-style mode switch, not real tab panels.

## Migration Shape

- From: local loop rendering radio buttons.
- To: `PuSegmented` wrapping one `PuSegmentedItem` per option.
- Completion rule: no `<SegmentedControl>` usage and no local
  `SegmentedControl.vue` file remain unless a concrete package API blocker is
  recorded. Preserve option-level `data-testid` and icon slots at usage sites.
- Parity rule: do not wrap `PuSegmented` to keep the old radiogroup DOM,
  activation behavior, option loop API, event shape, or block/tone vocabulary.
  Use package-native segmented behavior unless it changes product-level mode
  selection meaning.

## Risks

- Package `semantics="tabs"` must only be used for real tab panels; default
  should remain radio semantics.
- Keyboard activation behavior may differ.
- Package emits both `update:modelValue` and `change`; usage sites should
  choose the package event directly instead of adapter compatibility.

## Verification

- Build, token lint, frontend unit tests.
- Targeted smoke where segmented controls switch form/page modes.

## Slice Result

- All local segmented control call sites now render `PuSegmented` with explicit
  `PuSegmentedItem` children.
- Option icons and `data-testid` attributes remain usage-site owned.
- `apps/frontend/src/shared/ui/controls/SegmentedControl.vue` was deleted.
