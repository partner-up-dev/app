# Rules And Invariants

## 1. Product Object And Context Rules

- The core external collaboration object is `PartnerRequest`, surfaced product-side as `PR`.
- The durable product vocabulary uses one `PR` term across docs, routes, contracts, and UI.
- `PR` keeps shared semantics such as participation, time windows, partner thresholds, sharing, revisit, and messaging.
- `PR` may be entered from home, `/prd`, and distribution paths.
- PR messaging currently uses a dedicated `/pr/:id/messages` page rather than an inline detail-page composer.
- PR messaging may contain both participant-authored messages and operator-authored system messages; system messages are part of the same thread and remain visually identifiable as system-authored context.
- PR meeting-point guidance answers where participants should meet at or inside the primary location. Before a `PR` becomes `ACTIVE`, it may appear on the public PR detail surface. After the `PR` becomes `ACTIVE`, the guidance is visible only to current active participants.
- `PR.type` is the matching and type-specific behavior input, not a second identity. Route summary and location remain place descriptors.
- A `PR` owns one place mode at a time. Location mode carries the primary location string. Route mode carries an ordered route and persists `location` as `null`.
- Route points carry display names and at least one coordinate pair so route surfaces can render markers and route geometry.
- When a `PR` has no explicit title, user-facing detail and share surfaces identify it by `PR.type`, then by compact route summary or primary location, then by a generic `PR` label.
- The compact route summary uses the departure and destination point names as `route[0].name~route[-1].name`, with each endpoint truncated independently so the joined summary stays within 16 characters.

## 2. Creation And Publish Rules

