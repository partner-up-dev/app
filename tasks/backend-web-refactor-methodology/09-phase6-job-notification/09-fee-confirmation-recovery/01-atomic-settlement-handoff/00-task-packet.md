# `6-4b` — Atomic Settlement Handoff

## Status

**Locally complete on 2026-07-23.**

## Objective

Create one causally keyed generic Job in the same narrow qualifying settlement
transaction, including zero-charge Bill creation.

## Scope

- exact payment tuple/all-charge handoff plus zero-charge auto-settlement;
- one `ONCE_PER_CAUSE` Job per qualifying settlement cause; and
- exact-replay, transaction-rollback, serialization and database-uniqueness
  proof.

## Non-Goals

- no provider I/O;
- no generic Commerce transaction executor; and
- no operator UI or historic-row replay.

## Exit

Every qualifying settlement either atomically creates its Job or commits
neither; provider I/O remains outside the transaction.
