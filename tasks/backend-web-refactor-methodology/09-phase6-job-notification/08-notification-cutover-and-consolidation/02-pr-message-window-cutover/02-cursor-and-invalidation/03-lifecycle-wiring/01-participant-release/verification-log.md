# `6-3.2b-3.1` Verification Log

## Focused Evidence — Complete

- A new real-Postgres scenario proves self exit releases only the exiting
  recipient's generic held window; a concurrent recipient remains HELD.
- Rejoin creates no historical replay. Only a later PR message creates a fresh
  held generation.
- The same scenario covers administrator release. A injected Notification
  hand-off failure rolls membership back.
- Existing content-conflict release scenario remains green after its in-transaction
  exact release hand-off.

## Commands Reported Passing

- `pnpm check:type:backend`
- `pnpm check:lint:backend`
- focused Notification unit suite: 7/7
- new real-Postgres participant scenario: 2/2
- existing content-conflict real-Postgres scenario: 4/4
- focused format check and `git diff --check`
