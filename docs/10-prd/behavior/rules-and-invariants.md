# Rules And Invariants

## 1. Product Object And Context Rules

- The core external collaboration object is `PartnerRequest`, surfaced product-side as `PR`.
- The durable product vocabulary uses one `PR` term across docs, routes, contracts, and UI.
- `PR` keeps shared semantics such as participation, time windows, partner thresholds, sharing, revisit, and messaging.
- `PR` may be entered from home and distribution paths or from Anchor Event context.
- PR messaging currently uses a dedicated `/pr/:id/messages` page rather than an inline detail-page composer.
- PR messaging may contain both participant-authored messages and operator-authored system messages; system messages are part of the same thread and remain visually identifiable as system-authored context.
- PR meeting-point guidance answers where participants should meet at or inside the primary location. Before a `PR` becomes `ACTIVE`, it may appear on the public PR detail surface. After the `PR` becomes `ACTIVE`, the guidance is visible only to current active participants.
- Anchor Event title is contextual display identity, not durable PR identity. `PR.type` remains the matching and context-resolution input; route summary and location remain place descriptors.
- A `PR` owns one place mode at a time. Location mode carries the primary location string. Route mode carries an ordered route and persists `location` as `null`.
- Route points carry display names and at least one coordinate pair so route surfaces can render markers and route geometry.
- When a `PR` has no explicit title, user-facing detail and share surfaces identify it by resolved Anchor Event title when one exists, then by `PR.type`, then by compact route summary or primary location, then by a generic `PR` label.
- The compact route summary uses the departure and destination point names as `route[0].name~route[-1].name`, with each endpoint truncated independently so the joined summary stays within 16 characters.

## 2. Creation And Publish Rules

