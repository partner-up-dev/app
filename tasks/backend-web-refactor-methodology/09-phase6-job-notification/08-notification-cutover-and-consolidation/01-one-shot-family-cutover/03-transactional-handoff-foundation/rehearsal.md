# `6-3.1c` Rehearsal

- If a provider call occurs inside the transaction, stop: only Job insertion is
  atomic with source state.
- A promotion attempt begins a short transaction, takes the PR row lock and
  reloads request capacity plus the candidate's still-pending slot. A stale or
  no-longer-eligible candidate exits with no Job.
- After conditional promotion, reliability delta and derived PR status, the
  named Notification adapter writes the generic Job through the same transaction
  writer. A writer exception rolls back all four changes; it does not roll back
  the earlier exit/release which exposed capacity.
- The transaction-bound writer must retain the Job creation-key lock, while the
  PR row lock serializes capacity/FIFO decisions. Neither lock becomes a new
  global locking abstraction.
- After commit, new-partner legacy scheduling, activity/confirmation rebuilds
  and the operation log run separately. If one fails, do not mislabel it as the
  promoted-task atomic proof or try to undo the committed promoted-task pair.
- A pre-cutover promoted Job remains executable under its registered legacy
  handler. The new flow writes only the generic Job; it never schedules legacy
  promoted work.
- This proof does not by itself serialize a concurrent direct join or identify
  a second promotion of a reused slot. Stop and hand off to the named cycle and
  admission successors rather than treating their absence as a retry problem.
