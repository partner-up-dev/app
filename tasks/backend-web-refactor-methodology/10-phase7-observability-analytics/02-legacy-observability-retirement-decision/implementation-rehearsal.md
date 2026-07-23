# `7-1` Decision Rehearsal

## Expected Path

1. Re-run the inventory on current `HEAD`.
2. Mark every candidate delete/retain/separate/external.
3. Trace any candidate imported by business control before classifying it.
4. Confirm deployment configuration remains syntactically viable without SLS.
5. Ratify operation-log and future-task decisions.
6. Freeze the `7-2` reference ledger.

## Branches

- **FC requires log configuration:** distinguish provider-required minimal
  configuration from PartnerUp application observability; verify before
  retaining anything.
- **External SLS project is shared:** delete PartnerUp queries/indexes/alerts,
  not shared resources.
- **Logger seam also drives tests:** rewrite tests around observable routing
  behavior rather than preserve a logger abstraction.
- **Console path exposes hidden recovery behavior:** stop and move that behavior
  to its semantic owner before deleting output.
- **Operation-log history has retention value:** retain/export under an
  explicit owner; do not call it observability replacement.

## Stop Conditions

- A bulk search-and-delete has no path classification.
- Cleanup introduces a new logger/signal/exporter.
- A business or provider behavior changes merely to remove output.
- External deletion targets an unidentified/shared resource.
