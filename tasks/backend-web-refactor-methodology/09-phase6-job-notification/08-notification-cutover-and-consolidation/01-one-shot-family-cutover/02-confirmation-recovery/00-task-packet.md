# `6-3.1b` — Confirmation Reminder Recoverable Vertical

## Status

**Locally complete (2026-07-22).** The generic owner capability, PR-owned pure
reconciler, current caller cutover and scenario proof are complete. Legacy
confirmation Jobs remain registered and executable while they drain; this is
not a legacy-state-retirement claim.

## Objective

Migrate `pr.confirmation-reminder` after activity-start has proven the mutable
generic schedule/cancel path. This child owns its two independent trigger
policies (`CONFIRM_START`, `CONFIRM_END_MINUS_30M`) and no other family.

## Frozen Inputs And Decisions

- The public request remains `{ prId, slotId, reminder }`: a PR caller never
  supplies `runAt`, a Job type, a private dedupe key, or a provider field.
  Notification derives those from current PR-owned confirmation anchors and its
  private trigger policy.
- The Job's own `runAt` is the private stale-work anchor. Generic dispatch
  receives it from `JobHandlerContext` and compares it with the current
  policy-derived instant before provider I/O. This catches a claimed old task
  after a time/policy edit without leaking an anchor into the business request
  or parsing a causal ID.
- `CONFIRM_START` keeps the exact `1ms / early 0 / late unbounded` policy.
  `CONFIRM_END_MINUS_30M` keeps the `5min / early 3 units / late unbounded`
  policy. Each trigger has its own replace-active identity; recipient-wide
  operations share one recipient/template/channel coordination identity.
- Current source treats `JOINED`, `CONFIRMED`, and `ATTENDED` slots as active
  for confirmation dispatch, and `confirmSlot` does not cancel reminders. No
  ratified product rule says confirmation itself suppresses a reminder. This
  migration preserves that behavior; a future "stop after confirmation"
  change needs an explicit PRD decision and its own slice.
- Current eligibility is still strengthened where it is already a declared
  invariant: a missing PR/slot, inactive recipient, missing OpenID, disabled
  confirmation policy, absent trigger instant, past activity start, or a
  current `runAt` different from the claimed Job all skip safely before
  sending or consuming credit.
- Subscription changes may cancel pre-cutover legacy confirmation rows during
  the drain, but no new path creates or rebuilds legacy confirmation work.
  Generic positive-credit rebuilds use the PR-owned recipient reconciler;
  generic clear uses semantic recipient cancellation.

## Exit

Both trigger tasks preserve their existing distinct precision/tolerance,
rebuild/cancel independently, and stale current eligibility skips through the
generic handler. Legacy confirmation rows remain executable.

## Local Evidence

- focused owner, adapter, projection and reconciler tests: 5 files / 32 tests;
- Postgres-backed confirmation + JobRunner scenarios: 2 files / 3 tests;
- `pnpm check:type:backend`, `pnpm check:lint:backend` and
  `pnpm check:build:backend` all pass;
- source cutover search leaves legacy confirmation schedule/rebuild calls only
  inside the legacy compatibility handler and the subscription-change drain
  bridge.

## Source Inventory And Boundary

- Legacy registration/schedule/cancel/rebuild stays in
  `infra/notifications/wechat-reminder.ts` solely for pending
  `wechat.reminder.confirmation` rows. It also owns legacy
  `notification_opportunities`; the generic path must write neither that table
  nor `notification_deliveries`.
- New PR-owned query projections enter through the narrow
  `domains/pr/notification-contexts` entrypoint. They must be pure reads and
  must not invoke temporal refresh or import Notification infrastructure.
- Generic PR callers are join/repeated join, waitlist promotion, exit,
  automatic/manual/time-conflict release, successful time update, admin rule
  update after rules persist, and the confirmation subscription side effect.
  A successful confirmation is intentionally not added as a cancellation edge
  under the preserved-status decision above.
- Admin delete/status mutations and legacy rows are not silently widened in
  this slice. Generic dispatch remains safe if the PR/slot/policy is no longer
  eligible; any explicit lifecycle invalidation beyond currently migrated
  caller edges requires a separately evidenced product behavior.
