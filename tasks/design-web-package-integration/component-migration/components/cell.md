# Cell Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/display/Cell.vue` usage sites.
- Package target: `PuCell`.
- Desired final state: package owns compact row structure directly at call
  sites; the local `Cell.vue` facade is deleted after call sites clear.

## Current Contract

- Props: `as`, `type`, `border`, `title`, `value`, `suffixIcon`.
- Slots: `title`, default value, `suffix`.

## Migration Shape

- From: local row markup.
- To: usage sites import `PuCell` and use package props/slots.
- Completion rule: no `<Cell>` usage and no local `Cell.vue` file remain unless
  a concrete package API blocker is recorded.
- Parity rule: do not wrap `PuCell` to preserve old root element defaults,
  borders, suffix icon class behavior, or spacing.

## Risks

- Root element choice still needs to match product semantics such as navigation
  or action affordance, but package-native rendering details may change.
- Suffix icon rendering may move to package-native slots or icons.

## Verification

- Build, token lint, targeted usage smoke.

## Slice Result

- Local `Cell` call sites were migrated directly to `PuCell`.
- `apps/frontend/src/shared/ui/display/Cell.vue` was deleted.
