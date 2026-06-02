# PR TimeWindow Editor

## Objective & Hypothesis

Extend Anchor Event Card/List create-PR time selection to the same normal, advanced, and fuzzy modes as Form Mode, with one shared PR time-window editor.

Hypothesis: the editor should own both the selected PR `timeWindow` and the PR create-time `allowEditAfterReady.timeWindow` policy. Fuzzy selections should set the policy to the selected fuzzy range, while normal and advanced exact selections should clear it.

## Guardrails Touched

- Anchor Event Form Mode time selection.
- Anchor Event Card/List create-PR card time selection.
- Event-assisted PR creation request shape and pending WeChat replay state.
- PR ready-after edit policy created from fuzzy time windows.

## Verification

- Passed: `pnpm --filter @partner-up-dev/frontend exec vitest run src/domains/event/model/pr-time-window-editor.test.ts src/domains/event/queries/useCreateEventAssistedPR.test.ts`
- Passed: `pnpm --filter @partner-up-dev/frontend exec vitest run src/domains/event/model/form-mode.test.ts src/domains/event/model/pr-time-window-editor.test.ts`
- Passed: `pnpm --filter @partner-up-dev/frontend build`
