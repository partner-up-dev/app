# C0.1 Decision Record And Open Design

## Proposed Architecture Direction

The target should expose **one explicit Ride execution reconciliation command** used by provider callback, controlled
browser observation, and cancellation preflight. Order Detail becomes a projection of the durable local execution
snapshot plus a clearly named latest provider observation; it must not silently own a state transition merely because
it is served by `GET`.

This does not require an always-on scheduler. The existing callback and a deliberately controlled browser-triggered
reconcile command can remain the observation triggers in a scale-to-zero runtime. It does require single-flight /
monotonic commit semantics and a visible `lastObservedAt`/processing posture rather than ambiguous read side effects.

## Reconciliation Concurrency Decision

Provider-detail reads may be duplicated by a callback and a browser-triggered reconcile. Phase 5 does **not** hold a
database/advisory lock across a provider network request merely to force one read: that would serialize slow external
I/O through Postgres and make the scale-to-zero failure mode worse. The guarantee is instead:

- duplicate provider **observations** are acceptable;
- a stale observation cannot regress the durable execution snapshot;
- terminal settlement capture and Bill consequence are conditional/at-most-once;
- a destructive provider create or cancel requires a durable attempt/claim and is never repeated blindly.

If a later provider contract requires globally serialized observation reads, it needs a separately justified
lease/job design rather than an in-process map or a transaction held over network I/O.

## Why This Is A Gate, Not An Immediate Edit

Two implementation shapes remain to be compared in the source plan:

1. a pure `GET` projection plus a separately invoked reconcile command; or
2. an explicitly documented read-through reconcile operation whose HTTP/query/cache semantics make the write visible.

The first is the current architectural recommendation because it separates command and projection semantics. The
second is only acceptable if it can prove no hidden cache/refetch amplification or ambiguous retry behavior. C0 does
not select a route or persistence schema yet.

## Required Characterization Before Mutation

- duplicate/delayed callback versus delayed detail poll cannot regress a durable phase;
- a provider accepted/create-response-lost branch produces one durable attempt and no second provider create;
- terminal observation commits final settlement once and creates at most one Bill;
- provider-detail failure leaves local execution/Bill state unchanged and returns a controlled retryable result;
- cancellation races with callback without a second destructive provider cancel.
