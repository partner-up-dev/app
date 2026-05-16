# Rules And Invariants

## 1. Product Object And Context Rules

- The core external collaboration object is `PartnerRequest`, surfaced product-side as `PR`.
- The durable product vocabulary uses one `PR` term across docs, routes, contracts, and UI.
- `PR` keeps shared semantics such as participation, time windows, partner thresholds, sharing, revisit, and messaging.
- `PR` may be entered from home and distribution paths or from Anchor Event context.
- PR messaging currently uses a dedicated `/pr/:id/messages` page rather than an inline detail-page composer.
- PR messaging may contain both participant-authored messages and operator-authored system messages; system messages are part of the same thread and remain visually identifiable as system-authored context.
- PR meeting-point guidance answers where participants should meet at or inside the primary location. Before a `PR` becomes `ACTIVE`, it may appear on the public PR detail surface. After the `PR` becomes `ACTIVE`, the guidance is visible only to current active participants.
- A `PR` owns one place mode at a time. Location mode carries the primary location string. Route mode carries an ordered route and persists `location` as `null`.
- Route points carry display names and at least one coordinate pair so route surfaces can render markers and route geometry.
- When a `PR` has no explicit title, user-facing detail and share surfaces identify it by compact route summary when present, then by primary location, then by type, then by a generic `PR` label.
- The compact route summary uses the departure and destination point names as `route[0].name~route[-1].name`, with each endpoint truncated independently so the joined summary stays within 16 characters.

## 2. Creation And Publish Rules

- Natural-language and structured create commands always enter through one backend-owned create flow.
- If the creator already has an authenticated account, that create flow persists and publishes the PR in one operation.
- If the creator is anonymous, that create flow persists a `DRAFT` and waits for a later authenticated publish step.
- Structured creation uses one PR-owned form contract. Its `type` field accepts arbitrary input and may offer suggestion options from known event types.
- Structured creation uses one PR-owned `time_window` result. The UI may expose batch and free modes, while the persisted PR still owns one resolved time window.
- Structured creation uses one PR-owned place-mode result. Route-mode structured creation stores `route` and clears `location`; location-mode structured creation stores `location` and clears `route`.
- PR creation resolves Anchor Event context by PR type when a matching Anchor Event exists. Event-owned PR defaults such as default notes, join gates, support resources, and feedback questionnaire template selection materialize into PR-owned runtime state at creation time. Existing PR notes remain PR-owned content when the event default later changes.
- Event-context PR creation is one assisted mode inside the Anchor Event domain.
- Event-assisted create resolves event-side choices into the same structured PR fields used by `/pr/new`. Any event referral or create-source marker is transient request context rather than durable PR identity.
- PR existence does not depend on Anchor Event identity or time-pool selection.
- Natural-language creation may map the intent to an existing Anchor Event context or synthesize a new `PR.type`.
- User-created PR from Anchor Event context uses the controlled event-page flow and remains constrained by that event page's local rules. The persisted PR still keeps only PR-owned facts.
- Publishing a `DRAFT` PR requires an authenticated account.
- Direct creation of an `OPEN` PR, including event-assisted create, requires an authenticated account.
- `/e/:eventId` is an Anchor Event landing entry distinct from `/events/:eventId`; the two routes address the same event object with different product roles.
- `/e/:eventId` landing mode supports `FORM`, `CARD_RICH`, and `LIST`. `LIST` uses the same Anchor Event list browsing semantics as the list view on `/events/:eventId`.
- The same user should keep a stable landing mode for the same event until the operator changes that event's landing assignment revision.
- If `/e/:eventId` cannot obtain its landing mode decision in time, it should still enter a usable `FORM` fallback experience.
- Form Mode recommendation and candidate ordering are backend-authored even though the user chooses location, start time, and preferences on the page.
- Form Mode directly creates an event-assisted PR when recommendation returns no matched PR and no ordered candidates; the created PR detail page should show a created-request notice.
- Form Mode bootstrap may preselect location and start time from the nearest joinable PR in the current Anchor Event context when that PR's start time is inside the event `earliestLeadMinutes` boundary.
- Anchor Event owns the event-specific preset preference tag pool, its moderation state, and which published tags later visitors may see in Form Mode.
- Anchor Event start rules may own optional description copy. Generated time windows inherit the first non-empty matching start-rule description by configured start-rule order, and that copy remains presentation context rather than a persisted PR fact.
- In Form Mode, derived preference categories come from the substring before the first `:` in the tag label; the same derived category is mutually exclusive while uncategorized labels may coexist.
- Form Mode may route users to submit a new POI location application. That application is POI-owned and not tied to one Anchor Event.
- User-submitted POIs start as `PENDING`; public location reads and Form Mode location gallery resolution use only `PUBLISHED` POIs.
- A published POI does not appear in an Anchor Event Form Mode unless that Anchor Event's location pool references the POI name.
- The Anchor Event page shows discoverable PRs under the same activity type and time-pool rules.
- Event-page discovery reads root PR facts by activity type, resolved time window, and event-owned location rules rather than by durable PR-side event linkage.
- Anchor Event owns whether a full PR can trigger automatic same-time-window PR expansion. The default policy is `DISABLED`; events with `ENABLED` may create a visible sibling PR after an event-context PR reaches `FULL`.
- Anchor Event may own a participation frequency limit. When configured as `X`, a user with a current active participation in that event must wait through the next `X` complete PRs in event time-window order before joining or waitlisting another PR in the same event; the following PR is eligible. Only current `JOINED`, `CONFIRMED`, and `ATTENDED` slots count as limiting history. `PENDING`, `EXITED`, `RELEASED`, and `CANCELLED` slots do not count as limiting history.

