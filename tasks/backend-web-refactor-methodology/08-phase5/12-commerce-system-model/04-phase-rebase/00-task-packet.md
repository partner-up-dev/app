# C0.4 — Phase 5 Rebase

## Objective

Replace a linear list of local fixes with a small set of system workstreams. A workstream owns one fact lifecycle or
read authority; its numbered implementation slices retain bounded source ownership and proof.

## Result

The workstream map in [`workstream-map.md`](./workstream-map.md) now records the completed historical Phase 5
sequence and the remaining external/deferred gates. It originally constrained `5-2` so it did not become a local
patch; it now prevents a later executor from treating completed slices as future work. [`rehearsal.md`](./rehearsal.md)
prevents the model from becoming a large untestable diagram.
