# `6-3.1d` Discovery Log

## Source topology

- Both new-work callers are post-commit today: direct join in
  `domains/pr/commands/join-pr.ts` and waitlist promotion in
  `domains/pr/services/waitlist.service.ts`.
- The legacy scheduler reads a then-current active roster, filters the joined
  user, active-user/OpenID and `NEW_PARTNER` credit, then performs one legacy
  Job write plus one opportunity write per recipient. Those writes are neither
  source-atomic nor all-or-nothing.
- The generic task decoder already names `pr.new-partner`, but owner policy,
  option mapping, dispatch context, renderer and prepared WeChat adapter have
  not enabled it. Its payload lacks the joined user/time facts needed by the
  current provider template.

## Causation discovery

Legacy dedupe uses the reusable Partner row ID. `reactivateSlot` retains that
row's `createdAt`, and a promotion also reuses its PENDING row. Therefore
neither the row ID nor `createdAt` distinguishes two later active admissions.
A task delayed across exit and re-entry could otherwise dispatch as if it
belonged to the new lifecycle.

## Boundary decision

PR owns the active roster and admission-cycle fact. Notification owns whether
a candidate can receive this template at source time (user active/OpenID and
preference/credit) and owns private Job policy. A narrow transaction-bound
port composes those facts; it is not a generic cross-domain transaction API.
Channel configuration is deliberately dispatch-time, matching the target
Notification/Channel contract rather than the legacy pre-schedule gate.
