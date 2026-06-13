# LoadingIndicator Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/feedback/LoadingIndicator.vue`
  usage sites.
- Package target: `PuLoadingState`.
- Desired final state: package owns loading semantics and spinner rendering
  directly at call sites; the local `LoadingIndicator.vue` facade is deleted
  after call sites clear.

## Current Contract

- Prop: optional `message`.
- Current component renders a custom spinner plus message text.

## Migration Shape

- From: local spinner markup and keyframes.
- To: use `PuLoadingState` for the current visible loading region contract.
  Keep `PuSpinner` out of this slice unless a touched call site proves it is
  actually spinner-only.
- Confirmed package values: `align` is `"start" | "center"`, `size` is
  `"xs" | "sm" | "md" | "lg" | "xl"`, `surfaceLevel` is
  `"plain" | "section" | "surface" | "inset-high"`, and `variant` is
  `"plain" | "soft" | "outline" | "solid"`.
- Completion rule: no `<LoadingIndicator>` usage and no local
  `LoadingIndicator.vue` file remain unless a concrete package API blocker is
  recorded. Convert local `message` usage to package `message` plus `label`
  where needed.
- Parity rule: do not recreate the old spinner size, animation, region spacing,
  or loading message layout around `PuLoadingState`.
- Actual mapping: `message` remains visible message text; label falls back to
  `common.loading` when no message is supplied.
- Execution note: re-check current package declarations before editing usage
  sites because `PuLoadingState` is a consumed package export even though it is
  not listed in the generated component map reference.

## Risks

- There are many references, so package-native visual density may shift broadly.
- Empty message call sites may need an accessible label.

## Verification

- Build, token lint, frontend unit tests - passed.
- Second-slice verification should include build, token lint, frontend unit
  tests, and at least one route loading-state smoke if feasible.

## Slice Result

- Usage sites now import `PuLoadingState` directly.
- `apps/frontend/src/shared/ui/feedback/LoadingIndicator.vue` was deleted.
