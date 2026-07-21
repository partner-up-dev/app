# 5-6A.3.4 — RideHailing Reconciliation Transaction Boundary

## Status

**Complete.** The initial category cut moved Trade's provider-create/cancel needs behind a narrow RideHailing
dispatch Port. Reconciliation now has an explicit RideHailing-owned atomic boundary rather than a concealed
three-repository import; focused characterization, backend scenarios, and system scenarios pass.

## Fact Owner And Objective

RideHailing owns provider observation, monotonic execution-phase reconciliation, and the decision to capture a
provider final fare. Trade owns order state, choice-set resolution, and provider-reported cancellation transition.
Bill owns final charge-line materialisation. The objective is to let RideHailing own the *coordination* without
publishing any owner's persistence API:

```text
provider observation (outside transaction)
  → RideHailing Transaction Port.applyProviderObservation
      locks Trade → Ride
  → optional provider final-fare query (outside transaction)
  → RideHailing Transaction Port.commitTerminalSettlement
      locks Trade → Ride → Bill consequence
```

The Port has exactly two semantic operations:

1. `applyProviderObservation`: validate the expected provider binding under lock, merge phase/driver/vehicle facts,
   resolve the one provider-confirmed choice-set candidate, and close/promote Trade state when required.
2. `commitTerminalSettlement`: validate the same binding under lock, persist the first terminal final-fare input,
   materialise the first final Bill, or return an explicit `correctionRequired` seam when a later provider amount
   differs.

## Explicit Non-Goals

- Do not move provider detail, geometry, fare, create, cancel, or callback HTTP I/O inside a transaction.
- Do not put cancellation claim/completion or create-attempt completion into this Port: those flows have different
  serialisation keys and remain their current owner-local protocols.
- Do not create a generic `withCommerceTransaction`, event bus, shared repository facade, or an Ecommerce domain.
- Do not implement compensating adjustment/refund while D3 remains deferred. The current outcome is explicit
  `correctionRequired`, never a silent rewrite.

## Public Shape And Private Adapter

`domains/ride-hailing/ports.ts` exports the narrow structural type. The RideHailing-private sync use case constructs
its private adapter `adapters/ride-hailing-reconciliation-transaction.ts`, the sole Phase-5 exception allowed to
import the three repositories. Its method inputs/outputs contain only identifiers, expected binding facts,
provider-derived observation/fare values, and semantic outcomes; no `RepositoryExecutor`, Drizzle row,
Trade/Ride/Bill entity, raw provider payload, or debug context appears in the Port contract.

The sync use case retains protocol orchestration and provider I/O. It must consume the locked `effectiveExecutionPhase`
returned by `applyProviderObservation`, rather than derive a later decision from a stale pre-lock Ride row.

## Exit Evidence

1. AST/text negative check: sync has no `db`, executor, or Trade/Ride/Bill repository import; context has only its
   own Ride/Provider reads; only the named private adapter carries three-repository coordination.
2. Typecheck, full lint, and backend build pass.
3. Ride callback, cancellation, provider-unknown create replay, complete backend scenarios, and active browser
   ordering/system scenarios pass.
4. A focused characterization test proves `sync → port.applyProviderObservation → provider final-fare query →
   port.commitTerminalSettlement`, and proves the post-lock effective phase controls the subsequent provider query.

See [`rehearsal.md`](./rehearsal.md) for the branch simulation and rollback conditions.
