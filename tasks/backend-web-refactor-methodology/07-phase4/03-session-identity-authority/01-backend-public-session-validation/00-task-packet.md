# 4-2.1 — Backend Public-Session Validation

## Owned Paths

- `apps/backend/src/domains/user/queries*` and the User-domain public query surface;
- `apps/backend/src/domains/user/use-cases/register-anonymous-user.ts`;
- `apps/backend/src/auth/middleware.ts` and narrow auth contracts as needed;
- `apps/backend/src/controllers/auth.controller.ts` and public response-issuance seams;
- focused User/auth tests under `apps/backend/src/**` and `apps/backend/tests/auth/**`.

## Exact Outcome

Public bearer identity is derived from a persisted active public user projection, not stale JWT role claims. The User
domain creates anonymous rows but does not mint JWTs. `/auth/session` restores only anonymous UUIDs when no valid
public bearer already provides identity.

## Non-Goals

No admin middleware redesign, schema migration, OAuth callback/cookie/query change, provider behavior, or generic
repository export.

## Completion

Complete. The `queries.ts` category is the User-domain public surface for current public identity; Auth owns public
JWT issuance and `/auth/session` recovery. The detailed proof is in
[`verification-log.md`](./verification-log.md) and [`exit-evidence.md`](./exit-evidence.md).
