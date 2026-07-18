# 4-2 Decision Record

## D-1 Public Identity Boundary

`service` and `analytics` are operator roles only. A public browser session is either `anonymous` or
`authenticated`; a row containing an operator role is not admitted to the public context, including if it also has
an authenticated role. This removes the ambiguous “any non-anonymous role” predicate and follows the durable
separation of admin and user sessions.

## D-2 Current-State Validation Owner

The User domain exposes a canonical query that maps a `UserId` to a narrow public identity projection or `null`.
It owns `ACTIVE` status and public-role classification. Auth transport owns JWT verification, renewal and issuance;
the public middleware invokes the query before making a subject-bound request identity available. Controllers do
not import the User repository to make that decision.

## D-3 Issuance And Recovery

Auth transport issues public JWTs from the canonical projection. Anonymous registration returns a created user
identity to the controller rather than a JWT from the User domain. `/auth/session` accepts a body UUID only for
anonymous recovery. A valid bearer-derived identity takes precedence and is not reissued unnecessarily.

## D-4 Browser Projection

Browser storage is the sole token projection. The public Pinia store owns only role and user ID; it applies a full
session payload or clears it. The auth process makes the register-or-restore decision once, so a fresh registration
does not immediately call `/auth/session`, and a 401 stale UUID recovers once in the same bootstrap.

## Compatibility Windows

- Operator token revalidation remains in the separate admin context and must be addressed by a named later slice.
- OAuth callback/handoff retains its established topology. Its direct issuer now applies the same public-role
  boundary, but `4-3` owns callback/handoff structure and error semantics; `4-2` changes no redirect, cookie, nonce
  or query behavior.
- Telemetry's device-scoped anonymous ID remains independent from the backend anonymous-user UUID.
