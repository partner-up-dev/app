# Notification Contracts

## Role And Owner Boundary

Notification is the backend owner of user-attention semantics. Its target
responsibilities are:

- stable business notification templates and typed payloads;
- business-template × channel binding and rendering;
- user preference plus limited/unlimited channel credit;
- recipient/channel/business eligibility and dispatch-time revalidation;
- channel-neutral provider outcome classification; and
- selection of Job timing and creation mode.

Job owns the durable Notification Task, timing bucket, creation reservation and
generic claim/lease/retry/terminal execution state. Program
observability owns pure attempt history. A channel adapter owns provider
protocol/credentials only; it does not own preference, scheduling, Job state or
product eligibility.

## Current Durable State

- `user_notification_opts` is one user-notification-option aggregate. It may
  contain both preference and channel credit because accepting a subscription
  can express desire and grant entitlement in one act.
- Nullable credit means `UNLIMITED`; a non-negative integer means
  `LIMITED(remaining)`. Null must not also mean unknown, not loaded or channel
  unconfigured.
- `jobs` is the durable Notification Task. Its typed/versioned payload carries
  business template, recipient/channel, aggregate, causation and correlation;
  Job creation metadata carries the private dedupe/creation identity.
- A Job may hold an `UNTIL_ACKNOWLEDGED` creation reservation independently of
  execution terminality. This is the current realization of a PR-message
  attention window.

Current notification execution has no Notification Intent/Opportunity record,
Notification Wave entity, or PR-message inbox/read-marker state. The former
`notification_opportunities`, `notification_waves`,
`pr_message_inbox_states`, read-marker API and every concrete per-kind
Notification Job handler/decoder were forward-retired after their generic Job
and semantic-acknowledgement replacements were proven.
`notification_deliveries` remains only as transitional audit compatibility
data until a future professional observability path and explicit retention
decision provide governed attempt evidence; Phase 7 intentionally provides
neither. It is not authoritative delivery or retry state. A future provider
receipt/read fact may earn a Notification-owned entity only when a provider
exposes a real asynchronous lifecycle independent of Job execution.

## Business Template And Channel Contract

Cross-domain callers use stable business template IDs such as
`pr.message-summary`; they never see a WeChat/provider template ID or provider
field names.

```text
(businessTemplateId, channelType)
  → private provider-template binding + typed renderer
  → prepared channel notification
  → NotificationChannelPort.send
```

Current source implements WeChat subscription messages. `WECHAT_TEMPLATE`,
email and SMS are not active dispatch paths. New channels enter only after
their configuration, provider behavior, preference/credit semantics and
outcome classification are proven.

The current Notification surface exposes `requestNotification` and stable
business contracts from the Notification domain root. All active producers
use that surface; there is no per-kind scheduler/decoder compatibility
entrypoint. Both
`pr.waitlist-promoted` and the migrated
`pr.waitlist-alternative-available` bind privately to the existing
waitlist-promoted WeChat subscription configuration and renderer. They remain
distinct business templates with distinct typed payloads and eligibility; a
shared provider template never collapses their business identity.

`pr.activity-start-reminder` also binds privately to its existing WeChat
subscription configuration and renderer. Its active participant and current
PR-time facts remain PR-owned; Notification consumes only the named
revalidation projection and never imports PR lifecycle mutation behavior.

## Creation Contract

Business owners call a curated Notification command with:

- business template ID and typed payload;
- recipient and, when product-specific, channel;
- aggregate/causation/correlation metadata;
- semantic timing/aggregate facts needed by that template's policy.

The caller does not choose `runAt`, Job type, private dedupe key or Job creation
mode. Notification's business-template policy derives timing, creation and
dedupe behavior, then creates the typed Job.

Current `pr.waitlist-promoted` uses a one-second immediate policy with no late
claim deadline and terminal-safe `ONCE_PER_CAUSE` creation. Its private key is
derived from template, channel, recipient, the durable promoted partner slot
and that slot's waitlist-entry cycle. The PR caller supplies the semantic
causation identity
`partner_request:<prId>:waitlist-promotion:<partnerId>:<waitlistCycleId>`; it
never computes the private key. Dispatch sends only when the active slot still
has that exact cycle. This prevents a delayed Job for a reused historical slot
from becoming valid during a later promotion.

