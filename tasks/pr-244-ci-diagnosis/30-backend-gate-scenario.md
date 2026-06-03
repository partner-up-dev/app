# Backend Gate - Scenario Tests

## Failing Command

`pnpm test:scenario:backend`

CI reports 4 failed files / 7 failed tests.

## Root Cause 1 - Anchor Event Recommendation Payload Drift

Failing tests:

- `apps/backend/tests/anchor-event/anchor-event-recommendation-participation.scenario.test.ts`
- `apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts`

Observed error:

- HTTP expected `200`, got `400`.
- Zod `invalid_union`:
  - branch with `place` is missing `timeWindows`;
  - legacy branch with `startAt` is missing `locationId`.

Current controller contract in `apps/backend/src/controllers/anchor-event.controller.ts` accepts either:

- new shape: `{ place, timeWindows, preferences }`
- legacy shape: `{ locationId, startAt, preferences }`

The failing tests send hybrid payloads:

- location case: `{ place: { kind: "location", locationId }, startAt, preferences }`
- route case: `{ place: { kind: "route", routePoolEntryId }, startAt, preferences }`

Diagnosis: the scenario fixtures are stale after the recommendation API moved to `place + timeWindows`. They match neither current schema branch. The frontend hook already sends `place + timeWindows`, so the narrower repair direction is to update backend scenarios unless product/API compatibility explicitly requires accepting `{ place, startAt }`.

## Root Cause 2 - Trade Domain Scenario Imports Removed Helpers

Failing tests:

- `apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts`
- `apps/backend/tests/ride-hailing/ride-hailing-order-foundation.scenario.test.ts`

Observed errors:

- `TypeError: createRentalOrder is not a function`
- `TypeError: createRideHailingOrderFoundation is not a function`

The tests import these symbols from `../../src/domains/trade`, but the current trade barrel exports only the current model/services/use-cases surface. The current public order creation path is `createOrderCommand`; lower-level branch helpers such as rental and ride-hailing branch creation are internal.

Diagnosis: the scenario tests still target older direct foundation helpers that are no longer exported at runtime. Backend typecheck did not catch this because `apps/backend/tsconfig.json` includes `src/**/*`, not backend scenario tests.

Repair direction has an owner decision:

- If these are intended domain-level foundation contracts, restore explicit helper exports with narrow names and no unintended provider side effects.
- If they were only old test shortcuts, migrate the scenarios to `createOrderCommand` or a current HTTP/domain contract.

The ride-hailing foundation test likely should avoid triggering external provider create side effects, so blindly mapping it to full `createOrderCommand` may change the test's purpose.

## Verification Boundary

- Re-run `pnpm test:scenario:backend`.
- Add a typecheck or focused import guard for backend scenario tests if missing runtime exports should be caught earlier.
