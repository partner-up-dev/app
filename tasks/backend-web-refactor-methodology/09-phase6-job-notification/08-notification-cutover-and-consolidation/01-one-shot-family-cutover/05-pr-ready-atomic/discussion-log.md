# `6-3.1e` Discovery Log

## Source topology

- Manual `PATCH /api/pr/:id/status` reaches `updatePRStatus`; the admin status
  route reaches the same command. Before this slice it writes PR status, then
  calls `scheduleWeChatPRReadyNotifications` outside any transaction.
- Temporal refresh is reached by strong reads, eventual read tails and several
  participant/content commands. Its join-lock branch also writes READY first,
  then calls the same concrete scheduler. A scheduler failure therefore leaves
  a formed/locked PR with incomplete recipient fan-out.
- `updatePRStatus` currently refreshes temporal state before checking the
  manual READY creator restriction. A direct non-creator invocation can thus
  cause temporal auto-ready before its later `403`; the normal controller
  preflight does not make this command boundary safe by itself.

## Legacy behavior retained only for drain

- The legacy scheduler filters active participant summaries by active user,
  OpenID and `PR_READY` credit, then writes one concrete Job and one
  Opportunity per recipient. Its timestamp key has no durable transition
  identity, and its per-recipient writes can partially succeed.
- The old handler revalidates recipient/user/option/membership and READY or
  ACTIVE status, sends the existing WeChat PR-ready template, records a
  delivery, and historically clears opt-in with the final credit. New generic
  work must not inherit these persistence or coupled-credit semantics.
- Handler registration and recipient-prefix cancellation are still required to
  drain pending legacy rows. Opportunity rows are not a recovery source: old
  cancellation only changes Jobs and leaves them `SCHEDULED`.

## Causation and dispatch discovery

- A `readyAt` timestamp generated outside a retrying transaction cannot name a
  committed READY transition. Status alone also fails after READY → OPEN →
  READY, because an old delayed task would look valid again.
- `PartnerRequest` has no existing READY generation. A PR-owned UUID cycle is
  the smallest durable fact that lets generic task payload, causation and
  dispatch agree without adding a generic outbox or a Notification-owned PR
  state table.
- The existing provider service already exposes PR-ready configuration and
  send methods. Only the generic owner, runtime composition, prepared channel
  binding and a curated PR dispatch projection are missing.
