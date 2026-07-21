# Proposed Execution Order

```text
completed: 5-0 → 5-1 → 5-3

superseded execution order; see ../10-rental-fulfillment-scope/
next after source-design gate: 5-2

then: 5-4 Rental runtime retirement → 5-5 RideHailing reconciliation
parallel only with external authority: 5-7a runtime-topology evidence
closure/review only after all retained replacements: 5-6A → 5-7b
```

The prior recommendation serialized `5-4` and `5-5` before `5-2` to avoid concurrent changes to Trade termination
shape and Bill/Payment consequence seams. That integration-cost recommendation is superseded, not a claim that
`5-2` semantically depends on either slice.

## Entry Gates That Remain

| Slice | Gate | Proposed treatment |
| --- | --- | --- |
| `5-4` | runtime cut-off inventory | prove every direct Rental write is rejected/removed and no Order/Bill/provider side effect remains; physical deletion is excluded |
| `5-5` | D3 realization | D3 correction/refund is deferred; define only the non-silent seam/state required to avoid rewriting settled history |
| `5-5` | provider ordering | define monotonic observation / terminal-race behavior before adding or changing writes |
| `5-7a` | runtime authority | obtain named staging/provider target and safe signed-smoke permission; do not infer deployment truth from local fakes |
| `5-2` | source design | retain ratified D1; define create-attempt idempotency and concurrent PR/Offer uniqueness when it becomes active |
