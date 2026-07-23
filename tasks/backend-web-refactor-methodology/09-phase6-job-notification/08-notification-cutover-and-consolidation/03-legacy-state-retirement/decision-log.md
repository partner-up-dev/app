# `6-3.3` Decision Log

## `6-3.3-D1` — Replacement proof does not authorize destructive retirement

`6-3.2c` proves the target semantic ACK path. It does not prove that all
already-deployed Web bundles have stopped calling `/read-marker`, that all
legacy Job rows can execute without their old decoder, or that compatibility
data has an approved retention destination. Those are independent runtime/data
facts and gate `6-3.3` source/schema mutation.

## `6-3.3-D2` — A legacy PR-message Job cannot be reconstructed from target ACK

The old concrete handler reads `pr_message_inbox_states` to decide whether a
legacy unread wave remains pending. A held generic reservation is not an old
read/notified authority. Therefore an old Job must be retained, migrated under
an explicitly validated mapping, or drained/cancelled with an approved policy;
the target model is never used to guess its missing legacy state.

## `6-3.3-D3` — Opportunity/wave and inbox are different retirement clusters

Static source inventory currently shows no new PR-message opportunity/wave
writer, but inbox still has a live compatibility GET/read-marker path and the
concrete PR-message decoder reads it. Opportunity/wave retirement can share the
deployment/archive gate, but it must not force an inbox/API drop before the
PR-message decoder and old-client gate close.

## `6-3.3-D4` — Delivery rows remain out of scope

`notification_deliveries` stays in place through `6-3.3`; attempt-history
replacement, deployed O11y queryability and delivery retention are `6-5` work.

## `6-3.3-D5` — Current gate result is No-Go

Static source evidence closes the local preflight only. The runtime inventory,
old-client sunset, old runner/drain evidence and archive/recovery authority are
absent from the repository, so no application-source or migration deletion is
authorized. The narrow next action is evidence collection, not a speculative
compatibility break.

## `6-3.3-D6` — Forward cut-off supersedes the compatibility gate

**Supersedes D1, D2, D3's ordering gate, and D5 on 2026-07-23.** Sir explicitly
accepts removal even if old Jobs or old clients still use the retiring state or
API. Do not collect production inventory, retain legacy decoders, wait for an
old-client sunset, or reconstruct old state. Remove the inbox/read-marker and
opportunity/wave clusters after current-source zero-reference proof and use a
forward migration.

This decision accepts old Job/client breakage; it does not claim none exist.

## `6-3.3-D7` — Delivery audit remains deferred

The compatibility cut-off does not turn ad-hoc console output into
observability. Keep `notification_deliveries` as transitional audit data and
defer its retirement to a future observability-infrastructure phase. Phase 6
must not add console logging to manufacture replacement proof.