Current `pr.new-partner` is also an immediate `ONCE_PER_CAUSE` task, but its
recipient set is a source-time fact rather than a reconstructible current
query. Direct admission and waitlist promotion write each recipient-specific
task in their PR-owned serializable transaction after the entrant slot is
active. PR supplies only the transaction-local active roster and immutable
`partnerId`/entrant/time/admission-cycle facts; Notification filters active
user, OpenID and available `NEW_PARTNER` preference/credit, then derives the
private key. The causation identity and key include the durable active
`admissionCycleId`, never only the reusable Partner-row ID. This is a named
atomic handoff, not a generic cross-domain transaction API.

Current `pr.ready` is an immediate `ONCE_PER_CAUSE` task for one PR-owned
READY-entry cycle. Manual status mutation and temporal join-lock refresh use
the same named, row-locked PR transaction: it writes `READY` with a freshly
created `readyCycleId`, freezes the active participant roster, and invokes the
transaction-bound Notification handoff. Notification filters that roster by
active user, OpenID, and available `PR_READY` preference/credit, then derives
the recipient-private key. Each task payload and causation identity contain the
same durable cycle (`partner_request:<prId>:ready:<readyCycleId>`). A source
failure rolls back the status/cycle and every task; this is a named atomic
handoff, not a generic transaction API.

`pr.meeting-point-updated` is an immediate `ONCE_PER_CAUSE` task for one
visible effective-point change. The source owner generates its immutable
operation UUID, description and timestamp inside the committing transaction;
the UUID is the event identity, not a clock-derived dedupe value. PR-content,
PR-type coordination and POI updates each use their own named serializable
source transaction: the source locks its own row(s), observes the effective
point before and after its mutation, freezes its active PR roster, and invokes
the transaction-bound Notification handoff before commit. One multi-PR
PR-type/POI operation may share an operation UUID and correlation, but each PR
retains `partner_request:<prId>:meeting-point:<uuid>` causation and each
recipient receives a private key containing that PR and UUID. Notification
filters the frozen roster by active user, OpenID and available
`MEETING_POINT_UPDATED` preference/credit, then owns the private Job identity.
Equal visible points and transitions to no usable description create no task;
a removal message requires a separately authorized template. Dispatch
revalidates current eligibility but renders only the event's immutable
description/timestamp, never a newer effective point.

Current `pr.activity-start-reminder` is a recoverable mutable-time task. A
PR caller supplies the recipient, PR aggregate and canonical activity start;
Notification derives the fixed 20-minute lead, a recipient-coordinated active
replacement identity and the private per-PR schedule key. It validates current
participant membership, persisted start time and preference/credit before and
after replacement. A semantic recipient or PR-aggregate cancellation removes
pending/retry work without exposing a Job type or dedupe prefix; a PR-owned
current-participation reconciler rebuilds only eligible current PR facts after
renewed credit.

Current `pr.waitlist-alternative-available` is a recoverable current-state
pair, not an availability event. PR's named reconciler discovers current
source/candidate pairs and first asks a pure PR projection whether the source
slot is still the recipient's opted-in `PENDING` slot with the exact
`waitlistCycleId`, and whether the candidate is an exact type/location match,
visible raw-`OPEN`, before its pure join boundary, under capacity, and free of
the recipient's active time conflict. The public payload carries
`{ sourcePrId, sourcePartnerId, sourceWaitlistCycleId, candidatePrId }`; its
causation identifies that tuple, and Notification derives a private
recipient-scoped `REPLACE_ACTIVE` key from the source partner, cycle and
candidate. Repeated reconciliation coalesces an active task, while an explicit
later reconciliation may create again after a terminal task if the pair still
exists. The projection and dispatch revalidation are read-only: they never
call temporal refresh, promotion, release or another PR command. Every current
task must carry the cycle; the forward cut-over deliberately retains no
no-cycle decoder.

`pr.confirmation-reminder` is also a recoverable mutable-time task, with two
independent triggers. Its public request is exactly `{ prId, slotId, reminder
}`. A PR projection supplies current confirmation start/end anchors and current
slot facts; Notification derives either the start instant or end-minus-thirty
minutes, its trigger-specific replacement identity, and the private schedule
key. The claimed Job `runAt` is a private stale-work fence: dispatch reloads
the current anchors and skips before provider I/O or credit consumption when
the derived instant differs. Global PR/policy/slot/activity ineligibility
semantically cancels both triggers, while a missing individual trigger cancels
only that trigger. The current PR-owned active-slot behavior includes `JOINED`,
`CONFIRMED`, and `ATTENDED`; no implicit successful-confirmation cancellation
is introduced without a separate product decision.