- Natural-language and structured create commands always enter through one backend-owned create flow.
- If the creator already has an authenticated account, that create flow persists and publishes the PR in one operation.
- If the creator is anonymous, that create flow persists a `DRAFT` and waits for a later authenticated publish step.
- Structured creation uses one PR-owned form contract. Its `type` field accepts arbitrary input and may offer suggestion options from known event types.
- Structured creation uses one PR-owned `time_window` result. The UI may expose batch and free modes, while the persisted PR still owns one resolved time window. Persisted non-null PR time-window endpoints are instant datetimes, not date-only strings; request inputs may carry timezone offsets, and command boundaries canonicalize them before persistence.
- Structured creation uses one PR-owned place-mode result. Route-mode structured creation stores `route` and clears `location`; location-mode structured creation stores `location` and clears `route`.
- PR creation resolves Anchor Event context by PR type when a matching Anchor Event exists. Event-owned PR defaults such as default notes, join gates, and feedback questionnaire template selection materialize into PR-owned runtime state at creation time. Existing PR notes remain PR-owned content when the event default later changes.
- Event-context PR creation is frontend assistance from Anchor Event surfaces into unified structured PR creation.
- Event-assisted create resolves frontend-selected event-page choices into the same structured PR fields used by `/pr/new`. Any event referral or create-source marker is transient request context rather than durable PR identity.
- Anchor Event assisted creation can source suggested place choices from an event-owned `locationPool` or an event-owned `routePool`. A route-pool entry carries an event-local stable id plus the same ordered route payload used by `PR.route`, but that id is source-option identity rather than selected-route authority.
- Route-pool assisted creation selects a concrete `PR.route`. The frontend may locally reverse a source route before submitting; the submitted route is still an ordinary PR-owned route and does not have to correspond to another route-pool entry.
- A single Anchor Event owns one configured place pool mode at a time. Manual PR creation for the same `PR.type` remains governed by the PR create contract and may choose either PR place mode.
- Route-mode event-assisted create submits `PR.route` and persists `location = null`. Location-mode event-assisted create submits `PR.location` and persists `route = null`.
- PR existence does not depend on Anchor Event identity or time-pool selection.
- Natural-language creation may map the intent to an existing `PR.type`, map it to an existing Anchor Event type, or synthesize a new `PR.type`. Existing PR types have priority over Anchor Event types when both sources offer a candidate.
- User-created PR from Anchor Event context submits the unified PR create command. Unified PR creation owns creation policy, POI availability, creator publish identity, and creator time-window conflict checks.
- User-created and system-expanded PR creation must go through the unified PR create command, and that command rejects a `PR.time_window[0]` that has already passed. Admin PR creation remains a separate operator authority.
- Publishing a `DRAFT` PR requires an authenticated account.
- Publishing a `DRAFT` PR also rejects a `PR.time_window[0]` that has already passed.
- Direct user-owned creation of an `OPEN` PR, including event-assisted create, requires an authenticated account. System-owned auto-created PRs, including Form Mode zero-candidate auto-create and dummy PR materialization, do not assign the viewer as creator.
- `/e/:eventId` is the canonical Anchor Event landing entry for List, Card, and Form browsing. `/events/:eventId` is a compatibility entry that forwards to the same landing route.
- `/e/:eventId` landing mode supports `FORM`, `CARD_RICH`, and `LIST`. `LIST` uses the same Anchor Event list browsing semantics as the previous `/events/:eventId` list view.
- A valid `/e/:eventId?mode=` value is explicit route state and owns the current landing mode. Without valid route mode, the same user should keep a stable landing mode for the same event until the operator changes that event's landing assignment revision.
- If `/e/:eventId` cannot obtain its landing mode decision in time, it should still enter a usable `LIST` fallback experience.
- Form Mode recommendation and candidate ordering are backend-authored even though the user chooses location, start time, and preferences on the page.
- Form Mode may accept a fuzzy time preference as recommendation input by converting it in the frontend into concrete PR start-time match windows. The fuzzy time choices include part-of-day windows and an all-day option for one selected product-local date. These recommendation windows match candidate `PR.time_window[0]` only, are not constrained by the Anchor Event's configured time pool, and are not themselves persisted as fuzzy PR facts.
- Form Mode fuzzy date choices cover today plus the next 6 product-local days as individual dates; aggregate choices such as weekend or any day are not part of the first contract.
- Form Mode directly creates a system-owned `OPEN` PR when recommendation returns no matched PR and no ordered candidates; the viewer is not assigned as creator and the created PR detail page does not show the user-created request notice.
- Form Mode zero-candidate auto-create still creates a `PR` with one resolved `time_window`. In fuzzy mode, that resolved window is the selected fuzzy activity window materialized into instant datetimes, such as a product-local all-day or part-of-day window, and the created PR may materialize the same range into `allowEditAfterReady.timeWindow`. Product-local all-day windows use the half-open interval `[T 00:00, T+1 00:00)`.
- Form Mode bootstrap may preselect location and start time from the nearest joinable PR in the current Anchor Event context when that PR's start time is inside the event `earliestLeadMinutes` boundary.
- Anchor Event owns the event-specific preset preference tag pool, its moderation state, and which published tags later visitors may see in Form Mode.
- Anchor Event start rules may own optional description copy. Generated time windows inherit the first non-empty matching start-rule description by configured start-rule order, and that copy remains presentation context rather than a persisted PR fact.
- In Form Mode, derived preference categories come from the substring before the first `:` in the tag label; the same derived category is mutually exclusive while uncategorized labels may coexist.
- Form Mode may route users to submit a new POI location application. That application is POI-owned and not tied to one Anchor Event.
- User-submitted POIs start as `PENDING`; public location reads and Form Mode location gallery resolution use only `PUBLISHED` POIs.
- A published POI does not appear in an Anchor Event Form Mode unless that Anchor Event's location pool references the POI name.
- The Anchor Event landing page shows discoverable PRs whose `PR.type` resolves to that Anchor Event, grouped by each PR's own resolved time window.
- Event-page discovery reads root PR facts by Anchor Event context resolution and PR-owned time/place facts rather than by durable PR-side event linkage.
- Anchor Event List and Card modes may show frontend-generated dummy PR opportunities alongside real PRs. Dummy PRs are transient browser candidates, not backend PR discovery truth, and they materialize only after the user triggers the same detail intent used for real PR browse items.
- Dummy PR materialization is system-owned. It creates or returns a visible PR for the selected event time and place without assigning the viewer as creator, without auto-joining the viewer, and without checking the viewer's existing PR time-window commitments.
- Dummy PR browse items should use the same PR preview-card appearance and primary "查看详情" action language as real PR browse items. PR preview cards may show one inline preference label after place and before participant capacity when a PR has visible preferences.
- Dummy PR generation is bounded by event create windows, enabled place options, and the published preset preference tag pool. It may generate no-preference and single-tag candidates only, must exclude real-PR conflicts by time window and place, must not generate more than one dummy for the same time-window and place pair, should prefer staggered start times, and should show at most three dummy PRs across one or two product-local dates.
- Anchor Event owns whether a full PR can trigger automatic same-time-window PR expansion. The default policy is `DISABLED`; events with `ENABLED` may create a visible sibling PR after an event-context PR reaches full capacity while still in `OPEN`.
- Anchor Event may own a participation frequency limit. When configured as `X`, a user with a current active participation in that event must wait through the next `X` complete PRs in event time-window order before joining or waitlisting another PR in the same event; the following PR is eligible. Only current `JOINED`, `CONFIRMED`, and `ATTENDED` slots count as limiting history. `PENDING`, `EXITED`, `RELEASED`, and `CANCELLED` slots do not count as limiting history.