## 3. Lifecycle And Participation Rules

- The visible `PartnerRequest` status set is `DRAFT`, `OPEN`, `READY`, `FULL`, `LOCKED_TO_START`, `ACTIVE`, `CLOSED`, and `EXPIRED`.
- `LOCKED_TO_START` means the collaboration object has entered the pre-start lock window; joining is no longer allowed, and progression toward `ACTIVE` may still continue.
- `PartnerRequest` state is jointly shaped by partner thresholds, time windows, confirmation windows, and context-specific rules.
- When a PR reaches its close time, it expires only when current active participants are fewer than `minPartners`.
- When an `ACTIVE` PR reaches its close time with current active participants greater than or equal to `minPartners`, it closes automatically.
- `PartnerRequest.minPartners` must be an integer and `>= 1`. If `maxPartners` is present, it must satisfy both `maxPartners >= 2` and `maxPartners >= minPartners`.
- Auto-created paths must fall back to `2` when a valid `minPartners` is unavailable. Manual input paths must reject empty value, `0`, `maxPartners = 1`, and invalid bounds.
- If the user already joined a non-terminal PR whose time window conflicts with the target PR, the system must reject new join actions and any creation or publish action that would claim a slot.
- `PR` supports `join` and `exit`.
- A `FULL` PR may accept waitlist entries while it remains before the join-lock boundary. `LOCKED_TO_START` keeps the admission surface closed.
- Waitlist submission is subject to Anchor Event participation frequency limits when the target PR belongs to an event with that policy.
- Waitlist entries are stored as `Partner.status = PENDING`. Cancelled waitlist entries are stored as `Partner.status = CANCELLED` and no longer hold queue position.
- Pending users are not current active participants, cannot see PR messages, and do not count toward active capacity.
- When an active slot is released or exited, the system promotes waitlisted users by earliest `waitlistedAt` first, subject to current eligibility checks. Promotion converts the existing pending slot into an active partner slot.
- A user entering a waitlist may opt in to cross-PR alternative availability reminders. The current match rule is exact normalized PR type plus exact normalized PR location, and the source waitlist slot keeps its queue position while reminders are sent. Route-mode PRs have `location = null`, so they stay outside that location-driven alternative reminder match until a route-specific match rule exists.
- Cross-PR alternative availability is an invitation to inspect or join another PR with capacity. The source waitlist slot closes as `CANCELLED` after the same user successfully joins a matching alternative PR.
- `PR` may carry join gates that must be completed before joining. Join gate definitions are PR-owned runtime configuration, while their resolved state comes from the owning fact for each gate kind.
- When a PR has no configured custom join gate, the frontend flow injects the relevant fallback confirmation view. When any custom join gate exists, the fallback confirmation is absent.
- Join notice gates are viewer-scoped agreements; each viewer must accept the current gate key and version before joining.
- Booking contact gates require a usable user phone number for platform passthrough booking. Their presence is explicit join-gate configuration rather than an implicit result of booking-required or platform-handled booking flags.
- `Partner` submodule may carry explicit confirmation and join-lock settings. Attendance follow-up may appear when the relevant collaboration module is active.
- Post-event feedback questionnaires are a capability parallel to PR. Anchor Event selects a reusable feedback questionnaire template, PR stores one mounted questionnaire instance pointer, and each submitted answer set is stored as a feedback questionnaire response.
- A questionnaire instance represents the mounted question definition snapshot for a consumer such as PR. Participant answers belong to response records keyed by the mounted instance and respondent identity.
- PR participation gating for mounted feedback is owned by PR integration. The feedback submission command validates questionnaire answers against the mounted instance and stores responses in the feedback capability.
- PR messages are visible only to current active participants; users who exit or are released must no longer see that PR's message thread.
- Only current active participants may view the thread or act on read markers and participant posting, while operators may inject system messages through admin tooling without becoming participants themselves.
- PR detail keeps notification-subscription management visible as a persistent section when reminder registration is relevant for that PR.
- The participant roster is opened from the facts-card participant row, and each participant badge remains a read-only navigation entry into that participant's profile page.
- PR detail resolves meeting-point guidance by fallback order: PR-specific configuration, Anchor Event location-specific configuration, Anchor Event default configuration, then POI configuration. Route-mode PRs carry `location = null`, so location-specific Anchor Event and POI meeting-point fallbacks naturally skip. The resolved guidance is redacted from non-participant PR detail viewers after the PR becomes `ACTIVE`; the primary location remains visible for location-mode PRs.
- Updating meeting-point guidance keeps PR status, participation, and confirmation state stable while notifying current active participants through the dedicated meeting-point update notification path.

