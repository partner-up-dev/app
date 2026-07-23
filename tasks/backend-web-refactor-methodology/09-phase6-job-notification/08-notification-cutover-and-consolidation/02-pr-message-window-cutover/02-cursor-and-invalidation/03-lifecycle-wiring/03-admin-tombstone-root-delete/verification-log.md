# `6-3.2b-3.3` Verification Log

## Focused lifecycle proof

`pnpm test:scenario:backend -- apps/backend/tests/pr/pr-admin-message-window-lifecycle.scenario.test.ts`
completed successfully on 2026-07-22. The scenario project currently expands
the command to its whole backend-scenario set; all 41 files / 133 tests passed.

The new admin lifecycle scenarios prove:

1. An admin message delete hides the row from the visible thread, retains the
   tombstoned row as acknowledgement-cursor high-water, and transitions the
   corresponding generic held window to `CANCELED + RELEASED`.
2. A repeated delete remains `404` because the visible-only lookup excludes
   the tombstone.
3. An injected Notification release failure rolls both tombstone and root
   deletion back, leaving the source message / PR visible.
4. Root deletion releases the retained generic Job row before cascade removes
   the PR and messages; the Job has no PR foreign key and is therefore still
   observable as `CANCELED + RELEASED`.

## Static validation

Targeted Oxfmt check passed for the transaction, its two admin use-case
callers, and the new scenario file. Backend typecheck is intentionally
re-run in the final lifecycle matrix because the concurrently active terminal
fence slice was changing the shared PR-message dispatch union at this point.
