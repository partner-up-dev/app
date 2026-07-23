# `6-3.1e` Rehearsal

- **Manual winner.** Authorize a READY requester before refreshing temporal
  state. If temporal refresh wins first, the manual bridge observes READY and
  makes no duplicate task. Otherwise the bridge locks the PR, generates a new
  `readyCycleId` within that transaction, writes READY, filters the
  transaction-local active roster through Notification-owned user/OpenID/
  `PR_READY` credit facts, and creates generic recipient Jobs. Commit exposes
  all facts; any recipient write failure exposes none.
- **Temporal winner.** A strong read or participant command reaches temporal
  refresh. Its named port rechecks OPEN, participation policy and join-lock
  after the PR row lock. It cannot commit READY, emit `pr.auto_ready`, or
  start an activation path if generic fan-out failed. Eventual reads may still
  swallow a refresh error, but never a split READY-without-task state.
- **Concurrency/retry.** Manual and temporal entrants serialize on the PR
  row. The loser observes the committed READY and returns it without a second
  cycle. A serialization retry regenerates an uncommitted UUID only inside the
  new attempt; no abandoned cycle or Job becomes visible.
- **State changes after commit.** READY → ACTIVE keeps the same cycle and lets
  a delayed task send. READY → another state makes it skip. If a manual
  compatibility path later re-enters READY, it writes a different cycle, so a
  stale task cannot revive merely because status again says READY.
- **Eligibility timing.** Source time determines whether a recipient task
  exists (active participant, active user, OpenID and available PR_READY
  credit). Dispatch rechecks current preference/credit, user, membership,
  status and cycle before provider I/O or consumption. Final generic credit
  consumption preserves stored preference; known provider permission
  revocation clears both.
- **Compatibility.** Legacy rows retain their concrete decoder and historical
  coupled-credit/delivery behavior only while draining. The generic path does
  not create an Opportunity or delivery row and does not reuse legacy
  timestamp dedupe.
