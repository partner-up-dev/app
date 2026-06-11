# Anchor Event Form Mode Materialized Auto Create

## Objective & Hypothesis

- Change Form Mode primary action copy to `检索`.
- Align zero-candidate automatic PR creation in Form Mode with the dummy PR ownership/publication behavior only.
- Corrected scope from human clarification: automatic creation should create a system-owned `OPEN` PR and no longer use user ownership. It should not inherit dummy materialization's existing-PR reuse branch and should not inherit the one-preference-tag limitation.
- Working hypothesis: only the `auto_no_candidates` path changes; manual fallback remains event-assisted user creation unless explicitly expanded.

## Guardrails Touched

- `/e/:eventId` Form Mode route-level state machine.
- Anchor Event dummy PR materialization endpoint and query client.
- PR create authority and ownership semantics.
- Existing user changes in `apps/frontend/src/locales/zh-CN.jsonc`, `apps/frontend/package.json`, and `pnpm-lock.yaml` must be preserved.

## Current Understanding

- Current zero-candidate auto path uses `useCreateEventAssistedPR`, which calls `POST /api/pr/new/form` with `createSource: EVENT_ASSISTED`, requires authenticated user identity, and returns a user-owned published PR.
- Dummy materialization creates system-owned `OPEN` PRs by calling `createPRFromStructured` with null creator identity and `publicationMode: create-open`, but also has behaviors that should not be reused here: visible-PR reuse and at-most-one preference tag.
- The primary action label is currently dynamic i18n copy under `anchorEvent.formMode.primaryCta*`.

## Outcome

- Form Mode primary action copy is static `检索`.
- Form Mode zero-candidate automatic creation now uses a dedicated Anchor Event endpoint and creates a system-owned `OPEN` PR.
- Manual fallback still uses the existing event-assisted user-owned create path.
- Automatic creation preserves the full selected preference label set after trim/dedupe; it does not inherit dummy PR's one-tag limit.

## Verification

- `pnpm exec vitest run --project backend-unit apps/backend/src/domains/anchor-event/use-cases/create-form-mode-auto-pr.test.ts apps/backend/src/domains/anchor-event/use-cases/materialize-dummy-pr.test.ts` passed.
- `pnpm exec vitest run --project frontend-unit apps/frontend/src/domains/event/queries/useCreateFormModeAutoPR.test.ts apps/frontend/src/domains/event/queries/useCreateEventAssistedPR.test.ts apps/frontend/src/domains/event/queries/useMaterializeDummyPR.test.ts` passed.
- `pnpm exec vitest run --project system-scenario tests/scenario/anchor-event/anchor-event-form-mode-participation.scenario.test.ts` passed.
- `pnpm lint:backend` passed.
- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/frontend exec vue-tsc --noEmit` passed.