- Natural-language and structured create commands always enter through one system-owned create flow.
- A USER create command requires an authenticated account before any PR or child persistence; successful USER creation persists and publishes an `OPEN` PR in one operation and binds `createdBy` to that authenticated user.
- An anonymous visitor may author transiently, but the public H5 create path creates no server-side `DRAFT` and has no automatic create replay after OAuth.
- Structured creation uses one PR-owned form contract. Its `type` field accepts arbitrary input and may offer suggestion options from the current PR type catalog.
- Structured creation uses one PR-owned `time_window` result. The UI may expose batch and free modes, while the persisted PR still owns one resolved time window. Persisted non-null PR time-window endpoints are instant datetimes, not date-only strings; request inputs may carry timezone offsets, and creation boundaries canonicalize them before persistence.
- Structured creation uses one PR-owned place-mode result. Route-mode structured creation stores `route` and clears `location`; location-mode structured creation stores `location` and clears `route`.
- PR creation may consume current type-specific defaults by `PR.type` (for example notes, join gates, confirmation policy, partner bounds, and questionnaire selection). Those values materialize into PR-owned runtime state at creation time; later current-configuration edits do not rewrite existing PR facts.
- PR Discovery handoff resolves criteria and place choices into the same structured PR fields used by `/pr/new`. Referral or view markers are transient request context rather than durable PR identity.
- Type-specific place choices may provide location or ordered route suggestions. A selected route is an ordinary PR-owned route; reversing a suggestion does not require another catalog identity.
- Manual PR creation for the same `PR.type` remains governed by the PR create contract and may choose either PR place mode.
- PR existence does not depend on a template, scenario, or discovery-session identity.
- Natural-language creation may map the intent to an existing `PR.type` or synthesize a new `PR.type`; existing types have priority over suggestions when both sources offer a candidate.
- User-created PR from `/prd` submits the unified PR create command. PR Authoring owns creation policy, POI availability, creator publish identity, and creator time-window conflict checks.
- User-created and system-expanded PR creation must go through the unified PR create command, and that command rejects a `PR.time_window[0]` that has already passed. Admin PR creation remains a separate operator authority.
- Publishing a `DRAFT` PR requires an authenticated account.
- Publishing a `DRAFT` PR also rejects a `PR.time_window[0]` that has already passed.
- Direct user-owned creation of an `OPEN` PR, including `/prd`-sourced Authoring, requires an authenticated account. The retained system-owned full-capacity expansion path does not assign a viewer as creator.
- No public or enterprise/WeCom ingress may persist an anonymous or creatorless USER `DRAFT`; explicit `ADMIN` and `SYSTEM` authorities remain separate actor cases and are not anonymous-user fallbacks.
- `/prd` is the canonical PR Discovery entry for `FORM`, `CARD`, and `LIST` views. `FORM` gathers criteria and hands no-match intent to PR Authoring, `CARD` groups joinable candidates, and `LIST` owns date-based browsing.
- View ratios are current presentation policy only. Preserve the current default vector (`FORM=50`, `CARD=50`, `LIST=0`) and any configured override values; do not persist assignment/history or rebucketing metadata, and resolve an all-zero or missing configuration to `LIST`.
- Server view resolution falls back to `LIST` after 500 ms. Non-timeout type or view-resolution failures must leave an explicit route back to the unscoped `/prd` catalog.
- Form Mode recommendation and candidate ordering are system-authored even though the user chooses location, start time, and preferences on the page.
- Form Mode recommendation accepts concrete start/end instants. Current type start rules may supply concrete suggestions; custom time entry remains transient criteria and no time-editor mode or fuzzy-time object is persisted.
- Form Mode hands no-match criteria to ordinary PR Authoring and has no create side effect. The concrete time window is handed off with type, place, and preferences.
- The current PR-type preference catalog and moderation state supply published tags for Form Mode; custom labels may be submitted as pending moderation without blocking recommendation.
- Type-specific start rules may provide optional description copy. Generated time windows inherit the first non-empty matching description by configured rule order, and that copy remains presentation context rather than a persisted PR fact.
- Form Mode may route users to submit a new POI location application. That application is POI-owned and not tied to one PR or type.
- User-submitted POIs start as `PENDING`; public PR Authoring location suggestions use only `PUBLISHED` POIs.
- A published POI appears in Form Mode only when the selected PR type's current location choices reference the POI name.
- `/prd` shows discoverable PRs grouped by each PR's own resolved time window and selected type/date criteria.
- PR Discovery reads canonical PR facts by `PR.type` and PR-owned time/place facts; it never needs a durable PR-side context link.
- `CARD` renders joinable `OPEN` candidates. `LIST` renders `OPEN`, `READY`, and `ACTIVE` records in current/future date groups plus at most the three most recent past date groups containing `CLOSED` records; past groups show only `CLOSED`, and `EXPIRED` stays hidden.
- LIST and CARD may render transient creation suggestions beside persisted records. Suggestions have no PR identity, status, or canonical path and become ordinary PRs only through PR Authoring.
- A no-match Authoring handoff is transient route/process state, not a PR. It receives durable identity only after the ordinary create command returns a `prId`.
- PR preview cards may show one inline preference label after place and before participant capacity when a persisted PR has visible preferences.
- PR Participation owns whether a full PR can trigger additional same-time-window supply. The default policy is `DISABLED`; an enabled type policy may request a visible sibling PR while the source remains `OPEN`.
- PR Participation may enforce a type-specific frequency limit. When configured as `X`, a user with a current active participation must wait through the next `X` complete PRs in time-window order before joining or waitlisting another PR of the same type; the following PR is eligible. Only current `JOINED`, `CONFIRMED`, and `ATTENDED` slots count as limiting history. `PENDING`, `EXITED`, `RELEASED`, and `CANCELLED` slots do not count.

## 3. Lifecycle And Participation Rules

