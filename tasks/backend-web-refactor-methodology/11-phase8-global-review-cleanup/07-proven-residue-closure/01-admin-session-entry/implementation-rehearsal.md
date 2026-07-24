# `8-6.1` Implementation Rehearsal

1. Preserve `useAdminLogin` as the transport/query owner.
2. Add a narrow Admin session-login use case that invokes the mutation and
   applies the inferred response to `useAdminSessionStore`.
3. Migrate both `AdminLoginPage` and `BIEntryPage` so there is no second
   session-application sequence.
4. Keep redirect selection in each page because it is route context.

If the BI error fallback differs from ordinary login, normalize response
decoding in the query owner rather than recreating transport handling in the
page.
