# D6-J-02 Discussion Log

## Corrections Accepted

1. A delivery attempt that exists only for diagnosis belongs in observability,
   not a new `job_attempts` persistence ledger.
2. Notification “waves” are not independently valuable business entities. For
   PR messages they are a Job creation mode: one held creation reservation until
   semantic acknowledgment.
3. `pr_message_inbox_states` currently mixes a notification-frequency gate with
   an unneeded backend read/unread contract. The target removes it rather than
   preserving an otherwise unused aggregate.
4. Even a future cross-device viewed feature does not automatically justify an
   independent read-state table. A bounded per-message membership fact defaults
   to the message owner, for example `viewedByUserIds`.

## Generalized State-Placement Rule

Classify a candidate fact before choosing a table:

- **Owner-local bounded fact:** same identity/lifecycle/authorization as its
  owner, small bounded membership, atomic owner updates; embed it in the owner.
- **Independent entity:** its own identity/lifecycle, unbounded or high-cardinality
  membership, independent queries/retention/authorization, per-member metadata,
  or contention/integrity needs; give it a relation only after this proof.
- **Diagnostic history:** it does not affect product behavior or recovery;
  emit it to O11y with suitable correlation and retention.
- **Generic task control:** losing it changes claim, lease, retry or dedupe;
  keep it durably on Job.
- **Business recovery truth:** losing it changes whether an external effect is
  applied, unknown or safe to repeat; keep it on the semantic owner, never on
  Job merely because a Job invoked the handler.

This is not an anti-normalization rule. It is a requirement that every new
entity earn its lifecycle and dependency cost.

## Ratified Target Topology

```text
PRMessage
  owns content, author, visibility
  may later own bounded viewedByUserIds

Notification
  owns business template, channel binding, eligibility, preference/credit
  selects Job timing and creation mode
  translates visible-thread ACK into a private Job release

Job
  owns durable task, claim/lease/retry/generic terminal state
  owns UNTIL_ACKNOWLEDGED creation reservation

semantic owner
  owns external-effect result, uncertainty and reconciliation authorization

O11y
  owns 0..N attempt history
  never controls retry, ACK, dedupe, or product state
```

## Counterexamples Used In Review

- A Job reaching `SUCCEEDED` before user ACK must still block a second PR-message
  window; execution terminality and creation reservation are orthogonal.
- A fixed key without generations/high-water checks lets a stale ACK release a
  newer window or messages already coalesced after the client's rendered
  snapshot.
- A thread-level `lastRead` cursor cannot express per-message viewed membership.
- If loss or sampling of telemetry changes retry behavior, control truth has
  leaked into O11y.
- An unbounded `viewedByUserIds` array would become a write hotspot; boundedness
  is a design precondition, not an implementation hope.

## Authorization Boundary

The discussion and durable-doc promotion are complete. No application source,
schema, migration, deployed telemetry, or provider change is authorized by this
decision packet.
