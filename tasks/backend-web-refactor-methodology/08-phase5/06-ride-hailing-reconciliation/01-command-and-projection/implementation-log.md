# 5-5.1 implementation log

- `buildRideHailingDetailProjection` now performs local Trade/Ride reads only; it never creates a provider port,
  queries provider detail, queries live geometry, or mutates durable state.
- `reconcileRideHailingOrder` is the explicit browser command surface. It forces `BROWSER_RECONCILE`, returns the
  sanitized transient `providerObservation`, and omits raw provider detail from the public command result.
- `syncRideHailingOrderWithProvider` remains the shared internal path for callback/cancellation convergence. The
  provider query occurs before the short local transaction; the Ride row is re-read `FOR UPDATE` before phase,
  snapshot, choice resolution, or terminal-order writes.
- Missing dispatch binding on `BROWSER_RECONCILE` returns `outcome: "PROCESSING"` without provider I/O or create retry.

Integration points intentionally left for the root worker: add the authenticated POST reconcile route/controller and
Web trigger; update callback routing only if it should call the public command wrapper. The existing callback handler
and controller were not edited in this worker.
