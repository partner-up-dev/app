# `8-5` Implementation Rehearsal

## Likely Branches

- **The four-node SCC is only barrel-induced:** import a focused leaf/query
  contract while retaining the existing owner implementation.
- **The pure Bill payment-state derivation is owned in the wrong module:** move
  only the pure value function to the semantic owner; do not move persistence
  or command coordination to break a graph.
- **Breaking the eager SCC expands the dynamic Port:** reject the trade; a
  smaller graph is not worth a shallower public API.
- **`dispatchBinding` is immutable order evidence:** name that owner and make
  projections consume it.
- **`dispatchBinding` is derived/cache data:** identify the canonical input and
  remove only the duplicate writer/reader after parity proof.
- **Data is insufficient to distinguish those meanings:** record a decision
  request; do not edit durable truth or schema.
- **A request-count smell appears during tracing:** capture a separate
  measurement plan; do not expand this slice.

## Edit Batches

1. query/value dependency narrowing;
2. graph and behavior proof;
3. `dispatchBinding` characterization;
4. source or durable reconciliation only after the characterization result.

## Observed Branch And Resolution

Removing the four-node Trade/Bill SCC revealed a nested three-node
RideHailing cycle in the dynamic-inclusive graph. The cycle was not evidence
that provider isolation should be removed: two dynamic imports still prevent
provider execution and reconciliation composition from loading on the
ordinary Port path. The actual return edge was type-only.

The smallest coherent repair moved
`RideHailingTerminalSettlementObservation` and
`RideHailingReconciliationTransactionPort` to the stable RideHailing contract
owner, retained compatibility type re-exports from `ports.ts`, and left both
dynamic imports intact. The final static and dynamic-inclusive graphs are
acyclic.
