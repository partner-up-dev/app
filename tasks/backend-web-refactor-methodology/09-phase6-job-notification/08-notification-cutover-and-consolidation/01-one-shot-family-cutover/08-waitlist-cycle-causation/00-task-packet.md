# `6-3.1c-1` — Waitlist Cycle Causation and Stale-Task Fence

## Status

**Locally complete (2026-07-22).** The schema migration, source cutover and
focused compatibility proof have passed. This P1 follow-on repairs the causal
identity missing from the first promoted-handoff proof. It depends on the
transaction-bound Notification bridge in `03-transactional-handoff-foundation`.

## Objective

Make every waitlist entry a distinct, durable causal cycle. A slot may be
reused across exit/release/cancel → waitlist → promotion loops, but each new
waitlist entry must create one new generic `pr.waitlist-promoted` Job and an
old delayed Job must not become valid merely because the same slot is active
again later.

## Source Facts

- A historical `Partner` row is intentionally reused when a user re-enters the
  waitlist.
- The initial generic once-per-cause key used `recipientUserId`, `prId` and
  `partnerId`; the Job store preserves that key forever, including terminal
  rows.
- Current generic waitlist dispatch confirms only that the same slot is active,
  which cannot distinguish an old promotion from a later re-promotion.

## Target Boundary

- `Partner` owns a nullable durable `waitlistCycleId`: create/mark-pending
  assigns a fresh UUID; promotion preserves it; a direct reactivation or a new
  pending entry replaces/clears it as appropriate.
- New `pr.waitlist-promoted` payloads and causation IDs carry that cycle id;
  Notification derives its private once-per-cause key from the exact causal
  identity.
- Dispatch revalidates the active slot's current cycle id before channel I/O.
- Generic v1 tasks written before this cutover remain decodable, but a task
  without the cycle must terminally skip as
  `LEGACY_WAITLIST_CYCLE_UNVERIFIABLE` before provider I/O or credit mutation.
  This is a safe compatibility drain, not an old active-row delivery path; new
  source writes never omit the cycle.
- The old per-kind `wechat.notification.waitlist-promoted` handler is a
  distinct legacy payload family. It remains outside this schema fence and is
  governed by its own source/deployment inventory gate.

## Exit

A real Postgres re-entry scenario proves two distinct generic Jobs for the
same slot, and dispatch of the first delayed task skips after the second cycle
is active. A pre-cycle generic v1 payload passes JobRunner's durable schema and
then safe-skips without channel I/O or credit consumption. Schema migration,
type/build/lint, focused owner tests and the waitlist scenario all pass.

## Non-Goals

- no Notification Intent/delivery/wave state;
- no provider call or credit mutation inside the promotion transaction;
- no retrospective semantic repair of already-created generic Job payloads.
