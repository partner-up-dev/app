# `6-3` Entry Evidence

## Read-Only Inventory Closed — 2026-07-22

Three independent source inventories close the information needed before the
first `6-3` mutation. Their conclusions deliberately narrow execution rather
than treating the parent as one big-bang cutover.

### One-Shot Families

- The generic owner currently enables only `pr.waitlist-promoted`; all six
  remaining families still use a per-kind `wechat.*` Job and legacy delivery
  writes.
- Activity-start is the smallest credible first migration: one run time, one
  causal key, a named current-participant/PR-time reconstruction rule, and a
  focused existing unit anchor.
- Confirmation reminder follows with two trigger-specific timing contracts.
- New-partner, PR-ready, meeting-point-updated and the existing promoted
  exemplar are atomic-required. Their source transitions currently commit
  before scheduling and cannot reconstruct the exact causal fan-out from
  current state alone.
- Waitlist-alternative is recoverable only after its current scheduling and
  dispatch paths stop invoking PR temporal-refresh mutations. Its replacement
  is a pure current-state query plus named reconciler.

### PR Message Window

```text
current:
write message → inbox marker / wave / opportunity → legacy delayed Job
GET thread → Web immediately writes read marker

target:
PR transaction: write message + per-recipient HELD/high-water Job reservation
GET thread → mounted + rendered + visible Web sends semantic attention ACK
```

- The current writes are separate autocommits and per-recipient failures are
  logged/absorbed; they cannot be called an atomic notification handoff.
- JobRunner already provides `UNTIL_ACKNOWLEDGED`, advisory-key serialization,
  high-water raise, stale ACK rejection and terminal-held behavior. Notification
  has not yet bound `pr.message-summary` to those primitives.
- A semantic ACK must be distinct from the legacy read-marker. A raw GET,
  hidden prefetch or pre-render cannot acknowledge the attention window.
- Physical admin deletion can remove a held high-water message, so the target
  needs a PRMessage-owned monotonic cursor preserved through a tombstone rather
  than relying on the last currently visible row.

### Legacy State And Runtime Gate

| Store | Current source truth | `6-3` disposition |
| --- | --- | --- |
| `notification_opportunities` | write/link only; no reader or terminal lifecycle | retire after all new writers stop |
| `notification_waves` | PR-message create-only; no effective reader/state transition | retire after window replacement |
| `pr_message_inbox_states` | actual legacy read/wave dispatch gate | retain until legacy PR-message rows drain/migrate |
| `notification_deliveries` | append-only legacy attempt evidence; no reader | retain through `6-5` O11y proof |

No destructive migration is authorized by local source evidence alone. Before
`6-3.3` drops a table, an operator must provide the active legacy Job/table
inventory, archive retention decision and old-runner drain evidence. Existing
inbox/wave data must be archived as compatibility history, never converted into
target ACK authority.

## Resulting Execution Constraint

The first executable source slice is `6-3.1a` activity-start recovery. The
subsequent micro-slices and their low-cost proofs are listed in
`slice-map.md`; no child may start merely because it shares the parent folder.