- The durable `PartnerRequest` status set is `DRAFT`, `OPEN`, `READY`, `ACTIVE`, `CLOSED`, and `EXPIRED`.
- `DRAFT` is creator-private draft state and must not appear in public PR Discovery views or search results.
- Creatorless historical `DRAFT` rows are legacy remediation state, not a supported anonymous create/publish protocol; ordinary USER reads, edits, and publish must not claim them.
- `FULL` is a user-visible derived capacity state, not a durable `PartnerRequest.status`: an `OPEN` PR with `maxPartners` present and current active participants greater than or equal to `maxPartners` is presented as full.
- `READY` means the collaboration object is formed and roster-locked; joining, waitlisting, and exiting are no longer allowed, and progression toward `ACTIVE` may still continue.
- `READY` locks roster admission, not every PR fact. A PR may carry PR-owned `allowEditAfterReady` policy that lets the current creator keep editing explicitly listed core fields after `READY`; fields absent from that policy remain locked.
- READY-after edits are current-creator-only. When a time edit would conflict with current participants' other active PR commitments, the default outcome is a conflict. If the current creator explicitly confirms participant release, the system may release the conflicted participants with a stable release reason, as long as the remaining active participants still satisfy `minPartners`.
- `PartnerRequest` state is jointly shaped by partner thresholds, time windows, confirmation windows, and context-specific rules.
- When a PR reaches its close time, it expires only when current active participants are fewer than `minPartners`.
- When a PR reaches its close time with current active participants greater than or equal to `minPartners`, it closes automatically.
- `PartnerRequest.minPartners` must be an integer and `>= 1`. If `maxPartners` is present, it must satisfy both `maxPartners >= 2` and `maxPartners >= minPartners`.
- The system-owned full-capacity expansion path must fall back to `2` when a valid `minPartners` is unavailable. Manual input paths must reject empty value, `0`, `maxPartners = 1`, and invalid bounds.
- If the user already joined a non-terminal PR whose time window conflicts with the target PR, the system must reject new join actions and any creation or publish action that would claim a slot.
- `PR` supports `join` and `exit`.
- `PartnerRequest.createdBy` represents the current creator responsibility, not an immutable original author. When a published PR with active participants has `createdBy = null`, the system assigns the earliest active participant as current creator. When the current creator exits or is released, the system transfers `createdBy` to the earliest remaining active participant, or clears it to `null` when no active participants remain.
- A full-capacity `OPEN` PR may accept waitlist entries while it remains before the join-lock boundary. `READY` keeps the admission surface closed.
- Waitlist submission is subject to PR Participation frequency limits when the target PR type has that policy.
- Waitlist entries are stored as `Partner.status = PENDING`. Cancelled waitlist entries are stored as `Partner.status = CANCELLED` and no longer hold queue position.
- Pending users are not current active participants, cannot see PR messages, and do not count toward active capacity.
- When an active slot is released or exited, the system promotes waitlisted users by earliest `waitlistedAt` first, subject to current eligibility checks. Promotion converts the existing pending slot into an active partner slot.
- A user entering a waitlist may opt in to cross-PR alternative availability reminders. The current match rule is exact normalized PR type plus exact normalized PR location, and the source waitlist slot keeps its queue position while reminders are sent. Route-mode PRs have `location = null`, so they stay outside that location-driven alternative reminder match until a route-specific match rule exists.
- Cross-PR alternative availability is an invitation to inspect or join another PR with capacity. The source waitlist slot closes as `CANCELLED` after the same user successfully joins a matching alternative PR.
- `PR` may carry join gates that must be completed before joining. Join gate definitions are PR-owned runtime configuration, while their resolved state comes from the owning fact for each gate kind.
- When a PR has no configured custom join gate, the join flow provides the relevant fallback confirmation view. When any custom join gate exists, the fallback confirmation is absent.
- Join notice gates are viewer-scoped agreements; each viewer must accept the current gate key and version before joining.
- `Partner` submodule may carry explicit confirmation and join-lock settings. Attendance follow-up may appear when the relevant collaboration module is active.
- Post-activity feedback questionnaires are a PR Completion capability. PR Authoring may select a reusable questionnaire template, PR stores one mounted questionnaire instance pointer, and each submitted answer set is stored as a feedback questionnaire response.
- A questionnaire instance represents the mounted question definition snapshot for a consumer such as PR. Participant answers belong to response records keyed by the mounted instance and respondent identity.
- PR participation gating for mounted feedback is owned by PR integration. The feedback submission command validates questionnaire answers against the mounted instance and stores responses in the feedback capability.
- PR messages are visible only to current active participants; users who exit or are released must no longer see that PR's message thread.
- Only current active participants may view the thread or act on read markers and participant posting, while operators may inject system messages through admin tooling without becoming participants themselves.
- Study Sprint Pomodoro rooms are visible only to current active participants of an `ACTIVE` `STUDY_SPRINT` PR.
- Study Sprint Pomodoro timers are participant-owned and independent. Completing a timer does not exit the participant from the room and does not mutate PR participation state.
- Study Sprint Pomodoro aggregates are accountability summaries only. They must not update personal reputation, user reliability, PR punishment, reminders, or participant status in MVP.
- PR detail keeps notification-subscription management visible as a persistent section when reminder registration is relevant for that PR.
- The participant roster is opened from the facts-card participant row, and each participant badge remains a read-only navigation entry into that participant's profile page.
- PR detail resolves meeting-point guidance by fallback order: PR-specific configuration, current PR-type/place guidance, then POI configuration. Route-mode PRs carry `location = null`, so only PR-specific meeting-point guidance applies; automatic type and POI fallbacks resolve to empty. The resolved guidance is redacted from non-participant PR detail viewers after the PR becomes `ACTIVE`; the primary location remains visible for location-mode PRs.
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

