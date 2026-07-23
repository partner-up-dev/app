# `6-3.2b-3.1` Rehearsal

- If a removal currently mutates through a global repository outside a
  transaction, first move only that action into a named PR transaction. Do not
  make a generic transaction framework or rewrite the action's full workflow.
- Lock the PR before the released slot. Snapshot the user ID while it is still
  active; call Notification release before commit. A post-commit background
  call is invalid because a failure strands the reservation.
- The existing b2 invalidation factory was writer-injected for local testing.
  Before PR can use it, Notification must provide the curated
  executor-injected factory and construct its own transaction-bound Job writer
  internally. Do not solve this by importing `infra/jobs` from PR or exposing a
  Job-writer parameter on the PR-facing factory.
- The content-conflict adapter already owns a PR transaction. Extend that
  transaction rather than creating a nested one.
- A source that races exit has the b2 PR/roster lock boundary. The new removal
  path must use a compatible order, or the scenario must expose and resolve a
  deadlock rather than hiding it with retry.
- A rejoin is future eligibility only. The test fails if it schedules/delivers
  a message that predates rejoin; it may schedule only after a later message.
