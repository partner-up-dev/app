# `6-3.2b` Implementation Topology

## State And Owner Flow

```text
PRMessage (message identity, visibility tombstone, acknowledgement cursor)
  -> Notification (template semantic invalidation and private key policy)
     -> Job (generic keyed held-reservation release / execution fence)
        -> channel dispatch (current-state revalidation)
```

`pr_message_inbox_states` is outside this flow. It remains a live
compatibility read/write implementation for the old thread/read-marker API
until the later visible-ACK and retirement slices.

## Ordered Lock / Mutation Shapes

### New PR message

1. PR locks the request row and active roster.
2. It inserts one PRMessage.
3. Notification locks/reads each candidate's PR-message option row, filters
   availability, then asks Job to lock the private creation key and coalesce or
   create its held window.
4. All source state and reservation writes commit together.

### Message tombstone

1. PR locks the request and selects the message including tombstones.
2. It tombstones the visible message rather than deleting its ID.
3. Notification invalidates the affected recipient window(s) through the
   transaction-bound semantic port.
4. Job serializes each private key, cancels pre-invocation work if present and
   releases the reservation before the PR transaction commits.

### Participant removal / terminal / root deletion

1. The PR-owned mutation holds the PR row before changing membership or status.
2. It determines the affected recipient set before a cascade can erase it.
3. Notification performs semantic invalidation while the source transaction is
   still reversible; Job remains unaware whether the cause was exit, terminal
   state, or delete.
4. A later message cannot reopen a terminal window: source checks status, and
   dispatch checks current status again before provider I/O.

### PR-message subscription / provider permission loss

1. Notification locks the recipient option row.
2. It records the new available-credit state and releases the recipient's
   matching message windows under Notification's private key scope before
   commit.
3. PR source creation takes the same option-row lock before deciding to
   schedule; thus it observes either the old state before the mutation or the
   new state after it, never a stale mixed outcome.
4. `43101` follows the same Notification-owned clear-and-release path; it does
   not call a PR repository or expose a provider code to Job.

## Scope Policy

| Event | Semantic Notification scope | Result |
| --- | --- | --- |
| tombstone one message | affected PR + recipient windows | release current window; a later message may open another |
| participant exits/is released | that recipient + PR | release only that recipient's window |
| PR terminal / root deletion | every affected recipient + PR | release all matching windows; terminal also suppresses new source/dispatch |
| opt-out / `43101` | recipient's PR-message windows | release all matching held windows |
| `0 → positive` credit | recipient's stale PR-message windows | clear old terminal generation, no replay |

The concrete private key is never part of PR's public contract. A recipient-
wide scope is implemented by Notification through its own key prefix or a
bounded exact-key fan-out; Job receives only key data.
