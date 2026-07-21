# 5-5.2 Web Controlled Observation

## Status

**Complete.** This subtask owns only the Order Detail polling and transient provider-observation cache. Focused
command/cache proof and complete browser/system regression pass; it does not redesign Viewer Bills or checkout
payment reconciliation.

## Plan

1. Keep `useCommerceOrderDetail` a normal TanStack Query for the pure Detail projection.
2. Move active Ride polling to a command adapter that invokes reconcile only when a provider binding exists, waits
   for the command, then uses one exact Detail invalidation (not invalidate plus explicit refetch).
3. While a CreateOrderAttempt is still `PROCESSING` without a binding, use only a bounded pure Detail refresh to
   discover callback progress. It must never resubmit the create command.
4. Store the command's `ProviderObservation` under one dedicated query key or command-owned cache update; pass it
   to the map as transient display data. It cannot replace the Detail execution snapshot.
5. Remove the old assumption that every Detail `GET` advances a Ride state. Existing aliases may be retained during
   this Phase, but new code reads `executionSnapshot` / `providerObservation` by their correct meaning.

## Low-Cost Verification

- query-client test: one active tick produces at most one reconcile `POST` and one Detail `GET`;
- query-client test: invalidation does not add a redundant explicit refetch;
- component/unit test: `PROCESSING` copy remains visible and create/cancel/payment controls stay unavailable;
- browser scenario: callback-free detail refresh does not hit provider create and a later callback transitions the UI.

## Implemented Shape

- `GET /commerce/orders/:orderId` remains the sole durable Detail projection read and has no provider-observation
  side effect.
- A bound active Ride (`providerOrderId` present) takes the `RECONCILE` poll action. It calls the typed
  `POST /orders/:orderId/ride-hailing/reconcile` command, writes its sanitized `providerObservation` to the
  dedicated Commerce query key, then performs one `refetchType: active` Detail invalidation.
- An unbound active Ride (`CreateOrderAttempt` still `PROCESSING`) takes `REFRESH_DETAIL`: it performs only the
  bounded local Detail refresh. It cannot reissue provider create, cancel, or payment actions.
- `RideHailingOrderContent` receives the observation as transient map data. Durable driver/vehicle/status cards
  still render from Detail's persisted execution snapshot.

See [`implementation-log.md`](./implementation-log.md) for file ownership and focused evidence.
