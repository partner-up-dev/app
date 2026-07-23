# `6-0` Classic Use-Case Sequences

## Current Job Use Case A — Confirmation Reminder, Due Work and Retry

1. `joinPRAsUser` commits/reloads the participation state and calls the
   concrete confirmation-reminder scheduler.
2. The scheduler resolves the two reminder policies, writes a `jobs` row with
   a dedupe key and timing buckets, then separately writes/links a Notification
   opportunity.
3. A request-tail kick or FC timer tick reaches
   `POST /internal/maintenance/tick` and `JobRunner.runDueJobs`.
4. JobRunner claims the due row (`PENDING`/`RETRY → RUNNING`), increments its
   attempt count, and grants a lease.
5. The notification handler validates payload, reloads user/quota/PR/slot and
   channel configuration, then calls the WeChat subscription adapter.
6. On accepted send, it records a delivery, consumes quota as applicable, and
   returns; JobRunner marks the job `SUCCEEDED`.
7. On a retryable adapter failure, it records a failed attempt and throws;
   JobRunner changes the job to `RETRY` with bounded linear delay, or `FAILED`
   after max attempts.
8. If the process dies while a handler runs, a later claim sees expired lease
   and returns the job to `RETRY`; provider acceptance before that crash is not
   proven exactly-once.

## Current Job Use Case B — Official-Account Follow Sync Recurrence

1. Backend boot registers the handler and schedules an initial delayed job.
2. A tick claims it; the handler validates payload and either detects missing
   configuration or pages the WeChat follower list and writes positive local
   follow markers.
3. On normal completion—including unconfigured skip—the handler schedules the
   next six-hour job and returns; JobRunner marks the old job `SUCCEEDED`.
4. A provider/pagination error throws, so JobRunner retries the same job.
   Exceeding the attempt limit leaves it `FAILED` and no next recurrence is
   scheduled until a recovery path intervenes.

## Current Notification Use Case A — PR Message Unread Wave

1. Message API → `createPRMessage` persists the message and author read marker.
2. The PR-message path calls the unread-wave service with a concrete WeChat
   scheduler callback.
3. That service finds active recipients, rechecks quota/inbox state, stores
   `lastNotifiedMessageId`, creates an `OPEN` wave and `CREATED` opportunity.
4. It calls `jobRunner.scheduleOnce` for the delayed summary and then marks the
   opportunity `SCHEDULED` with the returned job ID.
5. On due execution, the handler reloads recipient, active membership, inbox
   state, quota, and recomputes latest unread content before calling WeChat.
6. It records a delivery and consumes/clears quota as needed. Its transport
   failure path currently records `FAILED` **but returns**, so JobRunner marks
   the job `SUCCEEDED`; this is an explicit Phase 6 compatibility defect.

## Current Notification Use Case B — Waitlist Promotion

1. Exit flow releases a slot; PR participation logic promotes the next pending
   candidate and commits the active slot.
2. The PR service calls the concrete waitlist-promotion scheduler.
3. It checks channel configuration, calls `jobRunner.scheduleOnce`, creates a
   one-shot opportunity, and separately marks it scheduled.
4. On due execution the handler revalidates user/openid/quota, PR existence,
   and that the promoted slot is still active and belongs to the recipient.
5. It sends through the channel adapter; accepted send records delivery and
   consumes quota. `43101` clears credits/cancels pending jobs. A retryable
   adapter failure records delivery and throws, allowing JobRunner retry.

## Revised Target Job Use Case — RideHailing Fee Confirmation (D6-F-01)

1. The exact BillLine payment-settlement transition makes all Bill charge lines
   paid and determines that provider fee confirmation is required.
2. In that same narrow transaction, the coordinator records RideHailing
   confirmation generation 1 as `REQUIRED` and ensures one typed
   FeeConfirmation Job for that generation. It creates no second intent entity.
3. A tick claims the Job; the handler reloads Bill/RideHailing truth, advances
   `REQUIRED` to `IN_FLIGHT`, and rejects other states before provider I/O.
4. The handler invokes `feeConfirm` using the ratified idempotency or
   reconciliation rule.
5. A definite success records RideHailing `CONFIRMED`. An ambiguous response or
   stale in-flight attempt records/is treated as RideHailing `UNKNOWN`; Job
   receives only a generic non-retrying terminal disposition.
6. Operator recovery enters RideHailing. A proven-safe retry advances the
   confirmation generation and creates a new Job; it never repeats the already
   committed BillLine settlement or mutates the old Job into business state.

## Target Notification Use Case — Atomic PR Message Attention Delivery

1. The PR message mutation asks Notification to schedule the stable
   `pr.message-summary` business template at the chosen atomic boundary; it
   does not import a WeChat scheduler or provider template ID.
2. Notification persists a typed/versioned Job with a held
   `UNTIL_ACKNOWLEDGED` creation reservation. The Job is the durable
   Notification Task and wave generation; no opportunity/wave/inbox row is
   required for current behavior.
3. The generic `notification.send.v1` handler validates the task, revalidates
   current state and preference/credit, resolves the business-template/channel
   binding, renders, and calls the channel adapter.
4. A non-retryable refusal/eligibility loss produces a terminal structured
   attempt outcome and cleanup; it is not retried.
5. Only a provider result that proves non-application and repetition safety
   moves the Job to `RETRY`. Network/HTTP/parse ambiguity is a bounded
   non-retrying failure and emits a correlated attempt signal.
6. A successful send terminally advances execution but keeps the creation
   reservation held. Explicit thread acknowledgment releases it; later messages
   then create the next window. Attempt history is observable, generic task and
   creation control remains durable on Job, and any business reconciliation
   state remains with its semantic owner.
