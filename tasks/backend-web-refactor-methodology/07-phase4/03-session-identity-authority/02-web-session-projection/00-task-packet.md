# 4-2.2 — Web Session Projection

## Owned Paths

- `apps/web/src/processes/auth/**`;
- `apps/web/src/shared/auth/session-storage.ts` and `useUserSessionStore.ts`;
- focused Web tests adjacent to those paths;
- only minimal admin type decoupling needed to preserve its separate storage context.

## Exact Outcome

The public store has one role/user projection and browser storage has the token. Bootstrap makes exactly one
register-or-restore decision; it does not duplicate issuance and it immediately recovers from a rejected UUID.

## Protected Boundaries

Do not change OAuth callback/handoff components, pending-action semantics, telemetry anonymous ID, route auto-login
activation, UI copy, or backend route shape in this subtask.

## Completion

Complete. Public session parsing and projection are narrow, token ownership is singular, and the process decision is
isolated behind a testable coordinator. The detailed proof is in
[`verification-log.md`](./verification-log.md) and [`exit-evidence.md`](./exit-evidence.md).
