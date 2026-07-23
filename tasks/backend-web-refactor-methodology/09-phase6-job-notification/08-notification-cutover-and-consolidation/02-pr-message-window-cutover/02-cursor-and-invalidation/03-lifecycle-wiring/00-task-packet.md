# `6-3.2b-3` — PR-Message Lifecycle Invalidation Wiring

## Status

**Locally complete.** `6-3.2b-1` and `6-3.2b-2` are locally proven, and every
dependency-ordered lifecycle child plus its shared matrix/promotion is now
complete. Visible Web ACK and legacy-state retirement remain separate later
`6-3` children.

## Objective

Use the proven cursor and semantic invalidation primitives at every current
source of PR-message attention invalidation. The implementation is organized
around state transitions, not controller files, so no hidden exit/terminal or
provider path leaves a held reservation behind.

## Ordered Children

1. [`01-participant-release`](./01-participant-release/00-task-packet.md) —
   make every removal release that participant's current PR window *before*
   their membership fact disappears. This is the prerequisite for any later
   current-roster fan-out.
2. [`02-terminal-fences`](./02-terminal-fences/00-task-packet.md) — make
   manual/temporal terminal transitions release current recipients and fence
   both source-time and dispatch-time attention (**complete**).
3. [`03-admin-tombstone-root-delete`](./03-admin-tombstone-root-delete/00-task-packet.md)
   — make admin deletion transactional and release the affected windows before
   hiding/cascading source state (**complete**).
4. [`04-subscription-provider`](./04-subscription-provider/00-task-packet.md)
   — route the authenticated PR-message subscription HTTP entrance to the b2
   serialized Notification command (**complete**); generic `43101` remains on
   the same command and is included in the final matrix.
5. [`05-matrix-durable-promotion`](./05-matrix-durable-promotion/00-task-packet.md)
   — run the cross-entrance matrix, perform reverse-edge audits, and promote
   the resulting current/target facts to durable docs (**complete**).

The children intentionally do not split by controller. They split by the
source fact that would otherwise be lost, making rollback and verification
local to each state transition.

## Named Entrances

- admin message delete: tombstone plus affected window release;
- participant self-exit, admin release, temporal unconfirmed release and
  content-conflict release: release the departing recipient's PR window;
- manual/temporal `CLOSED` or `EXPIRED`: release all affected recipient
  windows and fence future source/dispatch work;
- admin root PR delete: enumerate the affected recipient set before cascade,
  release its windows, then delete;
- PR-message subscription clear/re-enable and WeChat `43101`: mutate option
  state and release current/stale recipient work through Notification;
- source creation and dispatch: reject terminal PR attention windows.

## Exit

Each named event has one owner path to Notification invalidation, no event
requires a legacy inbox/wave/opportunity write, and the real-Postgres matrix
proves no replay on rejoin or restored credit.

## Non-Goals

- changing user-visible message access rules for terminal PRs;
- moving legacy read-marker/visible ACK behavior ahead of `6-3.2c`;
- retaining a direct PR-to-Job or controller-to-Job edge.

## Explicit Compatibility Question

The b2 key topology is recipient-first so Notification can efficiently clear a
recipient's all-PR windows. The b2 producer and b3.1 removal wiring are one
deployment unit: every post-cutover departure is released while the PR still
names the recipient. The release rule and the evidence-triggered fallback for
an unexpected split runtime are recorded in
[`decision-log.md`](./decision-log.md); it is not a reason to add a PR-payload
scan to Job.
