# 4-4.1 Escalation Boundary

Own `apps/web/src/lib/rpc.ts`, pure auth-required classification, a process-owned response coordinator, `AppRoot`
wiring, and focused tests. Do not change OAuth URL construction, callback/handoff code, Backend routes, or domain
continuation storage.

## Result

Complete. `lib/rpc` now reports a recognized concrete response without importing OAuth/process code; `AppRoot`
registers the coordinator. The coordinator uses response-bound fallback/claim semantics and weak response identity
tracking so completed responses remain GC-eligible.
