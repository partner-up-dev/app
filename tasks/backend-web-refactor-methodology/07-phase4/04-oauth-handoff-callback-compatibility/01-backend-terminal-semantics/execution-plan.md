# 4-3.1 Execution Plan

1. Inspect the application-wide ProblemDetails serializer and route inference before selecting a response helper.
2. Add a focused failing proof for a valid handoff nonce whose persisted user is changed to a non-public role or
   inactive state before exchange. Assert 403/code, ProblemDetails content type, no auth payload/accessToken/
   x-access-token, no-store, and one-shot replay.
3. Add an explicit admission check before a navigation bind success marker is created. Keep direct JSON semantics
   compatible unless its test proves a safe contract extension.
4. Implement the smallest controller-local mapping. Expected handoff failures use the existing global
   ProblemDetails serializer and explicitly suppress the auth middleware response token; direct callback keeps its
   legacy error body, safe status/detail, and the same no-token response policy. Preserve trace recording and
   cookie clearing.
5. Re-run the focused proof and inspect response headers/body for token, code, state, and cache behavior.

## Decision Point

If the global ProblemDetails serializer cannot preserve the Hono RPC response type or legacy body safely, use a
narrow OAuth response adapter with an explicit stable code. Do not refactor the global error system merely to make
this endpoint look uniform.
