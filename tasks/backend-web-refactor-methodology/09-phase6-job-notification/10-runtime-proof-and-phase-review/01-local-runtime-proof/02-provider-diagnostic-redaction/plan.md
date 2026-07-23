# `6-5.1b-2` Plan

1. Inventory every CaoCao stdout call, including failure/query/estimate and
   route-success paths.
2. Remove the diagnostic helpers and every call site without changing request,
   response parsing or error mapping.
3. Capture stdout in failed and successful adapter tests and assert no write.
4. Run focused provider tests, backend type/lint and a zero-reference search.

## Cheapest Credible Verification

One captured-stdout failure test and one route-query success test prove absence
without an external provider or SLS access.