### Status Semantics

| Status            | Meaning                                           | Join Semantics                              |
| ----------------- | ------------------------------------------------- | ------------------------------------------- |
| `DRAFT`           | unpublished draft held by the creator             | not joinable                                |
| `OPEN`            | published and not yet formed                      | joinable                                    |
| `READY`           | minimum viable group reached and waiting to start | joinable until blocked by other rules       |
| `FULL`            | maximum partner count reached                     | not joinable; waitlistable before join lock |
| `LOCKED_TO_START` | pre-start lock window                             | not joinable and not waitlistable           |
| `ACTIVE`          | in progress                                       | normally no longer accepts new joins        |
| `CLOSED`          | successfully concluded after active execution     | not joinable                                |
| `EXPIRED`         | ended because the close boundary arrived before minimum viable participation was met | not joinable                                |

`Partner` progression may additionally pass through confirmation-window, reminder, new-partner, and attendance follow-up loops when the corresponding modules are active.

### Participation Lifecycle Semantics

1. A slot starts as joinable.
2. A user joins and becomes active.
3. When the `Partner` submodule carries a confirmation window, the participant may enter confirmation semantics.
4. A user may also hold a pending waitlist slot when a full PR still admits waitlist entries. A pending waitlist slot may be cancelled before promotion.
5. The participant may exit, be released, or complete check-in.
6. Once no longer active, the participant must not be treated as a current participant.

## 4. Identity And Authentication Rules

- Browsing does not require upfront login.
- Anonymous UUID continuity supports revisit without an upfront login gate.
- Actions that require stronger identity guarantees use an authenticated session. In the current product, public users obtain that authenticated session through WeChat OAuth, which also binds the account to a WeChat `openid`.
- Identity should support collaboration instead of becoming the initial gate for every path.

### User Relationship Progression

1. anonymous browse
2. anonymous UUID session recovery
3. authenticated session continuity
4. optional WeChat binding
5. participation in actions that require stronger identity guarantees

## 5. Reliability Rules

