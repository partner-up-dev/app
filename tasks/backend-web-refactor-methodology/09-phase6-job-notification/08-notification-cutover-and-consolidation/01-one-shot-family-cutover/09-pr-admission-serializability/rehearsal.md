# `6-3.1c-2` Rehearsal

- The direct-join transaction checks existing active membership first so retry
  remains idempotent. It checks capacity and queue priority only for a new
  admission. A newly observed own PENDING slot is not converted by an ad hoc
  direct write; it retains queue priority and awaits the promotion path.
- The adapter runs at `SERIALIZABLE`, locks its PR row, then locks only the user
  who will become active. It evaluates every current pending candidate using
  transaction-local reads. This avoids a pre-lock "ineligible evidence" list
  becoming a license to bypass a candidate whose facts have changed.
- All covered active-add paths acquire locks in the same PR → selected-user
  order. A serialization failure retries the whole short transaction before
  any post-commit effect, with a bounded eight-attempt short backoff so several
  different PRs publishing through one creator do not exhaust their fresh
  snapshots immediately; business rejection and non-serialization errors do
  not retry.
- Waitlist entry uses the same PR protocol so a PENDING row cannot appear
  between direct admission's queue scan and commit. Cancellation/release may
  still race, but a serializable admission observes a valid ordering or retries
  rather than overfilling capacity.
- The transaction must not hold the PR row while sending a provider request,
  scheduling a Notification, expanding capacity, or logging.
- A publish transaction makes creator assignment when needed, DRAFT-to-OPEN,
  creator slot insertion and reliability delta commit together. System
  `create-open` has no creator and remains outside this creator-admission path.
- If a promotion task write fails after a prior release, this slice does not
  pretend the release is recoverable. The content-edit trigger reduces an
  uncovered release entrance, but process death between release and promotion
  remains its own Job-backed recovery decision rather than permission for
  direct join to bypass the pending queue.
