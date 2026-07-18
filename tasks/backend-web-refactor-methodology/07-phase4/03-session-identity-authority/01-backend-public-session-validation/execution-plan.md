# 4-2.1 Execution Plan

1. Add a User-domain canonical query with a persistence-hiding public identity projection.
2. Move anonymous JWT issuance out of the User command into auth transport/controller code.
3. Add an async public resolver while retaining the generic claim resolver for the separate admin middleware.
4. Make `/auth/session` use the query for UUID-only anonymous recovery and preserve a valid resolved bearer.
5. Cover disabled, missing, operator-only, upgraded and UUID recovery branches through focused tests.

## Result

Steps 1–4 were implemented without exposing the repository beyond User ownership. The focused scenario covers
disabled, upgraded, operator-transition and UUID branches; classifier coverage supplies the missing-row/null
classification rule. No admin middleware mutation was needed.