## 3. Lifecycle And Participation Rules

- The durable `PartnerRequest` status set is `DRAFT`, `OPEN`, `READY`, `ACTIVE`, `CLOSED`, and `EXPIRED`.
- `DRAFT` is creator-private draft state and must not appear in public PR browse surfaces, including Anchor Event List/Card browsing and search results.
- `FULL` is a user-visible derived capacity state, not a durable `PartnerRequest.status`: an `OPEN` PR with `maxPartners` present and current active participants greater than or equal to `maxPartners` is presented as full.
- `READY` means the collaboration object is formed and roster-locked; joining, waitlisting, and exiting are no longer allowed, and progression toward `ACTIVE` may still continue.
- `READY` locks roster admission, not every PR fact. A PR may carry PR-owned `allowEditAfterReady` policy that lets the current creator keep editing explicitly listed core fields after `READY`; fields absent from that policy remain locked.
- READY-after edits are current-creator-only. When a time edit would conflict with current participants' other active PR commitments, the default outcome is a 409 conflict. If the current creator explicitly confirms with `allowRelease`, the backend may release the conflicted participants with a stable `releaseReason`, as long as the remaining active participants still satisfy `minPartners`.
- `PartnerRequest` state is jointly shaped by partner thresholds, time windows, confirmation windows, and context-specific rules.
- When a PR reaches its close time, it expires only when current active participants are fewer than `minPartners`.
- When a PR reaches its close time with current active participants greater than or equal to `minPartners`, it closes automatically.
- `PartnerRequest.minPartners` must be an integer and `>= 1`. If `maxPartners` is present, it must satisfy both `maxPartners >= 2` and `maxPartners >= minPartners`.
- Auto-created paths must fall back to `2` when a valid `minPartners` is unavailable. Manual input paths must reject empty value, `0`, `maxPartners = 1`, and invalid bounds.
- If the user already joined a non-terminal PR whose time window conflicts with the target PR, the system must reject new join actions and any creation or publish action that would claim a slot.
- `PR` supports `join` and `exit`.
- `PartnerRequest.createdBy` represents the current creator responsibility, not an immutable original author. When a published PR with active participants has `createdBy = null`, the backend assigns the earliest active participant as current creator. When the current creator exits or is released, the backend transfers `createdBy` to the earliest remaining active participant, or clears it to `null` when no active participants remain.
- A full-capacity `OPEN` PR may accept waitlist entries while it remains before the join-lock boundary. `READY` keeps the admission surface closed.
- Waitlist submission is subject to Anchor Event participation frequency limits when the target PR belongs to an event with that policy.
- Waitlist entries are stored as `Partner.status = PENDING`. Cancelled waitlist entries are stored as `Partner.status = CANCELLED` and no longer hold queue position.
- Pending users are not current active participants, cannot see PR messages, and do not count toward active capacity.
- When an active slot is released or exited, the system promotes waitlisted users by earliest `waitlistedAt` first, subject to current eligibility checks. Promotion converts the existing pending slot into an active partner slot.
- A user entering a waitlist may opt in to cross-PR alternative availability reminders. The current match rule is exact normalized PR type plus exact normalized PR location, and the source waitlist slot keeps its queue position while reminders are sent. Route-mode PRs have `location = null`, so they stay outside that location-driven alternative reminder match until a route-specific match rule exists.
- Cross-PR alternative availability is an invitation to inspect or join another PR with capacity. The source waitlist slot closes as `CANCELLED` after the same user successfully joins a matching alternative PR.
- `PR` may carry join gates that must be completed before joining. Join gate definitions are PR-owned runtime configuration, while their resolved state comes from the owning fact for each gate kind.
- When a PR has no configured custom join gate, the frontend flow injects the relevant fallback confirmation view. When any custom join gate exists, the fallback confirmation is absent.
- Join notice gates are viewer-scoped agreements; each viewer must accept the current gate key and version before joining.
- `Partner` submodule may carry explicit confirmation and join-lock settings. Attendance follow-up may appear when the relevant collaboration module is active.
- Post-event feedback questionnaires are a capability parallel to PR. Anchor Event selects a reusable feedback questionnaire template, PR stores one mounted questionnaire instance pointer, and each submitted answer set is stored as a feedback questionnaire response.
- A questionnaire instance represents the mounted question definition snapshot for a consumer such as PR. Participant answers belong to response records keyed by the mounted instance and respondent identity.
- PR participation gating for mounted feedback is owned by PR integration. The feedback submission command validates questionnaire answers against the mounted instance and stores responses in the feedback capability.
- PR messages are visible only to current active participants; users who exit or are released must no longer see that PR's message thread.
- Only current active participants may view the thread or act on read markers and participant posting, while operators may inject system messages through admin tooling without becoming participants themselves.
- Study Sprint Pomodoro rooms are visible only to current active participants of an `ACTIVE` `STUDY_SPRINT` PR.
- Study Sprint Pomodoro timers are participant-owned and independent. Completing a timer does not exit the participant from the room and does not mutate PR participation state.
- Study Sprint Pomodoro aggregates are accountability summaries only. They must not update personal reputation, user reliability, PR punishment, reminders, or participant status in MVP.
- PR detail keeps notification-subscription management visible as a persistent section when reminder registration is relevant for that PR.
- The participant roster is opened from the facts-card participant row, and each participant badge remains a read-only navigation entry into that participant's profile page.
- PR detail resolves meeting-point guidance by fallback order: PR-specific configuration, Anchor Event location-specific configuration, Anchor Event default configuration, then POI configuration. Route-mode PRs carry `location = null`, so the backend returns only PR-specific meeting-point guidance; automatic Anchor Event and POI fallbacks resolve to empty. The resolved guidance is redacted from non-participant PR detail viewers after the PR becomes `ACTIVE`; the primary location remains visible for location-mode PRs.
- Updating meeting-point guidance keeps PR status, participation, and confirmation state stable while notifying current active participants through the dedicated meeting-point update notification path.
- Updating activity-core fields such as PR time, location, or route should notify current active participants through a core-field-change notification path. Time-conflict releases caused by such edits remain participant releases and must carry release reason context.

