# 4-1 — Origin And Return-Target Containment

## Status

Implementation and both staging CD workflows completed on 2026-07-18. Focused behavior, static gates,
frozen-boundary checks and durable-document promotion are complete. The state-free staging preflight was attempted,
but this agent environment cannot establish TCP connections to the public China endpoints; an externally reachable
runner/browser must make the final header observation.

## Owned Runtime Boundary When Authorized

- `apps/backend/src/index.ts`: credentialed CORS origin decision.
- `apps/backend/src/controllers/wechat.controller.ts`: OAuth `returnTo` origin/fallback decision.
- `apps/backend/src/lib/frontend-origin.ts`: shared, narrow configuration-derived predicate.
- Focused Backend/Web/System tests that prove these changes.
- The three named durable documents in [`durable-docs-plan.md`](./durable-docs-plan.md).

## Explicit Non-Goals

- No change to `WECHAT_OAUTH_CALLBACK_URL`, forwarded-host callback inference, provider registration, callback route,
  cookies, handoff response, frontend callback page, session storage or authentication role behavior.
- No cross-environment access, implicit aliases or request-header-derived origin trust.

## Entry Facts

- Production pair: `app.partner-up.cn` -> `api-app.partner-up.cn`.
- Staging pair: `test.app.partner-up.cn` -> `test.api-app.partner-up.cn`.
- Live APIs currently reflect arbitrary origins with credentials.
- `FRONTEND_URL` is injected per environment and is the intended narrow configuration input.

See the parent [Impact Handshake](../02-impact-handshake-draft.md), [execution plan](./execution-plan.md),
[rehearsal](./rehearsal.md), [verification strategy](./verification-strategy.md) and
[durable-docs plan](./durable-docs-plan.md). The concrete source/test evidence and remaining rollout observation are
recorded in the [evidence index](./evidence-index.md), [verification log](./verification-log.md) and
[exit evidence](./exit-evidence.md).