- PR-attached ordering is entered through a system-authored Button Placement on PR detail and assembled on `/order/new`.
- Only the PR creator receives a new-order Button Placement CTA. An active non-creator may continue an already-created
  matching order, but never enters `/order/new` to start a new PR-scoped order.
- PR-attached ordering may be created only while the PR is `READY` or `ACTIVE`.
- At most one non-terminal order should exist for one PR and Offer pair. Re-opening the matching placement should continue the existing order instead of creating a second one.
- Offer Listing is the user-visible quote surface. A listing may include only products and SKUs that are currently offerable for the selected context.
- Quote identity is the freshness and authorization boundary between listing and create-order. Create-order should use quote identity instead of trusting browser-copied product, route, participant, or price fields.
- Expired quotes require a fresh listing and a second explicit user create action. The system should preserve matching user selections after refresh when those selections are still listed.
- Create-order must be blocked when any intended order participant still has another unpaid payable order obligation. The block is enforced by the create-order boundary and surfaced on `/order/new` through a focused dialog rather than silent failure.
- Positive unsettled charge lines block create-order only while their order payment window is still open. Zero-amount charge lines are treated as already paid.
- The unpaid-order block dialog may route the current viewer into `/bills`, but `/bills` remains viewer-scoped. If the blocking unpaid obligation belongs to another participant, that participant still needs to complete payment before order creation can proceed.
- An anonymous visitor who enters `/bills` from WeChat begins WeChat OAuth at route entry before the viewer-scoped
  bills read. This is an explicit route promise, not an upfront-login rule for ordinary browsing or every
  authenticated Commerce route.
- Rental runtime is retired: no new Rental placement, listing, quote, order, payment, booking, cancellation, or
  guidance flow is available. Historical Rental order and bill reads remain available.
- RideHailing ordering authorizes a choice set: the user selects one or more acceptable vehicle candidates, and the provider/order lifecycle resolves one final vehicle after dispatch.
- RideHailing visible vehicle candidates depend on route and departure time. Provider-unavailable candidates should be absent from the list, not shown as disabled options with reasons.
- RideHailing displayed price before create is the selected candidate range, not the final bill cap.
- RideHailing final bill follows the resolved provider settlement. A provider upgrade or substitution outside the selected candidate set is recorded rather than rejected, and the final settlement remains the bill basis.
- Before a user cancels an active RideHailing order from Order Detail, the product should query the provider's current cancellation-fee preview and show the fee before the user confirms cancellation. If the previewed fee is greater than zero, the user must explicitly accept that fee before the cancellation request is sent.
- If RideHailing provider dispatch fails during create-order, the domain may create and cancel an order, but the user experience remains an ordering failure dialog on `/order/new` rather than navigation to Order Detail.
- A payment-client return does not itself settle a commerce bill. Checkout reconciles backend provider/Bill truth;
  successful reconciliation returns to the Bill, while closed, failed, or unknown returns remain retryable on Checkout.
