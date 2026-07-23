# `7-4` Classic Sequences

## 1. Current PR Discovery Dashboard Read

1. Analytics user opens `/admin/analytics/pr-discovery`.
2. Shared `AdminAnalyticsPage` switches behavior from `route.name`.
3. Admin-owned query hook calls the Discovery endpoint.
4. Backend validates the Discovery-specific range schema.
5. Query selects raw `user_telemetry_events.payload`.
6. TypeScript parses dimensions, filters rows and builds journey/event sets.
7. API returns the compatibility response.
8. The shared page formats and renders the Discovery panels.

Structural problem: steps 5–6 bypass the governed fact boundary, while steps
2–3 and 8 give one page/Admin module several unrelated owners.

## 2. Target Discovery Fact Read

1. Analytics user opens `/admin/analytics/pr-discovery`.
2. Route-only page composes Admin shell/navigation and
   `PRDiscoverySurface`.
3. Analytics-owned filter model supplies an offset-aware half-open range.
4. Analytics-owned query hook calls the same endpoint with the same query-key
   identity.
5. Shared Analytics controller boundary validates/order-checks/bounds the
   range.
6. Backend Analytics query reads
   `fact_pr_discovery_funnel_event`.
7. PostgreSQL supplies typed Registry fields and deterministic route/auth
   context; no raw payload crosses the fact boundary.
8. The response composer preserves the compatibility DTO/formulas.
9. The Analytics surface renders the existing loading/error/empty/data states.

## 3. Web Event To Discovery Fact

1. User enters `/prd?spm=...`.
2. Router captures incoming SPM into the current browser-session attribution
   state.
3. Router/page workflow emits route context and strict PR Discovery events.
4. Web collector/transport submits the event batch.
5. Backend Event Registry validates name, version, attributes and payload.
6. Accepted events enter the append-only telemetry ledger.
7. `fact_pr_discovery_funnel_event` selects the six allowed events.
8. For each event, the view attaches nearest-prior route/auth context from the
   same journey.
9. SPM/source is available as a typed fact column; malformed/missing context is
   explicit unknown.

This sequence proves attribution transport. It does not yet define which
event/step/source becomes a dashboard attribution metric.

## 4. Target Cross-Unit System Proof

1. Scenario opens the real `/prd` Web route with controlled
   `prType/viewMode/origin` and SPM.
2. Scenario performs a deterministic Discovery interaction.
3. Harness waits for real HTTP ingestion and accepted-ledger persistence.
4. Postgres assertion proves the Discovery fact row and nearest route-context
   SPM.
5. Scenario authenticates through the analytics entry/access path.
6. Scenario opens the real Discovery dashboard route.
7. Existing response/panel dimensions show the emitted Discovery behavior.
8. Scenario confirms route roles, stable test IDs and no inactive dashboard
   fetch.

An SPM/source panel assertion is added only after an attribution formula is
approved.

## 5. Date Validation

1. Client supplies `startAt` and `endAt` with offsets.
2. One controller schema parses both instants.
3. Schema rejects missing pairing, invalid offsets, `startAt >= endAt`, and
   any approved maximum-range violation as 4xx.
4. Query receives decoded instants and applies
   `occurred_at >= startAt AND occurred_at < endAt`.
5. Product-local date bucketing uses an explicit timezone.
6. Response echoes/uses the resolved interval consistently across Overview,
   Create, Join and Discovery.
