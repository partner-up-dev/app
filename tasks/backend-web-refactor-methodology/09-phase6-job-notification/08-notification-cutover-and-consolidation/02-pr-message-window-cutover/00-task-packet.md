# `6-3.2` — PR Message Attention-Window Cutover

Owner: Notification semantic request/ACK integration; PR remains message/ACL
owner and Web remains visible-thread owner.

## Status

**Entry inventory and all `6-3.2a` atomic-window children are locally
complete; all `6-3.2b` cursor/tombstone, generic invalidation and lifecycle-
wiring children are locally complete. `6-3.2c` visible Web ACK implementation
and overlap proof are locally complete. `6-3.3` legacy state retirement remains
the next source slice.**
The one-shot source sequence is locally complete through `6-3.1g`. The message
protocol is split into atomic window, cursor/invalidation and visible ACK
compatibility children because each protects a different invariant.

Replace inbox/read-marker/wave gating with Job `UNTIL_ACKNOWLEDGED`, monotonic
high-water and a visible-thread semantic ACK. Completion requires backend race
proof and a real Web/backend/Postgres scenario proving hidden fetch does not
ACK and stale ACK cannot release coalesced messages.

Sub-task execution files:

- [`plan.md`](./plan.md)
- [`rehearsal.md`](./rehearsal.md)
- [`01-atomic-window-foundation/`](./01-atomic-window-foundation/)
- [`02-cursor-and-invalidation/`](./02-cursor-and-invalidation/)
- [`03-visible-ack-compatibility/`](./03-visible-ack-compatibility/)

Parent contract: [`../spec.md`](../spec.md).