- Checkout may preserve only a same-browser-session opaque payment lookup to resume backend reconciliation after a
  redirect or reload. That lookup is not settlement truth and does not promise cross-device return continuation.
- A later authoritative RideHailing fare disagreement after final-bill settlement never rewrites settled history. The
  current system exposes a correction-required boundary only; automatic Bill adjustment or refund remains deferred.

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
- Mounted post-activity feedback is optional unless the PR integration presents it for the current collaboration. Absence of a questionnaire response is tracked as missing feedback for that questionnaire instance, separate from attendance state.
- PR messaging is a non-realtime coordination layer and must not introduce chat-room semantics such as presence, typing, or read receipts.
- Notification subscription is modeled by remaining send quota, not by a simple toggle.
- Successful join in a PR that supports reminder registration should immediately offer the join-success follow-up sequence while leaving a durable management path on the detail page. When confirmation is enabled, the sequence first shows a dedicated confirmation follow-up explaining confirmation importance, the confirmation window, the slot-release consequence, and the confirmation reminder subscription. The general notification-subscription follow-up then focuses on new-partner reminders and meeting-point reminders. After those follow-ups, join success may show the official-account follow prompt.
- The dedicated confirmation follow-up includes the confirmation deadline when that deadline is known. PRs with confirmation disabled start the join-success sequence at the general notification-subscription follow-up.
- Confirmation-start reminders must become claimable and deliverable at or after the configured confirmation-start instant, because the linked confirm action is gated by the same window.
- Successful waitlist entry should offer a focused `WAITLIST_PROMOTED` subscription prompt so the user can receive one notification when the pending slot becomes active.
- Successful waitlist entry may also offer `WAITLIST_ALTERNATIVE_AVAILABLE` when the user selected cross-PR alternative reminders for that waitlist slot.
- PR message notifications are limited to at most one send per `PR / recipient / unread wave`.
- The current `PR_MESSAGE` timing policy is one fixed short-debounce summary opportunity per unread wave.
- Before a PR message notification is sent, the system must re-validate that the recipient is still a current active participant of that PR.
- Availability of join, confirm, and similar operations is enforced by authoritative command handling; preflight reads may surface the same guardrails before the user acts.
- The join command remains authoritative for unresolved join gates and must reject joining when any configured custom gate is unresolved for the current viewer or PR.
- Notification cards and prompts are contributed by their owning modules, so confirmation and other features can add notification items without one central interpreter inside the card container.

## 6. Distribution And Revisit Rules

- PR pages must remain re-enterable through public links.
- Share links may carry `spm` attribution and continue through the current browser session.
- Home, `/prd`, personal center, and history list all support revisit and re-entry.

## 7. Profile And Support Rules

- Participant profile pages are read-only and do not own editing behavior.
- `/me` owns the current user's personal-center IA. Its profile surface should keep avatar, nickname, WeChat identity state or bind action, and anonymous user id continuity together.
- When the current user has no WeChat official-account `openid`, the `/me` profile surface should offer the WeChat bind action at the identity position. When the user is bound, it should show the bound state.
- `/me` logout clears the browser's current user session and starts a fresh anonymous UUID session for continued anonymous browsing.
- `/me` should present PR history and POI application history as equal shortcuts under the profile surface while keeping `/pr/mine` as the dedicated PR history route.
- The "Need Help" path must keep support, author feedback, and about-page routing distinct.
- PR type configuration may carry a PR Discovery-owned type-community QR asset. Platform support and official-account prompts remain independently owned support capabilities.
- Build metadata shown in `/about` must be interpretable in the current runtime and must not depend on a local git checkout inside the browser environment.
- Operator-managed configuration counts as product behavior whenever it changes a user-visible path.
