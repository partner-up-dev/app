# `7-4` Verification Plan

## Claim-To-Proof Matrix

| Claim | Cheapest credible proof |
| --- | --- |
| intended Discovery names/versions/BI usage do not drift | focused `fact-event-references` unit test including all six Registry names |
| migrated SQL view selects the same event family | real-Postgres fixture inserts the Registry event set and asserts the view admits exactly the six intended names |
| malformed historical payload cannot break the fact | real-Postgres fixture with invalid/missing JSON fields and guarded-cast assertions |
| route/auth context is deterministic | same-time and prior/future context fixture proving `(occurred_at, event_id)` tie-break and no future borrowing |
| raw and fact readers preserve current output | one controlled parity fixture covering steps, dimensions, duplicate events, unknowns, half-open range and >100% conversion |
| production Discovery no longer reads payload | scoped structural search plus fact entity/query inspection |
| invalid ranges are client errors | focused controller/API matrix for invalid offset, equal/reversed and over-limit ranges |
| timezone handling is explicit | offset-boundary/lifecycle fixture around a date boundary |
| SQL aggregation is behavior-equivalent | same fixed input through old pure composer and grouped query result, plus targeted query-plan review |
| inactive dashboard routes do not fetch | focused Web route/page test with endpoint-call counts |
| Web move preserves cache and states | query-key/hook tests plus loading/error/empty/refresh component matrix |
| routes/access remain compatible | existing Analytics access System scenario |
| `/bi` does not retain the code | router/entry test asserting successful replacement target has no `code` query |
| real Web behavior reaches the fact/dashboard | one PR Discovery System journey backed by isolated Postgres |
| SPM transport is truthful | System fixture asserts SPM on the fact row, not an undefined dashboard metric |

## Batch Gate Order

### `7-4A`

1. focused existing Backend Analytics unit tests;
2. new characterization tests;
3. focused Web route/page/query characterization;
4. no broad gate until the contract matrix is frozen.

### `7-4B`

1. `pnpm db:lint`;
2. `pnpm db:check`;
3. focused Discovery model + fact-reference unit tests;
4. one real-Postgres Discovery fact/API scenario;
5. scoped zero-raw-reader search.

### `7-4C`

1. focused date schema/filter tests;
2. controller/API boundary scenario;
3. lifecycle timezone fixture;
4. query-specific equivalence/plan test for each aggregation moved;
5. `pnpm test:unit:backend`;
6. `pnpm test:scenario:backend`.

### `7-4D`

1. filter/presentation model unit tests;
2. query-hook test;
3. one focused surface/page test per route cut-over;
4. existing Analytics access scenario;
5. `pnpm test:unit:web`.

### `7-4E`

1. focused new PR Discovery System scenario;
2. `pnpm test:scenario:system`;
3. `pnpm check:static`;
4. canonical Backend/Web unit and Backend/System scenario gates on the final
   Phase revision.

## Reproducible Structural Checks

```bash
rg -n "userTelemetryEvents|factPR.*Funnel|fact_pr_.*funnel" \
  apps/backend/src/entities apps/backend/src/infra/analytics apps/backend/drizzle

rg -n "prDiscoveryEvent|PR_DISCOVERY_EVENT_NAMES|pr_discovery_.*:" \
  apps/backend/src/infra/telemetry apps/web/src/shared/telemetry

rg -n "instantDateTimeSchema|startAt.*endAt|analyticsAuthMiddleware" \
  apps/backend/src/controllers/analytics.controller.ts \
  apps/backend/src/infra/analytics

rg -n "admin-analytics|data-testid=\"admin-analytics" \
  apps/web/src/app/router.ts apps/web/src/pages \
  apps/web/src/domains/analytics tests/scenario/admin

test ! -e apps/web/src/pages/AdminAnalyticsPage.vue
test ! -e apps/web/src/domains/admin/queries/useAdminAnalytics.ts
```

Focused and canonical results are recorded in
[`verification-log.md`](./verification-log.md) and the `7-5` verification log.

## Widening Rule

Run the narrow test that can falsify the changed responsibility first. Widen
only after it passes, or when a failure cannot be localized within that
boundary. A build-only result cannot close fact, formula, route or cross-unit
behavior.
