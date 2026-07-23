# `6-3.1f-03` — PR-Content Atomic Source

## Status

Locally complete. `6-3.1f-01` and `6-3.1f-02` are locally complete; this
first real source cutover has focused and full backend unit/scenario proof.
It remains uncommitted alongside the rest of Phase 6 work.

## Objective

Replace the PR-content family’s post-commit concrete scheduler with a
PR-owned source transaction that binds the actual core PR write and generic
meeting-point task fan-out.

## Scope

- Admin and user content paths converge through the existing PR command; they
  must therefore share one source bridge.
- The bridge locks/rereads the PR, observes effective before/after values,
  writes the requested core fields and cache invalidation, creates source
  event facts inside the committing transaction, freezes active candidates and
  invokes Notification.
- If a time edit has already been preflighted to require participant release,
  the corresponding PR-owned slot-state writes, capacity validation and
  status recalculation join this same named content transaction. This keeps a
  failed Notification handoff from leaving released slots behind a rolled-back
  core PR mutation, and ensures the frozen recipient roster excludes them.
- Preserve existing validation and user-visible content behavior. Do not turn
  this into a general rewrite of all historical PR-content side effects.

## Boundary Constraint

`updatePRContent` currently mixes validation, temporal refresh, participant
release, reminder reconciliation, status work, messaging and alternative
notifications. The bridge protects the core row/cache mutation, generic task
fan-out, and only the PR slot/status writes inseparable from a preflighted
time-conflict release. Reminder cancellation/reconciliation, waitlist
promotion, persisted PR messages and alternative reminders remain explicit
post-commit effects because their current APIs/repositories are not
transaction-bound. Do not introduce a catch-all transaction callback or claim
whole-command atomicity.

## Exit

For an effective content change, the protected core PR mutation and all source
eligible generic meeting-point tasks commit or roll back together. A direct
writer-failure proof leaves the target core field (and any preflighted release
state) unchanged and creates neither generic Jobs nor legacy creation rows.