- Partner admission may have a confirmation window when its explicit configuration carries one and confirmation is enabled. Unconfirmed slots may be released inside that window, and late joining may be blocked.
- Confirmation can be disabled at PR level. When disabled, the PR has no confirm action, confirmation reminders, confirmation-window auto-confirm, or confirmation-deadline slot release. Join lock, check-in, booking support, and the persistent PR detail notification-subscription management path continue to use their own eligibility rules.
- Check-in feedback is not mandatory by default; absence of check-in should remain "unknown" rather than auto-converted into "did not attend".
- Mounted post-event feedback is optional unless the PR integration presents it for the current collaboration. Absence of a questionnaire response is tracked as missing feedback for that questionnaire instance, separate from attendance state.
- PR messaging is a non-realtime coordination layer and must not introduce chat-room semantics such as presence, typing, or read receipts.
- Notification subscription is modeled by remaining send quota, not by a simple toggle.
- Successful join in a PR that supports reminder registration should immediately offer the notification-subscription modal while still leaving a durable management path on the detail page.
- The successful-join notification-subscription modal focuses on confirmation reminders, new-partner reminders, and meeting-point reminders, with copy explaining the reason to subscribe. Confirmation reminder copy includes the confirmation deadline when that deadline is known. PRs with confirmation disabled omit the confirmation reminder recommendation from this join-success modal.
- Confirmation-start reminders must become claimable and deliverable at or after the configured confirmation-start instant, because the linked confirm action is backend-gated by the same window.
- Successful waitlist entry should offer a focused `WAITLIST_PROMOTED` subscription prompt so the user can receive one notification when the pending slot becomes active.
- Successful waitlist entry may also offer `WAITLIST_ALTERNATIVE_AVAILABLE` when the user selected cross-PR alternative reminders for that waitlist slot.
- PR message notifications are limited to at most one send per `PR / recipient / unread wave`.
- The current `PR_MESSAGE` timing policy is one fixed short-debounce summary opportunity per unread wave.
- Before a PR message notification is sent, the system must re-validate that the recipient is still a current active participant of that PR.
- Availability of join, confirm, booking-contact handoff, and similar operations is enforced on backend write paths; frontend may use preflight reads to surface the same guardrails before the user acts.
- The join command remains authoritative for unresolved join gates and must reject joining when any configured custom gate is unresolved for the current viewer or PR.
- Notification cards and prompts are contributed by their owning modules, so confirmation, booking, and other features can add notification items without one central interpreter inside the card container.
- Only `PLATFORM_PASSTHROUGH` booking requires at least one active participant or the joining viewer to have `users.phone_number`. Standard `PLATFORM` booking must keep that requirement absent.
- When multiple active participants have phone numbers, booking support uses the earliest active participant with `users.phone_number` as the booking contact.
- The platform-handled booking pending workspace admits PRs that are in `READY`, `FULL`, or `LOCKED_TO_START` and still meet minimum active-participant count. It does not require participants to be `CONFIRMED`.
- When the booking deadline is reached, invalidation may depend on whether active participants still meet minimum viable count. Lack of confirmation alone must not auto-release the group or mark it unformed.
- Once a PR enters the platform booking fulfillment stage, operator results must be auditable and notification results must target current active participants rather than only the booking-contact owner.
- Manual operator release of an invalid booking contact clears that user's `users.phone_number` and records the user-level clearing together with the PR release audit semantics.

## 6. Distribution And Revisit Rules

- PR pages must remain re-enterable through public links.
- Share links may carry `spm` attribution and continue through the current browser session.
- Home, event pages, personal center, and history list all support revisit and re-entry.

## 7. Profile And Support Rules

- Participant profile pages are read-only and do not own editing behavior.
- `/me` owns the current user's personal-center IA. Its profile surface should keep avatar, nickname, WeChat identity state or bind action, and anonymous user id continuity together.
- When the current user has no WeChat official-account `openid`, the `/me` profile surface should offer the WeChat bind action at the identity position. When the user is bound, it should show the bound state.
- `/me` logout clears the browser's current user session and starts a fresh anonymous UUID session for continued anonymous browsing.
- `/me` should present PR history and POI application history as equal shortcuts under the profile surface while keeping `/pr/mine` as the dedicated PR history route.
- The "Need Help" path must keep support, author feedback, and about-page routing distinct.
- Event-specific beta groups are support and activity-coordination entrypoints. They may help users request new sessions, get booking/subsidy support, or coordinate activity context, and backend-owned PR messaging keeps participant visibility and participant rules authoritative.
- Build metadata shown in `/about` must be interpretable in the current runtime and must not depend on a local git checkout inside the browser environment.
- Operator-managed configuration counts as product behavior whenever it changes a user-visible path.