When task loss after a business transition is unacceptable, the Job insertion
occurs inside that owner's narrow transaction boundary or through an explicitly
recoverable handoff. This does not justify a generic outbox or cross-domain
transaction helper.

One-shot notifications include:

- `REMINDER_CONFIRMATION`
- `ACTIVITY_START_REMINDER`
- `NEW_PARTNER`
- `MEETING_POINT_UPDATED`
- `PR_READY`
- `WAITLIST_PROMOTED`
- `WAITLIST_ALTERNATIVE_AVAILABLE`

`PR_MESSAGE` uses windowed creation rather than a separate wave entity.

## PR Message Attention Window

The product allows at most one `PR_MESSAGE` send per
`PR / recipient / message-attention window`.

1. The first eligible message schedules one Job with creation mode
   `UNTIL_ACKNOWLEDGED`, a private `PR/recipient` creation key and a
   message-start cursor. The reservation also records a high-water cursor.
2. Later messages coalesce while that reservation is held, including after the
   Job execution becomes terminal, and atomically advance the high-water cursor.
3. The handler recomputes relevant current message content at execution time.
4. When the visible thread is actually shown, Web sends an explicit semantic
   acknowledgment. Hidden fetch/prefetch cannot do so.
5. Notification derives the private Job key and releases only when the
   acknowledgment cursor covers that held window's current high-water cursor.
   Therefore an ACK for an older rendered snapshot cannot release coalesced
   messages it did not contain. The schedule/ACK transition must serialize: if
   ACK commits first, a later message opens the next generation; if scheduling
   commits first, it raises high-water before ACK is evaluated.
   The cursor is a PRMessage-owned monotonic stream position, not a viewer
   read-state or a synonym for the latest currently visible item. Its identity
   remains verifiable through a logical-deletion/tombstone boundary so an
   already-rendered ACK can still cover a deleted high-water item.
6. Recipient exit, terminal PR cleanup or another product ineligibility may
   cancel/release the reservation through Notification.

**Current implementation boundary:** the PRMessage-owned all-row cursor and
visible-row tombstone filter now exist. Notification maps semantic
`pr.message-summary` aggregate/recipient scope to one opaque held creation key
or a recipient prefix; a prefix is never claimed to lock future source work.
The dedicated PR message route first validates current participant access and
that the submitted cursor belongs to the PR, including a tombstoned high-water
message. It then calls Notification's semantic acknowledgement command; only
Notification maps that scope to the private Job identity. The HTTP contract
returns semantic success rather than exposed `released` / `stale` Job control
facts. The current Web route starts this action only after its thread has
rendered while the document is visible, with one bounded same-cursor retry;
raw reads and hidden documents cannot take this path.
The PR-message source and Notification-owned preference/credit mutation share
one recipient option-row lock. `CLEAR` releases current held work, and
`0 → positive` releases an obsolete held generation without scheduling or
replaying absence-period messages. The authenticated subscription route and a
generic `43101` permission refusal both use that same serialized mutation.

Every source fact that makes current PR-message attention ineligible now uses
the same semantic hand-off before its transaction commits: participant exit,
admin/temporal/content-conflict release invalidate only the departing
recipient; manual/temporal `CLOSED` and `EXPIRED` release the locked current
roster; an admin message tombstone releases current recipients while retaining
its cursor; and root deletion captures/releases the roster before cascade.
Terminal PRs may retain compatible source messages but create no new window;
generic dispatch returns `PR_TERMINAL` before channel I/O.

An ordinary terminal-Job retention policy cannot delete a still-held
reservation, because doing so would silently change notification-frequency
behavior.

## Dispatch And Outcome Contract

At dispatch time, Notification revalidates as applicable:

- active recipient and usable channel identity;
- current preference and available limited/unlimited credit;
- active PR membership;
- for `pr.message-summary`, a non-terminal PR; `CLOSED` and `EXPIRED` skip
  before channel I/O or credit consumption;
