# D6-N-01 Discussion Log — Template, Task, Channel, Preference

## Initial Proposal And Initial Recommendation

Sir proposed:

1. remove the reminder-scheduler layer;
2. expose a Notification API based on template, channel and payload;
3. let Notification create the job;
4. let the job ultimately trigger `NotificationChannel.send`;
5. view `user_notification_opts` as a coherent preference-plus-credit model;
6. use Job metadata, handler, payload and schedule configuration as the
   Notification Task, with no separate Notification Intent.

The initial recommendation agreed with removing per-kind scheduling glue and
narrowing the channel, but incorrectly promoted `notification_opportunity` to
a required **Notification Intent** and separated preference from credit too
strongly. The external reference and current-source lifecycle audit do not
support those requirements. They are explicitly withdrawn below.

## External Reference: Business Template To Channel Template

The historical repository contains two relevant shapes:

1. On its `main` branch, a central WeChat configuration maps stable business
   names such as `partner_application` to provider template IDs and maps
   friendly business payload fields to provider-specific field names. Business
   event code asks for the binding by business name, constructs mapped data,
   and only then calls the provider send function.
2. On the later checked-out implementation, a typed `NotificationContent`
   renders itself through channel-specific methods such as
   `to_wxmp_submessage`, and `NotificationManager` delegates a typed task to a
   channel manager. Some business content classes hard-code provider template
   IDs, which is less maintainable than the central binding registry.

Both shapes prove the important distinction:

```text
business template ID ≠ provider/channel template ID
```

Therefore Sir's mapping proposal is sound. The target should preserve a stable
business template vocabulary and put `(businessTemplateId, channelType) →
channel template binding + renderer` inside Notification configuration/code.
The channel adapter receives only a rendered channel notification.

The historical manager does **not** prove reliability semantics: it has no
durable scheduling, retry, preference/credit revalidation, delivery ledger, or
normalized provider outcome. Those responsibilities must come from the current
JobRunner and Notification model rather than being copied from the old code.

## User Notification Option: Preference Plus Credit Is Coherent

One user action can establish both product intent and a limited provider
entitlement. Keeping them in one `UserNotificationOption` aggregate/table is
therefore reasonable:

```text
canSend = preferred && (credit is null || credit > 0)
```

- `preferred` records the user's current consent/desire for this business
  notification and channel.
- `credit = null` means the channel is not quota-limited (for example a future
  email/SMS channel); a non-negative integer is a consumable entitlement.
- exhausting limited credit need not erase durable preference. The fields have
  different transition rules even when one aggregate owns both.
- `null` must never also mean “not loaded”, “unknown”, or “provider not
  configured”. A domain type such as `UNLIMITED | LIMITED(remaining)` can make
  this invariant explicit even if storage uses nullable credit.

Channel/provider capability—configured credentials, provider availability,
and template availability—remains adapter/config state. It should not be
conflated with the user's option merely because both affect `canSend`.

## Job Is The Durable Notification Task

Current `notification_opportunities` are created and marked scheduled, but the
source audit found no dispatch read path and no meaningful terminal lifecycle
transition. The Job already stores job type, payload, status, `runAt`, timing
fields, attempts, lease state and dedupe identity. A separate persisted
Notification Intent would duplicate the same work identity without presently
adding an independently consumed business fact.

The revised target therefore treats the Job row as the durable
**Notification Task**. Its definition must provide:

- a versioned handler identity, e.g. `notification.send.v1`;
- typed/versioned Notification payload;
- business template ID, recipient/channel, aggregate causation and correlation;
- schedule/timing policy and stable dedupe key;
- an atomic or explicitly recoverable insertion boundary with the business
  transition when losing the notification task is unacceptable.

This removes Notification Intent as a concept and makes
`notification_opportunities` a retirement/consolidation candidate. It does not
mean “run the raw channel method as the handler.” The generic Notification Job
handler must still:

1. decode and validate the task;
2. revalidate preference/credit and relevant current business state;
3. resolve the business-template/channel binding and render;
4. call the narrow channel port;
5. consume/clear limited credit or persist any Notification-owned consequence
   where appropriate;
6. classify the result into the generic Job disposition; and
7. emit correlated, bounded attempt evidence to O11y rather than a target
   delivery-attempt table.

Several attempts can belong to one Job. D6-J-02 and Sir's later owner
correction place pure attempt history in observability and only generic task
control on Job. Any provider ambiguity that becomes business reconciliation
truth belongs to Notification or the originating semantic owner. Wave becomes
a Job creation reservation rather than a Notification/PR entity.

## What “Remove Reminder Scheduler” Now Means

Remove the family of per-kind modules that repeat job type registration,
payload parsing, scheduling, handler glue, rendering and delivery bookkeeping.
Retain the necessary behavior as declarative data split across:

- Notification business-template definition;
- Job schedule configuration / metadata;
- the generic `notification.send.v1` handler; and
- any genuinely kind-specific revalidation/rendering policy.

JobRunner owns generic due-time, claim, lease and retry mechanics. Notification
owns what task to create, the business template binding, user option semantics,
execution-time eligibility and delivery outcome classification.

## Important Constraints Retained

- Current business state and Job writes are often separate calls. Where the
  notification must not be lost, source work needs a transaction-aware
  scheduling port or a visible recovery handoff.
- The current WeChat provider request has no idempotency key. A stable Job and
  delivery key cannot prove exactly-once send after “accepted but response
  lost.”
- Existing `wechat.*` pending/retry Jobs need a decoder/migration/drain strategy
  before a generic job type replaces them.
- Job status represents executor lifecycle, not every provider attempt. At this
  intermediate point the discussion retained a delivery ledger; ratified
  D6-J-02 supersedes that placement with correlated O11y for pure history and
  durable Job state only for control/recovery.

## Correction Summary

The earlier recommendation “Notification Intent + Job” is superseded by:

```text
Notification Task = Job
Notification attempt history = observability (D6-J-02 ratified)
Notification control/recovery outcome = Job (D6-J-02 ratified)
Notification message-attention window = Job creation reservation (D6-J-02 ratified)
User preference + nullable credit = one UserNotificationOption aggregate
```
