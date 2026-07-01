# FeedbackButton Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/actions/FeedbackButton.vue`.
- Package target: `PuButton` `feedback` prop.
- Desired final state: transient pending/success/error action states use the
  package feedback API.

## Current Contract

- Props: `type`, `appearance`, `tone`, `size`, `state`, `loading`, `disabled`,
  `block`, `fullWidth`.
- Slots: default, `leading`, `trailing`.
- Event: `click`.

## Migration Shape

- From: local wrapper around local `Button` with state classes.
- To: package `PuButton` with mapped `feedback` and `loading`.
- Migration strategy: direct usage-site migration only. Do not keep
  `FeedbackButton.vue` as a wrapper around `PuButton`.
- Current references: inventory on 2026-06-13 found 2 `<FeedbackButton>` tags,
  both under share methods.

## Risks

- Success/error visual treatment may differ.
- Pending state must remain disabled/announced consistently with existing UX.
- The component should move in the same slice as `Button` because it currently
  depends on the local `Button` primitive.

## Verification

- Build, token lint, targeted share/action feedback tests or smoke.

## Slice Result

- Both former `FeedbackButton` usage sites now import and render `PuButton`
  directly with the `feedback` prop.
- `ShareAsLink.vue` maps its share state to package feedback values at the
  usage site.
- `ShareToXiaohongshu.vue` maps copy success/error state to package feedback
  values and uses package-native outline actions.
- `apps/frontend/src/shared/ui/actions/FeedbackButton.vue` was deleted.

## Slice Verification

- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `pnpm test:unit:frontend` passed, 26 files / 117 tests.
- Old local `FeedbackButton` reference scan returned no findings under
  `apps/frontend/src`.
- `git diff --check` passed.
