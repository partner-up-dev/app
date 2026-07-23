# `6-4` Verification Plan

## Evidence And Contract Checks

| Claim | Verification |
| --- | --- |
| provider request shape is official | first-party contract review plus adapter capture asserting `order_id` and absent allowances |
| settlement/Job cannot split | named RideHailing adapter writes the exact BillLine transition and Job through one `db.transaction`; the generic transaction-bound writer has real-Postgres rollback proof |
| duplicate callback creates one Job | exact-payment replay scenario plus serialized creation-key lock and the partial unique index on `(job_type, creation_key)` |
| zero-charge creation cannot miss handoff | all-zero final Bill creation fixture produces one Job without callback |
| handler reloads current binding | payload-reference tests for stale/missing order and provider binding |
| provider I/O stays outside settlement | source boundary plus scenario assertion that the provider call count remains zero until JobRunner executes |
| transient failure uses generic retry | focused handler classification plus generic JobRunner retry/recovery proof |
| exhausted/permanent failure stays generic | focused handler/runner disposition tests with no RideHailing business status |
| Job is business-semantic-free | dependency/vocabulary assertion for no UNKNOWN/reconciliation Job state |
| historic rows are untouched | forward-only migration and source audit add no backfill Job or confirmation state |
| no ad-hoc O11y is introduced | no fee-confirmation console/stdout path; DB Job state remains authoritative for execution |

## Evidence Calibration

The exit proof does not claim a fee-specific `Promise.all` race test or
per-write fault-injection harness. Those would duplicate guarantees already
owned by the serialized `ONCE_PER_CAUSE` writer, its database uniqueness
constraint, the caller-owned transaction topology and the generic
transaction-rollback scenario. They remain optional hardening tests, not
missing Phase 6 architecture.

## Gate Order

1. `6-4a` preserves official provider evidence and explicit risk decisions;
2. provider form/error unit tests;
3. transaction/concurrency/zero-charge integration tests;
4. generic handler retry/permanent/stale-reference tests;
5. forward-migration no-backfill fixture;
6. `pnpm check:type:backend`, `pnpm check:lint:backend`,
   `pnpm test:unit:backend`;
7. `pnpm test:scenario:backend` and `pnpm check:static` before exit.

No real fee-confirmation provider mutation is authorized merely by local test
completion. Any deployed smoke needs a separate operator-approved safe order.
