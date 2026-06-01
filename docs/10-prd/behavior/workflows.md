# Core Workflows

## 1. Create a PR from Home

1. The user lands on home and first understands the product through hero, value, or event-entry surfaces.
2. The user either expands the lightweight "start from one sentence" path or enters `/pr/new`.
3. The system interprets the natural-language intent, may map it to an existing Anchor Event context, and may synthesize a new `PR.type` when no existing event context fits.
4. The frontend submits the natural-language create command.
5. If the selected type maps to an Anchor Event whose PR creation policy allows user creation and the user already has an authenticated account, the backend creates and publishes the PR inside the same creation flow.
6. If the user is anonymous, the backend creates a `DRAFT` and waits for a later authenticated publish step.
7. The publish step assigns creator ownership and returns a shareable, revisitable `PR`.

## 2. Create a PR Through Structured Form

1. The user enters `/pr/new` and chooses the structured form path.
2. The `type` field accepts arbitrary input and may offer suggestion options from known event types.
3. The `time_window` field uses batch or free UI mode. Batch mode offers suggested windows from known event-side availability. Free mode allows direct manual time entry.
4. The user chooses one place mode for the PR. Location mode supplies one primary location. Route mode supplies an ordered `PR.route` from departure to destination, with optional waypoints.
5. The UI resolves those inputs into one PR-owned create payload with one concrete `type`, one concrete `time_window`, and one place mode.
6. The frontend submits the structured create command. If the selected `type` resolves to an Anchor Event, that event's PR creation policy gates user creation, and PR creation materializes that event's PR defaults such as default notes when the create payload has no notes, join gates, and mounted feedback questionnaire instance onto the created PR.
7. If the user already has an authenticated account, the backend creates and publishes the PR inside the same creation flow.
8. If the user is anonymous, the backend creates a `DRAFT` and waits for a later authenticated publish step.
9. The publish step assigns creator ownership and returns a shareable, revisitable `PR`.

## 3. Enter Through a Link and Join a PR

1. The user opens `/pr/:id`.
2. The user reads the request details, current count, visible status, participant list, and status-appropriate meeting-point guidance. In the current event-context detail layout, meeting-point guidance appears in the facts card directly under the primary location while it is visible. Route-mode PRs show Route as a separate facts row that can open route map detail. After the PR becomes `ACTIVE`, non-participant viewers see a private meeting-point placeholder while current active participants can still read the guidance. Notification subscriptions remain as a persistent section, the participant roster opens from the facts-card participant row, and venue images use the same clickable label-row entry pattern.
2.1. When the PR is `READY`, active participants can see a four-digit pairing code in the PR detail primary actions area and open a full-screen solid-color pairing-code display. The pairing code is a visual offline discovery aid for people at the same venue and is not an authentication, join, or attendance proof.
3. Revisit continuity uses the restored anonymous UUID session; actions that require stronger identity guarantees use authenticated session plus WeChat binding.
4. Before join, the system checks time-window conflict, state, capacity, context-specific rules, and any PR-owned join gates.
5. Join gates are rendered as one modal flow on the PR detail page. With no configured custom gate, the frontend injects the relevant fallback confirmation. With custom gates, each unresolved gate contributes one join notice agreement view.
6. If join succeeds in a PR where reminder registration is relevant and confirmation is enabled, the system immediately prompts a dedicated confirmation follow-up with the confirmation reminder subscription, confirmation importance, the confirmation window, and the slot-release consequence. The confirmation follow-up includes the confirmation deadline when known.
7. The general join-success notification-subscription follow-up focuses on new-partner reminder and meeting-point reminder recommendations, and each recommendation explains why it is useful. When confirmation is disabled for that PR, the join-success sequence starts with this general follow-up while leaving the persistent notification-subscriptions section available on the detail page for later revisit.
8. After the join-success notification follow-ups are completed, the same flow may show one combined community follow-up view. That view can include the current Anchor Event's beta-group QR with the copy "加群获得活动最新动态", the official-account QR when the user is eligible for that prompt, or both when both are relevant.
9. If join succeeds, the user enters the downstream progression of that collaboration object.
10. If the current PR was entered from Anchor Event context and is not the right fit, `/pr/:id` keeps a lightweight path back to browsing other active Anchor Events without hiding the current collaboration detail.

## 4. Enter PR Through Anchor Event Browsing And Search

