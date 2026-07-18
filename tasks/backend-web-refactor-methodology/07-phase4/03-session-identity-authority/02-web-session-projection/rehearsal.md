# 4-2.2 Rehearsal

- Fresh storage: one `register/anonymous`, one full projection, zero `/auth/session` call.
- UUID-only storage: one `/auth/session`, same UUID projection on 200.
- UUID-only 401: clear all public keys, one registration, new projection, no retry loop.
- Existing token 200: full response overwrites role/user projection; rotated header stays in token storage.
- Legacy public storage holding a service/analytics role is treated as anonymous and cannot make `isAuthenticated`
  true.

## Observed Outcome

The coordinator tests exercised each planned ordering branch. Storage tests prove an incoming operator payload clears
public state instead of creating an authenticated public projection; the system scenario then exercised actual
anonymous restore and replacement.
