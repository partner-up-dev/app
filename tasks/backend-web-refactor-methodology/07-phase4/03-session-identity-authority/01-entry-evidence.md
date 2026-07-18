# 4-2 Entry Evidence

## Confirmed Facts

- `resolveRequestAuth` validates JWT signature and expiry but currently trusts `roles` and `sub` without consulting
  persisted user status or role.
- Public routes share `authMiddleware`; admin routes instead use `adminAuthMiddleware`. This makes a narrow public
  resolver feasible without changing the operator transport.
- `UserRepository.findById` already supplies the User domain's current state. The missing abstraction is a
  persistence-hiding public projection, not another repository convenience export.
- `/auth/session` currently reimplements anonymous-user validation while authenticated sessions bypass it.
- Anonymous registration currently reaches back into auth issuance from the User domain, which reverses the desired
  owner direction.
- Web currently stores token in localStorage, role/user ID in Pinia and also token in Pinia. Header rotation updates
  only storage; a fresh bootstrap calls `register/anonymous` and then `/session`, producing duplicate issuance.
- The public store treats every non-anonymous role as authenticated even though admin storage is already a distinct
  client context.

## Evidence-Derived Constraints

- The User domain must expose a canonical query/projection, not `UserRepository` or a Drizzle row.
- Auth middleware may ask that query per subject-bound public request. There is no cache in this slice because
  cache invalidation would recreate the disabled/role-change authority gap.
- Browser recovery must preserve a valid anonymous UUID, immediately replace a rejected UUID with a fresh anonymous
  session, and never use it to elevate an authenticated account.
- A typed callback/handoff body must stay structurally unchanged until `4-3`; 4-2 changes neither query parameters
  nor cookie behavior.

## Entry Branches

| Branch | Chosen handling |
| --- | --- |
| no bearer / no subject | issue or preserve anonymous-without-user transport; no database lookup |
| valid bearer + active anonymous user | preserve or renew anonymous public session |
| valid bearer + active authenticated user | preserve or renew authenticated public session |
| disabled/missing/operator-only/invalid public subject | downgrade request to anonymous-without-user; protected route returns its normal auth failure |
| UUID-only active anonymous revisit | `/auth/session` restores that anonymous session |
| UUID-only stale or authenticated subject | `/auth/session` returns 401; Web clears and registers fresh anonymous in the same bootstrap |