1. The user browses `/events`, `/events/:eventId`, `/e/:eventId`, or enters `/events/search`; event-card order on these entry surfaces is backend-authored display policy rather than frontend-owned ranking truth.
2. `/e/:eventId` is the ad-scan-first canonical Anchor Event landing entry. It may enter `FORM`, `CARD_RICH`, or `LIST` landing mode for the same event, and `/events/:eventId` forwards legacy traffic into this route.
3. `/e/:eventId` may recommend following the official account after the user has stayed for 3 seconds, gated by the shared frontend 6-hour official-account prompt cooldown also used by Home and post-commitment follow-ups.
4. The same user should keep a stable landing mode for the same event until the operator applies a new landing revision for that event.
5. If the landing mode cannot be resolved in time, `/e/:eventId` still enters a usable `LIST` fallback experience.
6. In `FORM` mode, the user selects one place option, one start time, and optional preferences before the system reveals candidate `PR`s. Location-pool events present POI/location choices; route-pool events present route choices with route geometry. When the selected start time inherits event-authored time-window description copy from its start rule, the time control surfaces that copy under the picker.
7. Form Mode preferences come from the event-specific preset tag pool plus the current visitor's session-local custom labels; the same derived category is mutually exclusive while uncategorized labels can coexist.
8. Form Mode submission stays inside `/e/:eventId`; the route-level state machine keeps the selected location, start time, and preference labels through recommendation and result handling.
8.1. If the desired location is absent, the Form Mode location control provides a location-application entry. The application creates a pending `POI` with the submitted name and image, independent of any one Anchor Event.
9. Form Mode submission returns one backend-authored matched recommendation plus an ordered candidate list.
10. If Form Mode has no matched recommendation and has ordered candidates, the page shows the inline no-match result with candidate actions. When the Anchor Event PR creation policy allows user creation, the same selected conditions can feed the create fallback action `都不合适，帮我找`.
11. If Form Mode has no matched recommendation, zero ordered candidates, and a user-creation-enabled event policy, the page directly creates an event-assisted `PR` from the selected conditions after the long-press completes, then opens the created `/pr/:id` with a handoff query and a success notice for the created request. With an admin-only creation policy, the page stays in the no-match result state and keeps browsing exits available.
12. Joining a recommended candidate from Form Mode uses the same PR join flow as canonical PR detail; successful joins continue into canonical `/pr/:id` while preserving event-context handoff continuity.
13. In `/events/search`, the user chooses one active `Anchor Event` and one or more available local dates before seeing matching `PR` results.
14. Search results follow the chosen Anchor Event's `PR.type` resolution and time-pool rules; result cards identify candidate PRs by time, location, visible status, and participant count rather than repeating event-side context.
15. If the search has exactly one result, the system may route directly to `/pr/:id`; otherwise, the user chooses one result from the list.
16. The user enters an existing `PR` from event card or search-result context. `/events/:eventId?mode=card|list` forwards to `/e/:eventId` with the same explicit route mode, and `/e/:eventId` exposes a footer-top `LIST` / `CARD_RICH` / `FORM` mode switch that writes the route mode. In card mode, the active demand card itself is also a detail-entry affordance, so tapping it should resolve to the same detail intent as the rightward action. In list mode, top-level tabs aggregate by local date while still preserving time-window grouping and location context inside the selected date panel; dates before the current product-local date are expired dates, the expired tab set keeps at most the latest three dates that contain `CLOSED` PRs, expired date panels show `CLOSED` rows, and current or future date panels hide `EXPIRED` rows. Card-mode drag feedback should reveal directional skip versus detail cues in exposed stage space and keep the card body unobscured by opaque action stamps.
17. The Anchor Event landing page exposes that event's beta-group entry as an independent card. List mode defaults the card to a collapsed summary; card mode defaults it to an expanded state with the QR code. The group is for event-specific support such as requesting new sessions and coordinating Anchor Event context.
18. If the current local date, suggested time, or selected place needs a new PR and the Anchor Event PR creation policy allows user creation, the user can create one through the controlled event landing flow. Card and list creation pickers include event-authored time-window description copy in each described time option.
19. The event landing route resolves its assisted-create choices into the same structured PR create payload shape used by `/pr/new`. Assisted-create place options may resolve to a primary location or to `PR.route`, and the frontend may carry transient event referral context for browser-route continuity.
20. The event landing route submits the same structured create command used by the form path. If the user already has an authenticated account, the backend creates and publishes the PR inside that same command.
21. The current Anchor Event and downstream PR detail surfaces may also expose other active Anchor Events as a secondary browsing path, so the user can pivot without leaving the event-context collaboration journey entirely.
22. The user may then join or continue browsing other visible PRs in that event context.
23. The resulting PR may continue through timing and reliability loops such as confirmation, reminders, attendance follow-up, event beta-group follow-up, and mounted post-event feedback when the corresponding modules are active.

