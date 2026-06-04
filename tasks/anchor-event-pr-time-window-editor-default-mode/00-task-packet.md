# Anchor Event PR Time Window Editor Default Mode

## Objective & Hypothesis

Let each Anchor Event configure the default mode used by the shared `PRTimeWindowEditor` for assisted PR creation: `NORMAL`, `FUZZY`, or `ADVANCED`.

Hypothesis: this is Anchor Event-owned UI policy. It should affect empty initial editor state across Form Mode, Card Mode, and List Mode assisted-create surfaces, while existing selected time-window state still wins over the configured default.

## Guardrails Touched

- Anchor Event durable configuration and admin mutation contract.
- Public Anchor Event detail read used by Card/List assisted create.
- Public Anchor Event Form Mode bootstrap read.
- Shared frontend `PRTimeWindowEditor` initialization behavior.
- Event-assisted PR create `allowEditAfterReady.timeWindow` semantics for fuzzy selections.

## Verification

- Passed: `pnpm --dir apps/backend typecheck`
- Passed: `pnpm exec vitest run --project backend-unit apps/backend/src/entities/anchor-event.test.ts apps/backend/src/domains/pr-core/services/join-gates.service.test.ts`
- Passed: `pnpm --filter @partner-up-dev/frontend exec vitest run src/domains/event/ui/controls/PRTimeWindowEditor.test.ts src/domains/admin/use-cases/anchor-event/anchorEventMutationInput.test.ts src/domains/event/model/pr-time-window-editor.test.ts`
- Passed: `pnpm --dir apps/frontend exec vue-tsc --noEmit --pretty false`
- Passed: `pnpm --filter @partner-up-dev/backend db:lint`
- Passed: `pnpm lint:backend`
- Passed: `pnpm --filter @partner-up-dev/frontend build`
