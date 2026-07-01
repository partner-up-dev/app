# EmptyState Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/feedback/EmptyState.vue` usage
  sites.
- Package target: `PuEmptyState`.
- Desired final state: package owns empty-state structure and surface treatment
  directly at call sites; the local `EmptyState.vue` facade is deleted after
  call sites clear.

## Current Contract

- Props: `as`, `title`, `description`, `icon`, `compact`, `align`, `tone`.
- Slots: default body and `actions`.
- Current implementation uses `PuCard` and local typography/icon classes.

## Migration Shape

- From: custom EmptyState shell composed from `PuCard`.
- To: `PuEmptyState` with mapped `variant`, `surfaceLevel`, `align`,
  `compact`, and icon support.
- Confirmed package values: `align` is `"start" | "center"`,
  `surfaceLevel` is `"plain" | "section" | "surface" | "inset-high"`, and
  `variant` is `"plain" | "soft" | "outline" | "solid"`.
- Completion rule: no `<EmptyState>` usage and no local `EmptyState.vue` file
  remain unless a concrete package API blocker is recorded. Convert local
  treatment vocabulary to package props at usage sites.
- Parity rule: do not wrap `PuEmptyState` to recreate old card, typography,
  spacing, or action layout. Use package-native empty-state structure.
- Execution note: re-check current `@partner-up-dev/design-web@0.4.0`
  declarations before editing usage sites; direct migration should use the
  package's public props, not the facade's compatibility mapping.
- Actual mapping: local `tone="outline"` maps to `variant="outline"`;
  `tone="section"` maps to `variant="soft"`; both use
  `surfaceLevel="section"`.

## Risks

- `tone="section" | "outline"` is a local treatment vocabulary, not the
  package's `variant` / `surfaceLevel` split.
- Icon class rendering must remain compatible with UnoCSS icon classes.

## Verification

- Build, token lint, frontend unit tests - passed.
- Browser smoke should include at least one no-data/search-empty route or
  component surface touched by direct call-site migration.

## Slice Result

- Usage sites now import `PuEmptyState` directly.
- `apps/frontend/src/shared/ui/feedback/EmptyState.vue` was deleted.