### Status Semantics

| Status            | Meaning                                           | Join Semantics                              |
| ----------------- | ------------------------------------------------- | ------------------------------------------- |
| `DRAFT`           | unpublished draft held by the creator             | not joinable                                |
| `OPEN`            | published and still admitting participants        | joinable while below capacity; full-capacity `OPEN` may be waitlistable before join lock |
| `READY`           | formed and roster-locked                          | not joinable, not exitable, and not waitlistable |
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

## 3.1 Commerce Ordering Rules

- PR-attached ordering is entered through a backend-authored Button Placement on PR detail and assembled on `/order/new`.
- At most one non-terminal order should exist for one PR and Offer pair. Re-opening the matching placement should continue the existing order instead of creating a second one.
- Offer Listing is the user-visible quote surface. A listing may include only products and SKUs that are currently offerable for the selected context.
- Quote identity is the freshness and authorization boundary between listing and create-order. Create-order should use quote identity instead of trusting browser-copied product, route, participant, or price fields.
- Expired quotes require a fresh listing and a second explicit user create action. The system should preserve matching user selections after refresh when those selections are still listed.
- Rental ordering buys one fixed quoted SKU.
- RideHailing ordering authorizes a choice set: the user selects one or more acceptable vehicle candidates, and the provider/order lifecycle resolves one final vehicle after dispatch.
- RideHailing visible vehicle candidates depend on route and departure time. Provider-unavailable candidates should be absent from the list, not shown as disabled options with reasons.
- RideHailing displayed price before create is the selected candidate range, not the final bill cap.
- RideHailing final bill follows the resolved provider settlement. A provider upgrade or substitution outside the selected candidate set is recorded rather than rejected, and the final settlement remains the bill basis.
- Before a user cancels an active RideHailing order from Order Detail, the product should query the provider's current cancellation-fee preview and show the fee before the user confirms cancellation. If the previewed fee is greater than zero, the user must explicitly accept that fee before the cancellation request is sent.
- If RideHailing provider dispatch fails during create-order, the domain may create and cancel an order, but the user experience remains an ordering failure dialog on `/order/new` rather than navigation to Order Detail.

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
- Confirmation can be disabled at PR level. When disabled, the PR has no confirm action, confirmation reminders, confirmation-window auto-confirm, or confirmation-deadline slot release. Join lock, check-in, and the persistent PR detail notification-subscription management path continue to use their own eligibility rules.
- Check-in feedback is not mandatory by default; absence of check-in should remain "unknown" rather than auto-converted into "did not attend".
- Mounted post-event feedback is optional unless the PR integration presents it for the current collaboration. Absence of a questionnaire response is tracked as missing feedback for that questionnaire instance, separate from attendance state.
- PR messaging is a non-realtime coordination layer and must not introduce chat-room semantics such as presence, typing, or read receipts.
- Notification subscription is modeled by remaining send quota, not by a simple toggle.
- Successful join in a PR that supports reminder registration should immediately offer the join-success follow-up sequence while leaving a durable management path on the detail page. When confirmation is enabled, the sequence first shows a dedicated confirmation follow-up explaining confirmation importance, the confirmation window, the slot-release consequence, and the confirmation reminder subscription. The general notification-subscription follow-up then focuses on new-partner reminders and meeting-point reminders. After those follow-ups, join success may show one combined community follow-up view for the Anchor Event beta group and official-account follow prompt.
- The dedicated confirmation follow-up includes the confirmation deadline when that deadline is known. PRs with confirmation disabled start the join-success sequence at the general notification-subscription follow-up.
- Confirmation-start reminders must become claimable and deliverable at or after the configured confirmation-start instant, because the linked confirm action is backend-gated by the same window.
- Successful waitlist entry should offer a focused `WAITLIST_PROMOTED` subscription prompt so the user can receive one notification when the pending slot becomes active.
- Successful waitlist entry may also offer `WAITLIST_ALTERNATIVE_AVAILABLE` when the user selected cross-PR alternative reminders for that waitlist slot.
- PR message notifications are limited to at most one send per `PR / recipient / unread wave`.
- The current `PR_MESSAGE` timing policy is one fixed short-debounce summary opportunity per unread wave.
- Before a PR message notification is sent, the system must re-validate that the recipient is still a current active participant of that PR.
- Availability of join, confirm, and similar operations is enforced on backend write paths; frontend may use preflight reads to surface the same guardrails before the user acts.
- The join command remains authoritative for unresolved join gates and must reject joining when any configured custom gate is unresolved for the current viewer or PR.
- Notification cards and prompts are contributed by their owning modules, so confirmation and other features can add notification items without one central interpreter inside the card container.

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
- Event-specific beta groups are support and event-coordination entrypoints. They may help users request new sessions or coordinate Anchor Event context, and backend-owned PR messaging keeps participant visibility and participant rules authoritative.
- PR detail and join-success follow-up may expose the current Anchor Event beta-group QR when the PR resolves to an event with that QR configured.
- Build metadata shown in `/about` must be interpretable in the current runtime and must not depend on a local git checkout inside the browser environment.
- Operator-managed configuration counts as product behavior whenever it changes a user-visible path.
