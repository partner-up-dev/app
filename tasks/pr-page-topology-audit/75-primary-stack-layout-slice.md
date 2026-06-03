# Primary Stack Layout Slice

## Objective & Hypothesis

Move PR Page primary action spacing ownership from individual action components into the route page assembly.

Hypothesis:

- `PRPage` should own vertical distance between page-level regions.
- PR action components should own only their internal button, tip, notice, modal, and error layout.

## Guardrails Touched

- Typed input: `Constraint`.
- Active mode: `Execute`.
- Durable owner:
  - `apps/frontend/src/pages/PRPage.vue`
  - `apps/frontend/src/domains/pr/ui/sections/PRWaitlistActions.vue`
  - `apps/frontend/src/domains/pr/ui/sections/PRConfirmationAction.vue`
  - `apps/frontend/src/domains/pr/ui/sections/PRCheckInFeedbackActions.vue`
  - `apps/frontend/src/domains/pr/ui/sections/PRJoinAction.vue`
  - `apps/frontend/src/domains/pr/ui/sections/PRExitAction.vue`

## Verification

- `pnpm exec vitest run --project frontend-unit apps/frontend/src/domains/pr/ui/sections/PRParticipationActions.test.ts apps/frontend/src/pages/PRPage.creator-actions.test.ts` passed.
- `rg -n 'margin-top: var\(--sys-spacing-large\)'` over the touched primary action components no longer reports component-owned page spacing.
- Removed stale `contextual-area`, `primary-action`, `secondary-action`, and `secondary-danger-action` class names from the primary action components; each component now uses `action-section` and `action-group` for internal layout.
