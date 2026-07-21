# Resliced Execution Sequence

```text
complete: 5-0 topology inventory → 5-1 authority/compatibility matrix → 5-3 Bill–Payment cut

current:  C0 Commerce System Model gate (read-only)
              │
              ├── fact-owner ledger + primary sequences
              ├── query/reconciliation boundary decision
              ├── Web cache/read-model characterization
              └── vocabulary/authority conflict resolution plan
              ↓
next:     5-2 Trade admission boundary
              │
              ├── D1 backend entry outcome
              ├── PR lock + create-attempt idempotency
              ├── durable unknown-provider processing (no blind retry)
              └── Bill/Ride category-surface cutover
              ↓
then:     5-4 Rental runtime retirement
              ↓
then:     5-5 RideHailing observation/reconciliation surfaces
              ↓
parallel / later where C0 confirms it: un-numbered Read-model/cache coherence tranche
              ↓
then:     5-6A Core public-surface closure
              ↓
final:    5-7b evidence-backed Phase review

parallel only with external authority: 5-7a deployed provider/callback topology evidence
```

## Why This Order

`C0` does not reorder product work or alter source; it makes the dependencies of the next mutations explicit. `5-2`
remains next as directed. It deliberately excludes Rental retirement so the active RideHailing admission proof is not
confounded by deleting legacy branches in the same create-order surface. `5-4` follows with a clean runtime cut-off.
`5-5` must address the now-observed query/reconciliation boundary, not only deep imports. The un-numbered
read/cache tranche holds confirmed work and remains separated from cosmetic Web splitting. `5-6A` only deletes compatibility paths
after all replacement consumers are proved. Admin composition remains outside the sequence.

## Deferred Backlog, Not Hidden Phase Work

1. Rental data/schema/migration reclamation, if separately authorised.
2. Rental refund/termination migration policy, only if a future environment has historical/live Rental obligations.
3. D3 RideHailing settlement correction / adjustment / refund capability.
4. Generic provider retry, durable outbox, backoff, and operator-recovery workflow.
5. `5-6B` Admin canonical read-contract design and its repository-composition closure.
