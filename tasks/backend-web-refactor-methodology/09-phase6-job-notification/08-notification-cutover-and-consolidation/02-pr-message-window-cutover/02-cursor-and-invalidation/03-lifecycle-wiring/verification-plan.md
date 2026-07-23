# `6-3.2b-3` Verification Plan

## Lowest-Cost Proof Per Child

| Child | First proof | Escalation only if needed |
| --- | --- | --- |
| 01 participant release | focused unit/transaction-port wiring plus one real-Postgres affected-recipient/rejoin scenario | all four entrances in one matrix scenario |
| 02 terminal fences | context unit test for `PR_TERMINAL` plus one manual/temporal real-Postgres scenario | runner/dispatch integration when a stale job is involved |
| 03 admin delete | real-Postgres tombstone/root-delete rollback-oriented scenario | controller route scenario only if the use case cannot be invoked with real persistence |
| 04 subscription/provider | controller unit/route shape plus existing b2 option-lock scenario | real generic `43101` channel outcome |
| 05 promotion | reverse-edge `rg`, focused suites, then full backend scenarios/static gates | no new behavior work during this child |

## Matrix Invariants

1. A removal releases only the recipient removed at that transition; rejoin
   never causes historical replay.
2. A terminal transition releases all current recipients, refuses a new source
   window, and makes a pre-existing job skip before provider I/O.
3. Tombstone preserves acknowledgement cursor while hiding the row and
   releases the relevant held window atomically.
4. Root delete captures recipients before cascade and cannot leave a newly
   created held window on a survivor.
5. PR_MESSAGE clear and generic `43101` share the same Notification option
   mutation; re-enable opens no historical window, while a later message opens
   one fresh generation.
6. No changed lifecycle source imports Job or writes legacy PR-message
   inbox/wave/opportunity/delivery/concrete-job state.

## Required Final Gates

- focused backend unit and real-Postgres scenario suites for changed children;
- `pnpm test:scenario:backend` and `pnpm test:unit:backend`;
- `pnpm check:type:backend`, `pnpm check:lint:backend`, and
  `pnpm check:build:backend`;
- `git diff --check` and a targeted reverse-edge audit;
- durable-doc current/target truth only after proof, never as a substitute for
  it.
