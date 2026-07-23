# D6-J-02 Target Model

## Attempt: Durable Control, Observable History

```text
Job row
  = current execution/recovery truth

trace + structured log + metrics
  = per-attempt history and diagnosis
```

The generic handler returns a structured disposition. JobRunner uses it to
persist only the current/terminal control state and emits one correlated attempt
signal:

```ts
type JobExecutionDisposition =
  | { type: "SUCCEEDED"; code?: string }
  | { type: "SKIPPED"; code: string }
  | { type: "RETRYABLE_FAILURE"; code: string; detail?: string }
  | { type: "PERMANENT_FAILURE"; code: string; detail?: string };
```

These values describe only whether the handler task completed or may be
executed again. JobRunner treats the handler code/payload as opaque and never
uses it as business truth. A handler facing an ambiguous external effect first
persists the semantic owner's `UNKNOWN`/equivalent state, then ends the task in
a generic non-retrying terminal state. A process-crash re-entry consults owner
state before any second provider call.

Target telemetry for every attempt:

- span/log correlation: Job ID/type, attempt number, runner source/instance;
- timing: scheduled delay, claim delay, handler duration;
- disposition/reason and retry decision;
- bounded provider code/reference where safe;
- counters by low-cardinality job type/disposition/reason and duration/lag
  histograms;
- no raw payload, OpenID, message body, or other unnecessary PII.

Current retry count/status and a bounded generic execution reason remain
durable because they change task control. Provider-effect uncertainty and
operator reconciliation remain durable on the semantic domain owner.

## Windowed Job Creation

Add one explicit creation mode; do not generalize speculative scheduler types:

```ts
type UntilAcknowledgedCreation = {
  mode: "UNTIL_ACKNOWLEDGED";
  key: string;
  cursor: number;
};

schedule({
  jobType: "notification.send.v1",
  creation: {
    mode: "UNTIL_ACKNOWLEDGED",
    key: `pr-message:${prId}:${recipientUserId}`,
    cursor: messageId,
  },
  // runAt, timing, payload...
});
```

The Job stores an orthogonal creation reservation:

- creation mode/key;
- `HELD | RELEASED` reservation state;
- window-start cursor and current high-water cursor;
- released/acknowledged timestamp;
- a partial uniqueness rule for held `(jobType, creationKey)`.

Scheduling with an existing held key coalesces into the existing window even
when its Job execution is terminal and atomically raises `highWaterCursor` to
the incoming cursor. The notification handler recomputes current message
content from the window start; it does not need a persisted read marker.

## Explicit Acknowledgment

The visible-thread client keeps an explicit semantic acknowledgment request so
hidden fetch/prefetch cannot close a window. The client/PR route does not see a
Job type or creation key:

```ts
notification.acknowledge({
  template: "pr.message-summary",
  aggregate: { type: "partner_request", id: String(prId) },
  recipientUserId: userId,
  throughCursor: latestVisibleMessageId,
});
```

Notification derives the private Job creation key and asks Job to release only
a held window whose current `highWaterCursor <= throughCursor`. An ACK for an
older rendered snapshot therefore cannot release messages that already
coalesced into the window. Scheduling and ACK serialize on the reservation: if
ACK commits first, the later message creates a new generation; if scheduling
commits first, ACK observes the raised high-water. If the Job is still
pending/retry, acknowledgment also moves it to an explicit terminal
`CANCELED`/`SKIPPED` state. If it is running, the handler rechecks reservation
state immediately before the provider edge.

Once released, the next message creates a new Job/window generation. Historical
terminal Jobs remain observable without reserving the key.

Business invalidation such as recipient exit or terminal PR cleanup may also
release/cancel a held reservation through Notification. A held reservation must
not disappear merely because ordinary terminal-Job retention runs; otherwise
retention would silently change creation semantics.

## Resulting Persistence Candidate

```text
keep / evolve:
  jobs
  user_notification_options

remove after proof:
  notification_opportunities
  notification_deliveries
  notification_waves
  pr_message_inbox_states
```

A future bounded per-message viewing feature may justify a PR-message-owned
`viewedByUserIds` set. That fact shares the message's identity and lifecycle;
it does not justify an independent read-state entity by default. Extraction is
appropriate only after independent lifecycle, unbounded cardinality, query,
concurrency, retention, integrity, or authorization needs are demonstrated.

## Rejected Alternative: Separate Read State

The discussion considered keeping a minimal PR-owned relation:

```text
pr_message_read_states(prId, userId, lastReadMessageId)
```

Sir rejected this branch because the current product does not require a
backend-authoritative thread read cursor, and a future per-message viewed fact
has different semantics. The ratified target therefore has neither this
relation nor a general `lastRead` contract. A semantic visible-thread ACK
releases only the Notification Job creation gate.