- for `pr.new-partner`, the original entrant slot's current active-admission
  cycle;
- for `pr.ready`, PR status `READY` or `ACTIVE`, the payload's exact current
  PR READY-entry cycle, and the recipient's current active membership;
- PR-message creation reservation;
- for `pr.waitlist-alternative-available`, the source slot's exact current
  waitlist cycle and opt-in plus candidate compatibility, pure temporal
  joinability, capacity and recipient time-conflict eligibility;
- channel/template configuration.

`REMINDER_CONFIRMATION` `CONFIRM_START` remains an exact lower-bound attention
event; `CONFIRM_END_MINUS_30M` retains its coarser tolerance policy.

For the migrated confirmation family, a claimed Job must provide its private
`runAt`; a direct owner dispatch without it skips safely rather than weakening
the stale-work fence.

The handler returns a structured disposition:

- `SUCCEEDED`
- `SKIPPED`
- `RETRYABLE_FAILURE`
- `PERMANENT_FAILURE`

JobRunner persists only generic task execution state needed for retry and
terminal control. It treats the typed payload and handler reason as opaque and
does not own a business reconciliation state. There is no governed current
attempt-telemetry sink; Phase 7 owns that observability handoff. Provider
refusal such as WeChat `43101` clears relevant preference and limited credit
and cancels work only where policy requires. The current generic WeChat adapter
classifies only `43101` as a known recipient-permission refusal;
all other network/HTTP/parse/provider failures are `AMBIGUOUS` and
non-retrying until an adapter proves non-application and safe repetition. A
provider-ambiguous result cannot silently retry unless the specific effect is
idempotent or reconcilable. If that ambiguity becomes a durable
product/recovery fact, Notification—not Job—must first own the smallest
justified state. Notification does not claim exactly-once send.

This conservative rule is enforced by current `notification.send.v1` paths.
The former per-kind `wechat.*` Job handlers and their independent
`TRANSPORT_ERROR` retry behavior were forward-retired. A new Notification
caller or template cannot restore that second execution policy.

## Attempt Observability

Pure attempt history belongs to program observability, not an authoritative
attempt table. Every attempt signal should correlate Job ID/type, attempt
number, trigger/runner identity, schedule lag, duration, disposition/reason and
safe bounded provider reference. Raw message payload, OpenID and unnecessary
PII must not enter telemetry.

SQL `notification_deliveries` remains transitional audit compatibility data
until a future professional observability path proves queryability, retention,
correlation and recovery/alert coverage and owns the historical-data decision.
Phase 7 establishes a clean baseline rather than that replacement. No current
generic notification path writes it, and its rows do not control Job
execution. Telemetry failure must not change Job control state.

## Frontend Contract

Frontend owns route/page placement, notification prompts/modals, message-thread
rendering, cache refresh and user-facing fallback copy. It never decides
backend eligibility, credit, provider configuration, retry or creation-window
truth.

Join and waitlist flows retain their focused subscription prompts.
Confirmation-enabled join places `REMINDER_CONFIRMATION` in its dedicated
follow-up; general follow-up remains focused on the other relevant reminder
templates.

## Current Cut-Over State

Current source has cut over the following generic verticals. PR waitlist
promotion calls the curated Notification command and creates a
`notification.send.v1` v1 Job in the same narrow PR transaction as slot
promotion, its reliability delta and derived PR status. It does not write the
transitional `notification_deliveries` audit table. A newly created
waitlist-promotion task always carries the slot's `waitlistCycleId`; its private
key and causation identity include that cycle. Current WeChat storage remains
non-null limited credit; this vertical decodes
`preferred && LIMITED(remaining > 0)`, preserves preference when accepted send
consumes the final credit, and clears both after a known `43101` permission
revocation.

The private v1 generic-task decoder requires `waitlistCycleId`; it does not
accept a pre-cutover unverifiable shape. The former per-kind
`wechat.notification.waitlist-promoted` payload/handler family is no longer
registered.

New-partner admission now creates only generic `notification.send.v1` work in
the same transaction as the active-slot/reliability/status transition. Each
task freezes the exact source-eligible roster (excluding the entrant) and
carries the entrant's `admissionCycleId`; it does not write the transitional
`notification_deliveries` audit table. Dispatch still revalidates current
recipient preference/credit and membership, then confirms the original entrant
slot is active with that same cycle before channel I/O.
An accepted generic send decrements limited credit without erasing the stored
preference; a known permission revocation clears both. The old
`wechat.notification.new-partner` handler, decoder and cancellation path are
forward-retired.

