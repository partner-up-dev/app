# Anchor Event Form Mode Time Scope Diagnosis

## Objective & Hypothesis

- Objective: Diagnose why Anchor Event Form Mode create fallback can return `Selected time window is outside the anchor event scope`.
- Hypothesis: the zero-candidate Form Mode auto-create backend path still enforces event time-pool ownership, while product rules allow fuzzy Form Mode creation windows to be PR-owned resolved windows and not constrained by the event pool.

## Guardrails Touched

- Durable docs currently consulted only; no production code mutation.
- Backend Anchor Event use cases and frontend Form Mode query/call chain are in blast radius if a fix is started.

## Verification

- Frontend auto-create path traced to `AnchorEventFormModeSurface.vue` -> `useCreateFormModeAutoPR.ts` -> `POST /api/events/:eventId/form-mode/auto-create`.
- Event-assisted structured create path traced separately to `useCreateEventAssistedPR.ts` -> `POST /api/pr/new/form`.
- Backend auto-create failure traced to `create-form-mode-auto-pr.ts` calling `eventOwnsTimeWindow(...)`.
- Existing tests cover successful auto-create with `eventOwnsTimeWindow` mocked true, but do not cover fuzzy/advanced non-event-pool windows.
- Implemented fix: Form Mode auto-create no longer checks Anchor Event time-pool ownership before unified PR creation.
- Added backend unit coverage for fuzzy all-day auto-create using a PR time window outside the event-owned pool.
- Passed `pnpm exec vitest run --project backend-unit apps/backend/src/domains/anchor-event/use-cases/create-form-mode-auto-pr.test.ts`.
- Passed `pnpm lint:backend`.
- Passed `pnpm --filter @partner-up-dev/backend typecheck`.

## Current Understanding

- The visible error string is thrown by backend Anchor Event use cases before PR structured creation.
- Form Mode zero-candidate auto-create is distinct from authenticated event-assisted structured create.
- Durable product docs say Form Mode fuzzy windows are not constrained by the Anchor Event configured time pool and zero-candidate auto-create should use the selected fuzzy activity window as the created PR time window.
- The current backend guard requires submitted auto-create windows to match event `timePoolConfig.startRules` and `durationMinutes`, so fuzzy all-day / part-of-day / advanced windows can be rejected before unified PR creation.
- Unified PR creation still applies PR-owned time guards such as start-not-past and POI availability.

## Outcome

- Resolved for Form Mode zero-candidate auto-create.
- Dummy PR materialization still keeps event-pool ownership checks because dummy generation is documented as bounded by event create windows.
