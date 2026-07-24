# `8-1` Implementation Rehearsal

## Likely Branches

- **Existing PR Port already has the exact operation:** change only imports and
  keep transaction construction private.
- **Projection function needs caller-specific data:** add one query projection
  owned by PR Type Config; do not export the service implementation.
- **RideHailing factory currently closes over persistence dependencies:** expose
  a semantic Port constructor or owner command, not the adapter or executor.
- **Changing the import alters the dynamic cycle:** re-run both static and
  dynamic-inclusive graphs; do not convert the deliberate dynamic import to an
  eager import merely to simplify a diagram.
- **Canonical file carries useful guidance but invalid code:** point the local
  `AGENTS.md` at a small mounted controller or move a compilable exemplar into
  a verification fixture. Do not leave a fake production module.
- **A focused test reveals different lock order or Job creation count:** stop;
  the proposed seam is not behavior-preserving.

## Edit Batches

1. meeting-point owner surfaces and callers;
2. RideHailing semantic Port and Trade caller;
3. canonical exemplar plus fitness fixtures;
4. one integrated verification pass.
