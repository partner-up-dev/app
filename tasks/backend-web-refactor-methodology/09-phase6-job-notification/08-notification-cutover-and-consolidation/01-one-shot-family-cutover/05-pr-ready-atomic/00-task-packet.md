# `6-3.1e` — PR-Ready Atomic Vertical

## Status

**Locally complete.** The topology, causal identity, compatibility boundary and
focused proof matrix are implemented and verified in
[`verification-log.md`](./verification-log.md). This remains one atomic family
vertical, not a general PR-state-machine or Notification-retirement slice.

## Objective

Migrate `pr.ready` through the named transaction bridge for both manual and
temporal status transitions. A PR gains a durable `readyCycleId`: a later
READY/ACTIVE observation alone is insufficient to prove which READY entry
created a delayed task.

## Scope And Boundary

- The manual status command and temporal join-lock refresh are the only new
  source writers. Admin status mutation reaches the same manual command.
- PR owns the READY transition and its durable cycle; Notification owns
  source-time recipient eligibility, private Job policy, rendering, current
  preference/credit checks and provider/channel work.
- This slice deliberately preserves the current manual status endpoint's
  broad compatibility behavior. Any actual non-READY → READY manual mutation
  receives a new cycle; a READY → READY request is idempotent. A complete
  lifecycle-state graph redesign needs its own product and route contract.
- A manual READY request nevertheless authorizes its creator before temporal
  refresh, so an unauthorized caller cannot cause an auto-READY side effect
  before receiving `403`.
- No new source write may create `notification_opportunities` or a concrete
  `wechat.notification.pr-ready` Job. The old handler and recipient-prefix
  cancellation remain a pending-row drain only.

## Exit

The actual READY transition, persisted `readyCycleId`, exact source-eligible
recipient set and recipient-specific generic tasks commit or roll back
together. A task dispatches only while current PR status remains READY or
ACTIVE, its payload cycle matches the current PR cycle, and the recipient is
still an active participant. Legacy PR-ready rows continue to decode and
drain.
