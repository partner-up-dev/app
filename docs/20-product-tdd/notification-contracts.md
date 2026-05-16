# Notification Contracts

## Role In The System

Notification is the backend-owned reliability boundary for user attention opportunities.

It coordinates:

- notification opportunity lifecycle
- notification wave lifecycle
- user subscription quota consumption
- asynchronous eligibility revalidation
- channel dispatch results
- delivery-attempt observability

Transport integrations live behind channel adapters. Current production channels are WeChat subscription messages and WeChat template fallback for confirmation reminders. Future email and SMS channels should enter through the same adapter shape.

## Durable Backend State

Backend owns these notification records:

- `user_notification_opts`: user-level WeChat subscription quota and opt state
- `notification_opportunities`: one send opportunity per recipient, kind, aggregate, channel, run time, and dedupe key
- `notification_waves`: wave lifecycle state, currently used for PR message unread waves
- `notification_deliveries`: send-attempt outcomes for success, skipped, and failed delivery
- `jobs`: durable delayed execution with dedupe, lease, retry, and tolerance policy

`notification_opportunities` records intent. `notification_deliveries` records actual attempt outcome.

## Lifecycle Models

One-shot notifications represent a single opportunity created from a business condition:

- `REMINDER_CONFIRMATION`
- `ACTIVITY_START_REMINDER`
- `BOOKING_RESULT`
- `NEW_PARTNER`
- `MEETING_POINT_UPDATED`
- `WAITLIST_PROMOTED`
- `WAITLIST_ALTERNATIVE_AVAILABLE`

Wave notifications represent a bounded attention window:

- `PR_MESSAGE`

The current `PR_MESSAGE` policy opens one unread wave per `PR / recipient` and creates one delayed summary opportunity for that wave.

The `MEETING_POINT_UPDATED` policy creates one-shot notifications to current active PR participants when the effective public meeting-point guidance changes.

The `WAITLIST_PROMOTED` policy creates one one-shot notification for the user whose pending waitlist slot has just become active. Dispatch revalidates that the recipient is still active, still owns the promoted active partner slot, and still has enabled quota for this notification kind.

The `WAITLIST_ALTERNATIVE_AVAILABLE` policy creates one one-shot notification for a user who opted in from a source pending waitlist slot when another visible same-type and same-location PR has joinable capacity. Dispatch revalidates recipient activity, bound openId, enabled quota, source pending slot ownership and opt-in, source/candidate type-location match, candidate PR availability, and recipient time-window compatibility. Route-mode PRs carry no location, so this policy has no route-mode match until a route-specific matcher exists.

When `WAITLIST_ALTERNATIVE_AVAILABLE` quota turns positive, backend rescans that user's opted-in pending source waitlist slots so existing alternatives can be scheduled after the post-waitlist subscription prompt.

## Creation Contract

Business domains emit business events such as:

- `pr.message_created`
- `partner.joined`
- explicit waitlist promotion scheduling from PR participation logic
- exact same-type and same-location alternative PR availability from PR waitlist and candidate-availability logic
- booking execution submission through the admin booking execution flow

`domains/notification` evaluates those facts or the scheduling input, creates `notification_opportunities` / `notification_waves`, and emits notification-owned events:

- `notification.wave_opened`
- `notification.opportunity_created`

This keeps PR, Booking Support, and future domains coupled to business events and read models, while notification owns attention policy.

## Dispatch Contract

At dispatch time, backend reloads current state and revalidates:

- recipient user exists and is active
- recipient has a usable channel identity such as `openid`
- recipient still has enabled subscription quota for the notification kind
- PR participant membership is still active when the notification depends on PR membership
- source waitlist slot is still pending and opted in when dispatching `WAITLIST_ALTERNATIVE_AVAILABLE`
- source PR and candidate PR still share exact normalized type and location when dispatching `WAITLIST_ALTERNATIVE_AVAILABLE`
- candidate PR remains visible, joinable, and capacity-available when dispatching `WAITLIST_ALTERNATIVE_AVAILABLE`
- PR message unread wave is still pending when dispatching `PR_MESSAGE`
- the target channel is configured

`REMINDER_CONFIRMATION` scheduling treats `CONFIRM_START` as an exact lower-bound attention event: the earliest job claim time is at or after the resolved `confirmationStartAt`, while late execution remains allowed. `CONFIRM_END_MINUS_30M` keeps the coarse reminder tolerance policy.

Channel adapters return a neutral dispatch result:

- `SENT`
- `FAILED` with reason `CHANNEL_NOT_CONFIGURED`
- `FAILED` with reason `RECIPIENT_PERMISSION_REVOKED`
- `FAILED` with reason `TRANSPORT_ERROR`

The WeChat `43101` refusal signal maps to `RECIPIENT_PERMISSION_REVOKED`. That result clears remaining credits and cancels pending jobs for the affected user/kind where the current policy requires cleanup.

## PR Message Unread Wave Contract

`PR_MESSAGE` notification eligibility is at most one send per `PR / recipient / unread wave`.

The unread-wave opening rule is:

- collect current active participants except the author
- skip recipients without enabled `PR_MESSAGE` quota
- skip recipients with an existing pending unread wave
- persist `lastNotifiedMessageId`
- create a `notification_waves` row
- create a delayed `notification_opportunities` row
- schedule one DB-backed delayed job

The delayed job recomputes latest unread sender, latest unread timestamp, and unread count from persisted messages at execution time.

Read-marker advancement stays explicit through the message read-marker API. Hidden fetches and prefetches cannot clear unread-wave state.

## Frontend Contract

Frontend owns:

- route/page placement
- subscription modal presentation
- thread rendering
- composer input
- cache refresh
- user-facing fallback copy

Backend owns:

- notification eligibility
- quota consumption
- channel configuration truth
- unread-wave reset rules
- delivery result persistence

Frontend renders notification subscription management and prompts users after successful PR join when reminder registration is relevant for that PR. When PR confirmation is enabled, the join-success sequence places `REMINDER_CONFIRMATION` inside a dedicated confirmation follow-up and keeps the general recommendation follow-up focused on other PR reminders. Frontend then relies on backend responses and durable state for delivery-adjacent truth.

Frontend also prompts after successful waitlist entry for the focused `WAITLIST_PROMOTED` notification kind, and includes `WAITLIST_ALTERNATIVE_AVAILABLE` when the waitlist entry selected cross-PR alternative reminders.
