# `6-3` Verification Plan

## Per-Template Matrix

For every Notification template verify:

- typed payload validation;
- timing/creation/dedupe policy;
- current eligibility and render-context query;
- limited/unlimited preference behavior;
- channel binding/rendering;
- success, skip, retryable and permanent result classification;
- current caller imports only the public Notification surface;
- pending legacy payload compatibility.

Also verify the selected handoff class: transaction rollback for atomic-required
families; deterministic reconstruction after injected schedule loss for
recoverable families.

## PR Message Scenarios

1. first message creates one held window;
2. later messages coalesce to max high-water;
3. execution terminality does not release it;
4. stale ACK below high-water is rejected;
5. covering ACK releases it;
6. next message opens a new generation;
7. schedule-first and ACK-first races serialize correctly;
8. message insert rolls back when a required reservation write fails;
9. hidden fetch/hidden document/pre-render state does not ACK, while mounted,
   rendered and visible thread does;
10. failed ACK can retry the same cursor;
11. recipient/PR invalidation cancels/releases without read state and later
    rejoin/new message reopens without absence-period replay.

These require backend concurrency proof plus a real Web → backend → isolated
Postgres system scenario with stable semantic test IDs where UI actions are
involved.

## Migration And Compatibility Checks

- fixtures for current opportunity/wave/inbox rows and pending/retry legacy
  Jobs;
- forward migration applies on representative old state and clean state;
- no source read/write remains before dropping each table/API field;
- delivery/O11y comparison covers 0..N attempts, treating legacy `sentAt` on
  FAILED/SKIPPED as attempt time, but delivery table remains;
- `rg`/structural import ledger finds no business → notification infra edge;
- controller-edge inventory finds no direct concrete schedule/cancel/rebuild
  call outside named compatibility;
- dead-code/config checks find no orphan registration/template config.

## Gate Order

1. focused template unit tests as each family migrates;
2. focused PR-message backend concurrency tests;
3. migration fixtures;
4. `pnpm check:type:backend`, `pnpm check:lint:backend`,
   `pnpm test:unit:backend`;
5. `pnpm test:scenario:backend`;
6. targeted `pnpm test:scenario:system` for visible ACK behavior;
7. `pnpm check:static` and full relevant scenarios before slice exit.
