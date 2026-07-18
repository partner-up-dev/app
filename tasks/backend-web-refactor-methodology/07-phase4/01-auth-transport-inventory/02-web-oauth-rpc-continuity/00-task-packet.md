# 4-0B — Web OAuth, RPC And Continuity Map

## Status

Complete. See [`continuity-map.md`](./continuity-map.md) for the value-edge classification, browser truth inventory
and coverage gaps.

## Owned Question

Map the public-user Web continuity path across RPC transport, session storage/store, bootstrap, OAuth login/handoff,
route auto-login, share/telemetry guards and pending-action callers.

## Non-Goals

No UI, composable, router, storage, telemetry or pending-action mutation. Do not infer a runtime edge from a type-only
or constant-only import.

## Required Evidence

- runtime/type/constant SCC edge classification;
- session/token persistence and invalidation sequence;
- handoff ordering and route/query handling trace;
- focused unit seam inventory and open questions for synthesis.
