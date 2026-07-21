# 5-5.2 Implementation Log

## Source Ownership

| Area | Change | Authority preserved |
| --- | --- | --- |
| `shared/api/query-keys.ts` | Adds `commerce.rideHailingObservation(orderId)` | a single named cache address for the transient projection |
| `domains/commerce/queries/ride-hailing-reconciliation.ts` | Owns typed reconcile command, Problem Details mapping, cache write, and exactly-one active Detail invalidation | provider observation remains command output; Detail remains durable state |
| `domains/commerce/queries/useCommerce.ts` | Selects `RECONCILE` / `REFRESH_DETAIL` / `STOP` and prevents overlapping ticks | no Detail read is promoted into a provider write trigger |
| `CommerceOrderDetailPage` / `RideHailingOrderContent` | Passes transient observation only to the map surface | page/UI do not call RPC or hold a second durable snapshot |

## Rehearsed Branches

1. Active, bound Ride: a tick starts one reconcile mutation; while it is pending, later ticks skip. Successful
   mutation sets the observation cache and invalidates the active Detail query exactly once.
2. Active, unbound `PROCESSING` attempt: a tick refreshes only Detail. There is no create mutation in this path, so
   response-loss recovery waits for callback/reconciliation rather than duplicating provider create.
3. Terminal/non-Ride detail: polling stops; cached transient geometry cannot alter the durable terminal projection.
4. Reconcile failure: no cache authority changes; a later bounded active tick may retry observation, while no
   database or browser retry loop recreates an order.

## Focused Evidence

- `ride-hailing-reconciliation.test.ts`: an active Detail observer receives exactly one invalidation refetch after
  one reconcile POST, and the disabled transient observer sees the command-owned observation cache write.
- `useCommerce.test.ts`: verifies the three poll actions for unbound `INITIATING`, bound active, and terminal Ride
  detail snapshots.
- `pnpm --filter @partner-up-dev/web exec vitest run src/domains/commerce/queries/useCommerce.test.ts src/domains/commerce/queries/ride-hailing-reconciliation.test.ts`: 4 assertions passed.
- `pnpm check:type:web` and `pnpm check:lint:web`: passed. The naming audit retains two pre-existing report-only
  `RideHailing*Content` findings.
- The focused system Ride journey is the remaining browser-level regression proof at the time of this entry.
