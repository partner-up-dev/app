# `6-3.1c-2` Plan

1. **Complete.** Extract a reusable PR admission-eligibility evaluation whose reads can run
   through a supplied transaction executor. It must cover active-user state,
   time conflict, join gates and PR-type participation frequency; promotion
   then stops silently omitting the last rule.
2. **Complete.** Add the named PR admission adapter with a bounded retry only for PostgreSQL
   serialization failures. Its lock order is PR row, then the selected active
   entrant's user row, then slot/reliability/status work. It re-reads capacity,
   duplicate active/pending membership and queue eligibility inside the
   transaction.
3. **Complete.** Move direct join's create/reactivate path and waitlist entry's pending-slot
   write to that adapter. Existing outer checks remain fast feedback only;
   their transaction-local recheck is authoritative. Keep reconciliation,
   expansion, operation log, Notification and alternative-source closure after
   commit.
4. **Complete.** Move the promoted-candidate transaction onto the same eligibility/lock
   protocol without moving provider or post-commit side effects into it. Make
   reliability delta an atomic SQL update.
5. **Complete.** Make publication commit the creator identity when needed, OPEN transition,
   creator slot and reliability delta together. Preserve intentional system
   creatorless `create-open` behavior.
6. **Complete.** Add the missing content-edit capacity-release promotion trigger without
   claiming crash-safe release-to-promotion recovery.
7. **Complete.** Add real Postgres race/priority/visibility proof and verify all touched PR
   paths through focused scenarios plus backend type/lint/build.

## Cheapest Credible Proof

First prove the adapter result with two concurrent direct admissions against a
single remaining place. Then run the HTTP-level scenario with an eligible
waitlisted user and a competing direct join; prove the candidate is active and
the direct request cannot consume that place. Use real Postgres transactions:
mocks cannot demonstrate `FOR UPDATE` or serializable retry behavior.
