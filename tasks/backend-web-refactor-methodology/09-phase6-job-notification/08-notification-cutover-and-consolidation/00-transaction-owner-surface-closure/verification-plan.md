# `6-3.1h` Verification Plan

## Cheap First Proof

1. `rg` reports no production `createTransactionBoundJobWriter` or
   `infra/jobs` import under the three source-domain roots.
2. Focused Notification transaction-factory unit tests prove a writer is still
   bound to the caller's executor by observing unchanged scheduled task facts.
3. Existing representative real-Postgres scenarios prove source commit and
   injected handoff failure rollback for PR-message, admission/ready, and
   meeting-point paths.

## Escalation

Run backend type/lint after the mechanical shape change. Run the full backend
scenario suite only in b3.5 unless a representative regression exposes a
cross-template runtime change.

## Failure Conditions

- a source must import Job merely to create a Notification port;
- a public Notification factory accepts `JobTransactionWriter` as an input;
- a test passes because it no longer exercises an atomic rollback;
- a source calls a runtime owner command after committing instead of using its
  transaction-bound semantic port.
