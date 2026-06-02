# PR Post-Ready Editable Fields

## Objective & Hypothesis

Allow a `READY` PR to keep a narrow creator-owned editing surface for activity-core fields that are explicitly marked editable after ready.

Hypothesis: `READY` should continue to lock membership admission while allowing a PR-owned `allowEditAfterReady` policy to bound creator edits for fields such as `time_window`. Time changes that conflict with current participants should require explicit creator confirmation through `allowRelease`, and released slots must carry a stable `releaseReason`.

## Guardrails Touched

- Product lifecycle semantics in `docs/10-prd/behavior`.
- Backend `PATCH /pr/:id/content` creator edit contract.
- PR temporal conflict checks and partner release semantics.
- Anchor Event Form Mode fuzzy-time creation semantics.
- PR detail edit UI, Facts Card affordances, and user-friendly time-window formatting.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm lint:backend`
- `pnpm exec vitest run --project backend-unit apps/backend/src/domains/pr-core/services/pr-edit-capability.service.test.ts`
- `pnpm --filter @partner-up-dev/frontend exec vitest run src/domains/event/model/form-mode.test.ts src/shared/datetime/formatLocalDateTime.test.ts src/domains/event/queries/useCreateEventAssistedPR.test.ts`
- `pnpm --filter @partner-up-dev/frontend build`