PR-ready entry now creates only generic `notification.send.v1` work in the same
PR-owned serializable transition that persists `READY` and its durable
`readyCycleId`. This applies to both manual and temporal join-lock entry. It
does not write the transitional `notification_deliveries` audit table. Dispatch
accepts the task only while the PR is still `READY` or `ACTIVE` with that exact
cycle and the recipient remains active. Accepted generic sends consume limited
credit without erasing preference; known `43101` permission revocation clears
both. The concrete `wechat.notification.pr-ready` handler, payload decoder and
recipient-prefix cancellation are forward-retired.

Meeting-point updates now create only generic `notification.send.v1` work from
the PR-content, PR-type-coordination and POI source families. Their source
transactions do not write the transitional `notification_deliveries` audit
table; injected handoff failure rolls back the source mutation and every
generic task. The old `wechat.notification.meeting-point-updated` handler,
payload decoder, Delivery writer and recipient-prefix cancellation are
forward-retired.

Activity-start reminders now create only generic `notification.send.v1` work
from current PR participation. Join/promotion/time-change reconciliation and
exit/release cancellation use the Notification public surface. A subscription
change uses recipient-scope generic invalidation and PR-owned rebuilding. The
old `wechat.notification.activity-start-reminder` handler, decoder, scheduler
and cancellation helpers are forward-retired.

Confirmation reminders now create only generic `notification.send.v1` work
from PR-owned active-slot and policy anchors. Join/repeated join, waitlist
promotion, exit/release, time and rule updates, and subscription credit changes
use the same semantic Notification request/cancel/reconcile surface. A
subscription change cancels or rebuilds only current generic work. The old
`wechat.reminder.confirmation` handler, decoder, scheduler and cancellation
helpers are forward-retired. The generic confirmation path does not write the
transitional `notification_deliveries` audit table.

PR-message creation now creates only generic `notification.send.v1` work from
one named PR-message source transaction. Participant posts use the frozen
active roster plus a locked author recheck; admin-system and already-committed
content-change context use the same frozen recipient roster without turning
their source into a participant-post admission. Notification applies channel
availability, current user/OpenID and PR-message preference/credit filtering
inside that transaction, then owns the private `UNTIL_ACKNOWLEDGED` key and
high-water coalescing. A message therefore commits without a reservation when
the channel or no eligible recipient is unavailable, but a reservation write
failure rolls back the message. Generic message work does not write the
retained `notification_deliveries` audit table. The former inbox,
Opportunity/Wave state, read-marker API and concrete
`wechat.notification.pr-message` handler are forward-retired and cannot be
used as compatibility authority.

The PR-message source now locks each candidate recipient's option row before
it accepts preference/credit eligibility and writes a held window. The named
Notification subscription mutation locks that same row, changes preference and
credit, and releases the recipient's existing held generations before commit.
This is a narrow source/mutation protocol, not a generic transaction framework
and not a reason for Job to learn PR or provider meaning. The authenticated
`PR_MESSAGE` controller delegates to this command. Generic `43101` uses the
same command and therefore clears preference, credit and held generic
generations without a controller-specific branch.

All active notification families create `notification.send.v1` work through
the Notification owner surface. All historical per-kind `wechat.*` handlers,
decoders, scheduler/cancellation helpers and their legacy Delivery writers are
forward-retired. The retained `notification_deliveries` rows are historical
audit data only; the table is not an execution or business authority. The Job
core owns versioned definitions, generic dispositions, lease-token fencing and
creation reservations.

- Owner: Phase 6 Job / Notification refactor.
- Current retirement boundary: `pr_message_inbox_states`,
  `notification_opportunities`, `notification_waves`, the read-marker API and
  every concrete per-kind Notification Job handler/decoder are gone under an
  explicit forward cut-off; already-deployed legacy clients or Jobs were not
  preserved.
- Phase 7 boundary: retire `notification_deliveries` only after real governed
  attempt observability replaces its audit value.
- Anti-widening rule: no new caller or feature may reintroduce opportunity,
  wave or inbox persistence, or depend on delivery audit rows for control.
