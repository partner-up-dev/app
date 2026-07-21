# 5-5.1 Reconciliation Command And Pure Projection

## Status

**Complete.** This subtask made the semantic cut from a side-effecting Order Detail `GET` to an explicit,
authenticated reconciliation command and a pure local projection. It does not own provider-create idempotency
(`5-2`) or a generic worker/retry system; the complete scenario/system proof now covers its intended boundary.

## Fact / Owner Boundary

| Fact | Authority | Write trigger | Read surface |
| --- | --- | --- | --- |
| provider order detail / live geometry | provider | callback or controlled browser reconcile | non-authoritative observation returned by the command |
| Ride execution snapshot / selected vehicle | RideHailing durable projection | reconciliation transaction only | pure Order Detail projection |
| terminal final-fare input | provider query, then one local commit | reconciliation transaction only | Bill-target consequence |
| final Bill target | Bill | first committed final-fare consequence | Bill / Order Detail |

## Chosen Shape

1. `POST /commerce/orders/:orderId/ride-hailing/reconcile` is the only browser-triggered provider-detail command.
   It authorizes a participant or creator before remote I/O. Provider callbacks use the same public RideHailing
   command but authenticate at their provider boundary rather than pretending to be a viewer.
2. `GET /commerce/orders/:orderId` performs local repository reads only. It neither calls the provider nor writes
   Trade, RideHailing, or Bill state.
3. The command returns a non-authoritative `ProviderObservation` for the current browser cycle. The Web may keep it
   in a dedicated TanStack cache key for map rendering; it is not a second execution-state authority. The pure
   Detail response exposes the durable `executionSnapshot` (with temporary aliases only where current callers need
   them).
4. A missing provider binding on a durable `PROCESSING` create attempt returns a controlled no-op/processing result;
   it never turns browser polling into provider-create retry. The browser may perform a cheap local detail refresh
   to notice a later callback.

## Concurrency Rule

Provider reads can duplicate. No transaction or advisory lock spans remote I/O. Reconciliation re-locks / conditionally
updates the Ride row only after the observation has returned, applies a monotonic phase rule, and makes terminal
fare + Bill consequence conditional on the locked durable row. A terminal phase never regresses to an active phase;
with no provider ordering version available, competing terminal phases do not overwrite each other. Driver/vehicle
merge is conservative and a later provider-version contract would be a distinct enhancement.

## Mental Rehearsal

| Path | Expected result |
| --- | --- |
| detail refresh while provider is slow | one local read; no provider request and no durable mutation |
| callback and browser reconcile read the same provider state | duplicate reads allowed; one monotonic durable result |
| delayed active observation after `FINISHED` | no execution regression and no second Bill |
| two terminal observations | only first final-fare commit creates/reuses the one Bill target |
| provider query failure | command returns controlled retryable failure; local snapshot and Bill remain unchanged |
| response-lost create with no binding | remains `PROCESSING`; no browser retry of create or blind provider query |

## Cheapest Credible Proof

- pure-detail test spies provider port and asserts zero remote calls / writes;
- focused phase-rank and observation-merge unit tests;
- real-DB fake-provider scenario for callback/poll overlap, delayed observation, and one terminal Bill;
- one browser Order Detail journey verifying controlled command then pure refresh.
