# Checkout PaymentTx Cache Convergence

## Status

**Complete.** This Web-only follow-up converges Checkout PaymentTx reads and
terminal invalidation without changing backend or durable product/technical
contracts.

## Objective & Hypothesis

Make TanStack Query the sole Web owner of PaymentTx server-derived state while
preserving the current Checkout UX and D2 behavior.

The confirmed mismatch has two local causes:

1. `PaymentCheckoutFlow` keeps a local PaymentTx snapshot and calls a raw query
   function even though a PaymentTx query adapter/key already exists.
2. terminal reconciliation invalidates target/Bill/order queries and then
   explicitly refetches the same projections, so active consumers can request
   each projection twice.

The smallest convergence is to let the Payment query adapter own imperative
reconciliation and cache seeding, derive Checkout status from its query data,
and use invalidate-driven reconciliation only.

## Ownership And Guardrails

Owned paths:

- `apps/web/src/domains/payment/**`
- directly related `apps/web/src/shared/api/query-keys.ts`, if required
- focused tests for this slice
- this task packet

Protected invariants:

- a browser callback/result never settles payment or becomes server truth;
- only backend PaymentTx `SUCCEEDED` returns to Bill Detail;
- `FAILED`/`CLOSED` return to retryable Checkout;
- a same-session stored hint contains only opaque lookup identity;
- query errors retain the lookup and expose explicit reconciliation retry;
- stale/superseded attempts clear the hint and refresh Checkout projections;
- no backend, Ride, Placement, Rental, or durable-doc mutation;
- preserve all uncommitted 5-3 changes in the shared working tree.

## Intended Request Topology

```text
session hint / charge result
          |
          v
PaymentTx query key + TanStack cache  <--- provider-status HTTP query
          |
          v
Checkout derives UI and next action

terminal result
          |
          v
invalidate target + Bill + Order once
          |
          +-- active projections refetch once
          `-- inactive projections stay stale until consumed
```

## Low-Cost Verification Plan

1. Query-client focused test with real `QueryClient`/observers:
   prime target, Bill, and Order projections; perform terminal invalidation;
   assert each active projection makes exactly one additional request and no
   explicit second refetch path exists.
2. Payment query focused test:
   assert imperative PaymentTx reconciliation writes and reuses the canonical
   query key rather than a caller-owned snapshot.
3. Checkout component focused test:
   mount with a stored hint, observe backend-driven resume, then prove a query
   error retains the hint and the explicit retry uses the same query authority.
4. Static gates: `pnpm check:type:web` and `pnpm check:lint:web`.
5. Existing Checkout scenario:
   `pnpm exec vitest run --project system-scenario \
   tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts \
   -t 'commerce_ride_hailing_ordering_reaches_order_detail_for_active_pr'`.
6. Scoped `git diff --check`; do not run a repository-wide formatter.

## Completion Criteria

- Checkout contains no local PaymentTx server snapshot and performs no raw
  PaymentTx transport read.
- one canonical PaymentTx query key owns mutation seeding, polling, resume, and
  retry snapshots.
- terminal reconciliation uses exactly one invalidate/refetch policy with
  request-count proof.
- focused component proof covers stored-hint resume and query-error retry, or
  any remaining browser-only proof gap is recorded explicitly.
- Web type/lint and the existing Checkout system scenario pass.

## Exit Summary

- `PaymentCheckoutFlow` retains only `reconciliationPaymentTxId` as lookup and
  derives the PaymentTx snapshot from `usePaymentTx().data`.
- charge responses seed the canonical query key; resume, polling, and retry all
  use the query adapter's `reconcile` operation.
- terminal target/Bill/order cache reconciliation uses explicit active-only
  invalidation and contains no explicit `refetchQueries` pass.
- real QueryClient proof observes one additional request per active projection
  and zero additional requests for inactive projections.
- component proof mounts from a session hint, retains it across query failure,
  and retries through the same canonical cache key.
- a literal browser `location.reload` / redirect-return E2E remains unmodeled;
  the component remount seam is focused-proven and the existing system scenario
  still proves the Checkout success journey.
