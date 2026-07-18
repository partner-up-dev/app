# 4-2 Out-of-Scope Observations

## OAuth Navigation Operator Error Semantics — Input To 4-3

A read-only integration review found that navigation OAuth callback can create its handoff cookie and redirect before
the handoff endpoint calls the public issuer. If that current user is operator-bearing, the issuer rejects it and the
handoff handler currently reaches the global `500` path. This does not mint a public operator token; the same broad
error shape existed for an invalid anonymous callback path.

This is not a reason to widen 4-2: it concerns callback/handoff failure semantics and must be decided with topology
and mock-provider proof in `4-3`. Its lowest-cost future probe is a mock OAuth operator-role handoff request that
asserts no access token is returned and records the selected failure response.

## Still-Deferred Admin Bearer Validation

Public bearer validation now checks current persisted state. Admin middleware deliberately retains its independent
claims-only resolver until a named operator-session slice defines validation/revocation behavior. Do not infer that
public-session proof covers operator bearer lifetime.
