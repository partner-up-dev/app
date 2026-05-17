# Creator Actions First Slice

Status: implemented on 2026-05-17.

## Objective & Hypothesis

Clarify the first executable slice around creator-only PR detail actions.

Hypothesis:

- `PRCreatorHeaderActions` is a low-risk first slice because it wraps two route-scoped actions with little reuse value.
- Moving creator action assembly into `PRPage` should improve ownership clarity while keeping behavior unchanged.
- The creator modal chain can be simplified before tackling `PRContextualActions` and `PRUtilityActions`, whose target owner model needs more design work.

## Guardrails Touched

- Typed input: `Artifact` moving toward `Constraint`.
- Active mode: `Solidify`.
- Durable owner candidates:
  - `apps/frontend/src/pages/PRPage.vue`
  - `apps/frontend/src/domains/pr/ui/sections/PRCreatorHeaderActions.vue`
  - `apps/frontend/src/domains/pr/ui/modals/EditPRContentModal.vue`
  - `apps/frontend/src/domains/pr/ui/modals/UpdatePRStatusModal.vue`
  - `apps/frontend/src/domains/pr/ui/forms/PRForm.vue`
  - future status form owner if extracted from current modal internals

## Proposed State Diff

### Creator Header Actions

From:

- `PRPage` renders `PRCreatorHeaderActions`.
- `PRCreatorHeaderActions` owns creator visibility, edit/status button display, modal open state, scroll lock, telemetry, editable field projection, and direct modal mounting.
- Creator authority is derived from `createdBy` plus session store.

To:

- `PRPage` renders creator edit/status buttons directly in the header action slot.
- `PRPage` owns the two route-scoped modal open refs.
- Creator authority uses `pr.partnerSection.viewer.isCreator`.
- Editable field projection remains close to route detail data or moves into a focused mapper.
- Telemetry fires from route-owned click handlers or a small creator-action helper.

### Edit Content Modal

From:

- `EditPRContentModal` owns `Modal`, `PRForm`, update mutation, form submit bridge, error toast, footer actions, and success/close behavior.

To candidate A:

- `PRPage` assembles `Modal + PRForm + footer buttons + error toast`.
- Update mutation state and success refresh are route-owned or use-case-owned.

To candidate B:

- `EditPRContentModal` remains as a thin shell receiving `pending`, `error`, and `onSubmit`.
- Mutation ownership moves out of the modal.

Preferred first implementation: candidate A if `PRForm` exposes enough submit/validity surface cleanly.

### Update Status Modal

From:

- `UpdatePRStatusModal` owns `Modal`, status options, selected status, update mutation, error toast, and close behavior.

To candidate A:

- `PRPage` assembles `Modal + status option form + footer buttons + error toast`.

To candidate B:

- Extract `UpdatePRStatusForm` and keep a thin modal shell.

Preferred first implementation: candidate B if the status selector deserves a named form component; candidate A if route-local status editing stays tiny.

## Invariants

- Header buttons remain visible to creators under the same user-visible conditions.
- Draft edit availability remains preserved.
- Event-context PRs keep budget/time field visibility behavior.
- Edit content mutation keeps the current immutable type behavior.
- Status update options remain `OPEN`, `READY`, `ACTIVE`, `CLOSED`.
- Existing success cache invalidation from mutation hooks remains the source of data refresh.
- Existing user-facing labels and testids should remain stable where practical.

## Verification Candidate

- `pnpm --filter @partner-up-dev/frontend build`
- Targeted unit or component tests if existing harness around PR detail creator actions exists.
- Manual PR detail smoke check for creator:
  - open edit modal
  - submit valid edit
  - open status modal
  - submit status update
  - close both modals

## Discussion Notes

- This slice is suitable to execute before contextual / utility action decomposition.
- `PRContextualActions` and `PRUtilityActions` need a middle-layer design. A direct move of all hidden behavior into `PRPage` would trade one boundary problem for another.

## Implementation Notes

Files changed:

- `apps/frontend/src/pages/PRPage.vue`
- `apps/frontend/src/pages/PRPage.creator-actions.test.ts`
- `apps/frontend/src/domains/pr/use-cases/usePRCreatorActions.ts`
- `apps/frontend/src/domains/pr/ui/forms/UpdatePRStatusForm.vue`
- `vitest.config.ts`
- `package.json`
- `pnpm-lock.yaml`

Files removed:

- `apps/frontend/src/domains/pr/ui/sections/PRCreatorHeaderActions.vue`
- `apps/frontend/src/domains/pr/ui/modals/EditPRContentModal.vue`
- `apps/frontend/src/domains/pr/ui/modals/UpdatePRStatusModal.vue`

Actual state:

- `PRPage` now assembles creator edit/status header buttons directly.
- `PRPage` mounts the edit content and update status modals directly with shared `Modal`, `Button`, and `ErrorToast`.
- `PRForm` remains the PR content form surface.
- `UpdatePRStatusForm` owns the status option selection surface and emits the selected status on submit.
- `usePRCreatorActions` owns creator visibility projection, editable field mapping, and update content/status mutation calls.
- Creator authority now uses `pr.partnerSection.viewer.isCreator`.
- Creator header buttons expose stable test ids:
  - `pr-detail.creator.edit-content`
  - `pr-detail.creator.modify-status`
- Frontend unit tests can now mount Vue SFCs through root Vitest config with `@vitejs/plugin-vue`; PR Page component tests use per-file `happy-dom`.

Verification run:

- `rg -n "PRCreatorHeaderActions|EditPRContentModal|UpdatePRStatusModal" apps/frontend/src tests` returned no references.
- `pnpm exec vitest run --project frontend-unit apps/frontend/src/pages/PRPage.creator-actions.test.ts` passed.
- `pnpm test:unit:frontend` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `git diff --check` passed.