## 4.1 Submit And Review A POI Location Application

1. The user enters the location-application page from the Form Mode location control.
2. The user submits one location name and one image.
3. The backend creates a `PENDING` `POI`; the submitted location name becomes the POI name used for PR location matching.
4. The user can revisit submitted POI applications from the submit-success page and from the `/me` personal-center shortcut.
5. Operators review submitted POIs in the POI management surface.
6. Publishing changes the POI status to `PUBLISHED`; rejected applications remain hidden from public location reads and may carry a rejection reason.
7. Published POIs are available to the global POI library, but Form Mode still shows only locations referenced by the current Anchor Event location pool.

## 5. Revisit and History Entry

1. When the user returns, the system restores existing session continuity when possible.
2. The user can inspect and manage profile, WeChat identity, service notifications, and anonymous UUID continuity through `/me`.
3. The `/me` personal profile card keeps identity facts together: avatar, nickname, WeChat binding state or bind action, and the anonymous user id copy affordance.
4. The user can log out from `/me`; the browser clears the current user session and immediately receives a fresh anonymous UUID session for continued browsing.
5. The user can enter PR history and POI application history from two equal shortcuts under the personal profile card.
6. The user can revisit created and joined PR history through `/pr/mine`.

## 6. Share and Distribution

1. The user triggers sharing from a PR page or support-related page.
2. The system provides the available share method for that scenario, such as public link, WeChat share, or Xiaohongshu output.
3. Route-mode PRs use backend-authored canonical route summary in base share metadata, while richer route wording belongs to the sharing surface that renders it.
4. Share links may carry `spm` attribution.
5. New visitors re-enter the corresponding browser route and continue the collaboration path.

## 7. Non-Realtime PR Messaging

1. A current active participant enters a `PR` detail page, reviews the current collaboration context, and uses that page as the handoff point into the dedicated message route `/pr/:id/messages`.
2. The message experience is a separate page so the detail page can stay focused on facts, participation, and notification-subscription management.
3. A current active participant can post plain-text messages inside the PR to coordinate meetup details, timing changes, or other collaboration context.
4. An operator may also add a plain-text system message to one specific `PR` when participants need an official coordination note, fulfillment update, or other operator-authored context inside the same thread.
5. The system persists both participant messages and operator-authored system messages inside the corresponding `PartnerRequest` context rather than forcing participants into an external chat tool.
6. If other current active participants still have remaining notification quota, the system opens one unread wave per `PR / recipient`, schedules one delayed summary notification opportunity after a short fixed debounce window, and still limits delivery to at most one send per unread wave.
7. After another participant revisits that PR and catches up on the unread wave, a later wave may trigger a new notification.

## 8. Reliability Loop

1. The user joins a `PR` whose `Partner` submodule carries explicit reliability-related facts such as confirmation or join-lock settings.
2. The relevant command path enforces whether confirmation is enabled, whether immediate confirmation is required, whether additional joining is still allowed, and whether unconfirmed slots are released.
3. If the user still has relevant notification quota, the responsible modules may register reminder or new-partner notifications.
4. After the event, the attendance module may collect check-in feedback and contribute to the reliability loop.
5. When the PR has a mounted feedback questionnaire instance, the PR detail flow may ask the participant to submit that questionnaire after check-in. The feedback command stores questionnaire answers in the feedback system, while the PR flow controls when the questionnaire is presented.

## 9. Support, Feedback, and Operator Support

1. The user enters `/contact-support` from home or footer-level support entrypoints.
2. The user is routed toward platform support, author feedback, or event-specific beta-group selection based on need. When `/contact-support` is opened inside a WeChat mini program webview, the platform-support entrypoint uses QR presentation instead of outbound links.
3. The user can also reach `/about` from that path, inspect product and repository metadata, choose which active Anchor Event beta group to join, and open the official-account QR modal.
4. Operator pages maintain event, POI, PR, feedback questionnaire, and related capabilities so the above workflows remain operable.
5. Operator pages review, publish, or reject user-submitted POI location applications.
6. PR Admin lets an operator hard-delete a selected PR after explicit confirmation. The delete removes the PR root plus the corresponding Partner rows.
7. Anchor Event Admin lets an operator select the feedback questionnaire template used for future PR materialization, and PR Admin lets an operator replace a specific PR's mounted questionnaire instance pointer.
