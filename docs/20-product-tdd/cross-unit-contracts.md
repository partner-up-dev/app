# Cross-Unit Contracts

## 1. Typed HTTP Contract

- Backend exports `AppType` from `apps/backend/src/index.ts`.
- Frontend creates Hono RPC clients with `hc<AppType>()`.
- Backend also exports selected domain and entity types for frontend compile-time reuse.

Contract implication:

- route shape, payload shape, and many response shapes are shared by type rather than duplicated manually
- some contract-breaking API changes are intentionally compile-time visible to the frontend workspace

## 1.1 Local Development Origin Contract

- The default developer full-stack entry is `pnpm dev:portless` from the repository root.
- `portless.json` maps `apps/frontend` to the public app name `partner-up` and `apps/backend` to the public app name `api.partner-up`.
- During portless development, Vite reads `PORTLESS_URL`, `HOST`, and `PORT` from the portless runtime, publishes `import.meta.env.VITE_API_URL` as the frontend origin, and keeps browser API calls same-origin through the frontend `/api` proxy.
- The frontend `/api` proxy targets the backend portless app by sending `Host: api.partner-up.localhost`, which keeps local browser flows aligned with the typed backend HTTP contract while application code stays free of fixed numeric ports.
- Fixed-port frontend env values (`VITE_PORT`, `VITE_API_URL`, `VITE_BACKEND_HOST`, `VITE_BACKEND_PORT`, `VITE_BACKEND_PROXY_TARGET`) remain a compatibility contract for explicit fixed-port local work.
- Root-owned system scenario tests own their own frontend and backend ports through the `system-scenario` Vitest project. That isolated test runtime is separate from the developer portless workflow.

## 1.2 Image Upload Contract

- The active image upload surface is `POST /api/upload/images/:purpose` with multipart field `image`.
- Backend accepts the allowlisted image purposes: `poster`, `poi`, `anchor-event-cover`, `anchor-event-beta-group-qr`, and `feedback`.
- Backend generates one UUID key per uploaded image. The key is independent from client filenames and is also the stored image filename.
- Backend stores image bytes under the purpose-owned prefix: `posters/`, `pois/`, `anchor-event-covers/`, `anchor-event-beta-group-qrs/`, or `feedback/`.
- Backend serves uploaded images through `GET /api/upload/images/:purpose/:key` and derives the response content type from the stored image bytes.
- Frontend upload flows use the Hono RPC client and pass the purpose explicitly at the upload boundary.
- Xiaohongshu and WeChat generated poster assets use purpose `poster`; POI application and Admin POI Gallery uploads use purpose `poi`; Admin Anchor Event cover and beta-group QR uploads use their Anchor Event media purposes; feedback questionnaire image answers use purpose `feedback`.

## 2. PR Lifecycle Contract

- Backend owns `PartnerRequestStatus` and legal state transitions.
- Frontend renders and branches on the shared visible status set: `DRAFT`, `OPEN`, `READY`, `FULL`, `LOCKED_TO_START`, `ACTIVE`, `CLOSED`, `EXPIRED`.
- Backend owns the persisted partner-bounds invariant: manual PR writes must reject `minPartners < 1`, missing `minPartners`, and present `maxPartners < 2`; system-generated create paths may default missing or invalid `minPartners` to `2` before persistence, while still rejecting present `maxPartners < 2`.
- Legacy invalid partner-bound data is repaired through forward-only data migrations before deploy; frontend and backend reads do not introduce separate normalization policy.
- If the status set or lock/join semantics change, backend runtime, frontend UX, and the PRD lifecycle description must move together.

## 3. Session Contract

- Frontend stores user and admin access tokens in browser storage.
- Frontend stores the anonymous user UUID in localStorage and sends it to session bootstrap so the backend can restore anonymous visitor continuity.
- Anonymous and authenticated user sessions both use `Authorization: Bearer <JWT>` transport.
- Backend distinguishes anonymous, authenticated, service, and analytics sessions from JWT `roles` claims plus current persisted user state.
- `users.role` is a text-array role set. Valid role values are `anonymous`, `authenticated`, `service`, and `analytics`.
- JWTs carry both `roles` and a primary `role` projection for existing session consumers. Authorization decisions that govern privileged surfaces read the full role set.
- The `authenticated` role is the product's strong user identity marker. Current public user flows obtain it through WeChat OAuth login or anonymous-user WeChat upgrade.
- Backend may rotate tokens through the `x-access-token` response header.
- Frontend must preserve `credentials: "include"` on flows that rely on cookie-backed session state, especially WeChat OAuth, OAuth handoff, and bind paths.
- Frontend app bootstrap owns best-effort session restoration and anonymous continuity. Command requests rely on backend auth failures plus the RPC auth policy for required identity escalation.
- Admin and user sessions are separate client contexts. Admin session storage can carry `service`, `analytics`, or both.
- WeChat OAuth callback completion must not place the long-lived access token in route query parameters. Backend-owned OAuth callbacks hand the frontend session across with a short-lived signed cookie plus a non-secret handoff nonce.

## 4. WeChat Official Account Follow Contract

- Backend persists official-account follow confirmation on `users.wechat_official_account_followed_at`.
- `GET /api/wechat/official-account/follow-status` returns `{ status, followedAt }`, where `status` is `FOLLOWED` or `UNKNOWN`; `FOLLOWED` requires an active authenticated user whose `users.wechat_official_account_followed_at` is present.
- A 6-hour backend JobRunner task reads the WeChat official-account follower list and positively marks local users whose `open_id` appears in the list.
- The follower-list cursor is pagination state for one scan. It is not persisted as durable user state.
- The sync task only writes positive confirmations. Missing users in a follower-list scan remain `UNKNOWN` until a later unsubscribe webhook or reconciliation contract exists.
- Frontend official-account follow prompts combine backend status with a 6-hour local cooldown aligned to the follower-list sync period, so a user who recently saw the prompt or opened the follow QR is spared repeat presentation before the next expected backend confirmation opportunity.
- Frontend may mount the shared official-account follow prompt on Home, Anchor Event landing, and post-commitment follow-ups; those surfaces share the same cooldown and emit user telemetry for prompt presentation and completion/dismissal actions.

## 5. Error Contract

- Backend API exceptions serialize as RFC 9457 `application/problem+json`.
- HTTP status selection should follow RFC 9110 semantics, especially across auth failures, forbidden actions, state conflicts, and invalid content.
- Backend owns stable machine-readable `code` values for domain guard failures and may also expose a stable `type` URI for the same problem family.
- Backend owns localized `title` and `detail` text for problem responses and selects them from request locale. Responses should set `Content-Language`.
- Frontend interprets HTTP status plus stable `code` to drive UX for auth-required flows, join failures, and create-path fallbacks.
- User-facing commands that require the `authenticated` role return `401` with code `AUTHENTICATED_REQUIRED`. The frontend Hono RPC fetch policy handles this code globally by starting the WeChat OAuth login entry for the current browser URL.
- For shared partner-bounds validation failures, backend and frontend should converge on one user-facing Chinese message rather than surfacing route-specific copies.
- Human-readable explanation remains backend-owned on command failures. Frontend owns placement and presentation.
- Problem-details transport shape is a cross-unit reusable substrate. Domain modules own their `type` and `code` registries.
- Backend production code must express expected API failures through Problem Details helpers or typed domain helpers. The backend Problem Details lint allows `HTTPException` only in the global error adapter, where third-party or compatibility exceptions are normalized into the same response contract.

## 6. Stable Route And Flow Contract

Stable user-facing route families that materially affect coordination include:

- `/`
- `/pr/new`
- `/pr/:id`
- `/pr/:id/messages`
- `/pr/:id/partners/:partnerId`
- `/events`
- `/events/search`
- `/events/:eventId`
- `/e/:eventId`
- `/pr/mine`
- `/me`
- `/contact-support`
- `/contact-author`
- `/about`
- `/wechat/oauth/callback`
- `/admin/login`
- `/admin/pr`
- `/admin/pr-messages`
- `/admin/pois`
- `/admin/analytics`
- `/bi`

Important coordination note:

- canonical PR routes converge on `/pr/*`; rollout may keep legacy scene-specific route families as temporary redirect bridges while shared links and clients converge
- canonical PR creation stays PR-owned and route-driven through `/pr/new`
- create commands are split by input mode:
  - `POST /api/pr/new/form`
  - `POST /api/pr/new/nl`
- create commands return the created PR id, resulting status, and canonical detail path so frontend can route without inferring publish outcome locally
- backend requires an authenticated caller for PR create commands and persists plus publishes in one command path
- `POST /api/pr/:id/publish` requires an authenticated user. Anonymous calls return stable code `AUTHENTICATED_REQUIRED`; the frontend RPC auth policy starts WeChat login, while the command owner records any pending action needed for replay.
- `DRAFT`, published-content, and status mutations require an authenticated user. Creator-owned mutations remain governed by creator authorization.
- Anchor Event assisted create prepares the same PR-owned structured payload and submits `POST /api/pr/new/form`
- event-assisted create carries transient create source or event referral through frontend route state, while persisted PR state remains the same PR-owned field set used by structured create
- event-assisted create submits ordinary structured place fields: location mode writes `PartnerRequest.location` and clears `PartnerRequest.route`; route mode writes `PartnerRequest.route` and clears `PartnerRequest.location`
- event-assisted create uses the same authenticated mutation boundary and publish behavior as structured PR creation
- Anchor Event owns `prCreationPolicy`. `USER_AND_ADMIN` allows public structured, natural-language, and event-assisted PR creation for that event type. `ADMIN_ONLY` admits Admin PR creation and Admin PR content editing for that event type while public structured create, natural-language create, and event-assisted create for that event type return stable code `ANCHOR_EVENT_USER_PR_CREATION_DISABLED`.
- Anchor Event owns `fullPrExpansionPolicy`. `DISABLED` is the default and keeps a full event-context PR as the only PR for that event time window unless another create path runs. `ENABLED` lets the backend full-status join path attempt system auto-expansion into a visible sibling PR under the same event type and time window.
- Anchor Event owns `participationFrequencyLimit`. When `intervalPrCount` is present, PR-core join and waitlist commands order visible event PRs by time-window start, time-window end, then PR id. A user whose latest active event participation (`JOINED`, `CONFIRMED`, or `ATTENDED`) is within that interval is rejected with stable code `ANCHOR_EVENT_PARTICIPATION_FREQUENCY_LIMITED`; `PENDING`, `EXITED`, `RELEASED`, and `CANCELLED` slots do not count as limiting history. PR detail projects the same rule through `partnerSection.viewer.joinBlockedReason` or `waitlistBlockedReason`.
- `PR.type` is the input that Anchor Event context resolution depends on. User-side PR content edits do not accept `type` after creation, so ordinary edits cannot make event-context reads drift away from creation-time materialized PR runtime state. Admin PR content editing remains the operator-owned reclassification path.
- the old public batch-specific event-create route is retired from the public contract surface
- structured PR creation accepts arbitrary `type` input with event-type suggestions and accepts one resolved `time_window`; batch and free are UI modes rather than separate persisted PR models
- structured PR creation accepts one place mode. Location mode sends `location` with `route: null`; route mode sends ordered `route` points with `location: null`.
- `PartnerRequest.route` is a nullable ordered JSON array of points shaped as `{ wgs84, bd09, gcj02, name, full_address }`, where coordinate pairs are `[lat, lng]` and each route point carries a non-empty `name` plus at least one coordinate pair.
- Route-mode PRs use compact route summary `route[0].name~route[-1].name` as the backend-derived place display name. Each endpoint is truncated independently so the joined summary stays within 16 characters.
- PR creation resolves event-owned defaults by PR type when that type maps to an Anchor Event. The created PR receives materialized PR-owned state for event-owned default notes when the create payload has no notes, confirmation enablement and timing defaults, join gates, and feedback questionnaire instance pointer. This materialization rule applies to public structured create, event-assisted create, admin create, and system auto-expansion. Later Anchor Event default edits affect future PRs only.
- `/pr/:id` remains the primary PR detail route for read, join, exit, confirm, check-in, and share; it keeps the persistent notification-subscriptions section mounted there when reminder registration is relevant for that PR and links into adjacent PR sub-routes instead of absorbing all secondary actions inline. PR-level confirmation enablement gates confirm action availability, confirmation reminders, confirmation-window auto-confirm, confirmation-deadline slot release, and the dedicated confirmation follow-up in the join-success sequence. Join lock, check-in, and the persistent notification-subscriptions section keep their own eligibility rules.
- `GET /api/pr/mine/created` and `GET /api/pr/mine/joined` return id-only PR list items. They express membership in the viewer's created and joined PR collections. Preview rendering of title, status, location, time, and participant count reads `GET /api/pr/:id`.
- PR preview surfaces across `/pr/mine`, Anchor Event list mode, Form Mode candidate results, and event-scoped PR search should pass PR identity plus caller context into the PR-domain preview component. The PR-domain preview component owns its PR detail query, keeping canonical PR facts aligned with `GET /api/pr/:id`.
- `GET /api/pr/:id` returns `core.location`, `core.route`, and `core.placeDisplayName`. Location-mode PRs return `route: null`; route-mode PRs return `location: null` and expose the compact route summary as `core.placeDisplayName`.
- `GET /api/pr/:id` returns `anchorEventContext` when the PR resolves to an Anchor Event through the current event-context read model. The projection carries `{ id, title, betaGroupQrCode }` so PR detail and join-success follow-up can show the event beta-group QR without deriving event ownership in the frontend.
- `GET /api/pr/:id` returns `core.meetingPoint`, the backend-resolved meeting-point guidance, plus `core.meetingPointVisibility`. Fallback order is PR-specific configuration, Anchor Event location-specific configuration, Anchor Event default configuration, then POI configuration. Route-mode PRs have `location: null`, so meeting-point resolution stops after PR-specific configuration and automatic Anchor Event / POI fallbacks resolve to empty. Before `ACTIVE`, `core.meetingPointVisibility` is `VISIBLE` when guidance exists. After `ACTIVE`, when resolved guidance exists, the backend returns `core.meetingPoint` only to current active participants; other viewers receive `core.meetingPoint: null` and `core.meetingPointVisibility: ACTIVE_PARTICIPANTS_ONLY`. Frontend renders the value or the private placeholder under the primary location in the facts card. Public POI reads keep their existing `meetingPoint` response shape.
- `GET /api/pr/:id` returns a feedback projection when the PR has a mounted feedback questionnaire instance. The projection includes the instance id, the questionnaire definition snapshot needed for rendering, and the current viewer's response state so the frontend can offer submission or retry without deriving feedback truth locally.
- `POST /api/feedback/:instanceId` is the authenticated feedback questionnaire submission contract. The route treats `instanceId` as a `FeedbackQuestionnaireInstance` id, validates answers against that instance's definition snapshot, and upserts one `FeedbackQuestionnaireResponse` for the current respondent identity. PR participation, attendance, and slot ownership gating live in PR integration surfaces rather than in this generic feedback command.
- `GET /api/pr/:id/join-gates` is the PR join-gate projection contract. It returns the current viewer's configured join gates with per-gate resolved state. The projection reads PR-owned `joinGateConfig`; when that config is empty it returns an empty gate list; join-notice gate resolution comes from the current viewer's notice acceptance record.
- `POST /api/pr/:id/join-gates/:gateKey/resolve` resolves one configured join gate before join or waitlist. `JOIN_NOTICE` writes a viewer-scoped notice acceptance for the gate key and version. When the request lacks an acceptable user identity, it returns `AUTHENTICATED_REQUIRED` through the shared Problem Details error contract. Fallback confirmation is a frontend-injected confirmation view and has no backend projection item or durable resolve command.
- `POST /api/pr/:id/join` rejects unresolved configured join gates with problem code `PR_JOIN_GATE_UNRESOLVED` and rejects Anchor Event participation frequency violations with problem code `ANCHOR_EVENT_PARTICIPATION_FREQUENCY_LIMITED`. Frontend should refresh `GET /api/pr/:id/join-gates` and continue the join-gate modal when it sees the join-gate code. Authentication-required failures use `AUTHENTICATED_REQUIRED` and are handled by the shared RPC auth policy.
- `POST /api/pr/:id/waitlist` creates or reuses one `PENDING` partner slot for the current authenticated viewer when the PR is `FULL` and still before the join-lock boundary. It reuses the same identity, join-gate, Anchor Event participation frequency, and time-conflict guardrails as join, returns the refreshed public PR view plus auth payload, and does not make the viewer an active participant.
- `POST /api/pr/:id/waitlist` accepts optional JSON field `alternativePrReminderOptIn`. When true, backend stores a waitlist-slot preference that allows exact same-type and same-location alternative PR availability reminders under notification kind `WAITLIST_ALTERNATIVE_AVAILABLE`. Route-mode PRs have `location: null`, so they remain outside this location-matched alternative reminder policy.
- The alternative reminder preference belongs to the source `PENDING` partner slot. Backend clears it when that slot is cancelled or converted out of pending state.
- When the user grants `WAITLIST_ALTERNATIVE_AVAILABLE` quota after waitlist entry, backend rescans that user's opted-in pending source slots for existing alternatives.
- When the same user successfully joins a matching alternative PR, backend cancels matching source pending slots, clears source join-gate resolutions, and records `partner.waitlist_cancel_alternative_joined`.
- `POST /api/pr/:id/waitlist/cancel` converts the current authenticated viewer's pending waitlist slot to `CANCELLED`, clears that viewer's join-gate resolutions for the PR, and returns the refreshed public PR view. Cancelling a pending slot does not promote another waiter because no active capacity was released.
- `GET /api/pr/:id` exposes waitlist state through `partnerSection.viewer.isWaitlisted`, `pendingPartnerId`, `waitlistRank`, `canWaitlist`, and `waitlistBlockedReason`. Frontend should render waitlist CTA and state from these fields.
- The frontend PR join flow is owned by a reusable PR-domain flow component. PR detail, Form Mode matched handoff, Form Mode no-match candidate actions, and waitlist entry provide their own button controls through slots while sharing join-gate resolution, command execution, auth payload application, and post-command notification prompts.
- The frontend waitlist flow owns only the opt-in checkbox presentation and submits the checkbox value through the typed waitlist command. Backend owns alternative candidate selection, dispatch-time eligibility, source-slot closure, and notification delivery persistence.
- `DELETE /api/admin/prs/:id` is an admin-only hard-delete command for one PR. Backend deletes the `partner_requests` root row and relies on PR-owned cascade constraints to remove Partner rows, messages, and notification records. Frontend must show an explicit destructive confirmation before sending this command and refresh Admin PR workspace caches after success.
- `PATCH /api/admin/prs/:id/feedback-questionnaire-instance` is the admin-only PR feedback override command. It replaces the PR's mounted feedback questionnaire instance pointer and leaves general PR content, Anchor Event template selection, and prior response records under their owning persistence rules.
- `/events/search` is a PR discovery route scoped by one active `Anchor Event` plus one or more local dates; its route state should be recoverable through query parameters such as `eventId` and repeated date values
- `/e/:eventId` is the ad-scan-first canonical Anchor Event landing entry; it may render `FORM`, `CARD_RICH`, or `LIST` mode, while `/events/:eventId` forwards legacy traffic to the landing route
- `/` and `/e/:eventId` may trigger the official-account follow nudge through one shared frontend 6-hour local cooldown. The Home page uses a later timed prompt, while the event route may prompt after 3 seconds.
- `/e/:eventId` owns the Form Mode selection state, no-match candidate result state, and zero-candidate assisted-create handoff in one route-level state machine.
- `GET /api/events` is the public active Anchor Event catalog contract and should return enough event object data for event-card selection surfaces; response ordering is backend-authoritative display policy, so frontend should treat it as opaque instead of hardcoded ranking truth; it does not own PR search results
- `GET /api/events` and `GET /api/events/:eventId` expose each Anchor Event's beta-group QR code when configured; `/about` and `/e/:eventId` use that event-owned value for beta-group entry instead of reading a generic beta-group public config key
- Anchor Event stores assisted place pools as `locationPool` and `routePool`. `routePool` entries are shaped as `{ id, route }`, where `route` reuses the `PartnerRequest.route` point schema. One event may have location entries or route entries as its assisted place source, and the database enforces that pool-mode invariant.
- `GET /api/events/:eventId/landing-assignment` returns the backend-authored landing mode plus `assignmentRevision` for `/e/:eventId`
- `GET /api/events/:eventId/form-mode` is the Form Mode bootstrap contract; it returns the event snapshot, user PR creation policy projection, location gallery projection, route-pool projection, available start options with start-rule-derived descriptions, each location's POI-availability-filtered start keys, each route's start keys, published preset preference tags, and an optional backend-authored default selection from the nearest joinable location-mode PR under that event's time boundary.
- Form Mode location creation is a route entry into POI application, not an Anchor Event mutation. `POST /api/pois/applications` creates a `PENDING` POI from one name and one image URL. `GET /api/pois/applications/mine` returns the current user's submitted POI applications. POIs have integer `id` identity and a unique `name`; `PR.location` remains an arbitrary string and matches POI-owned data by `POI.name`.
- Public POI reads return only `PUBLISHED` POIs. Admin POI reads include all statuses and admin POI commands may publish or reject user-submitted POIs.
- POI coordinate fields are nullable two-number tuples: `gcj02`, `wgs84`, and `bd09`, each encoded as `[lat, lng]`. `fullAddress` is nullable text.
- `POST /api/events/:eventId/form-mode/recommendation` accepts one selected location, one selected start time, and the current preference labels, then returns one matched recommendation plus an ordered candidate list. When both are empty, frontend submits `POST /api/pr/new/form` with the same selected conditions and routes to the created `/pr/:id` with `handoff=event_assisted_create` so PR detail can show the created-request notice.
- `POST /api/events/:eventId/preference-tags/submissions` accepts visitor-authored label-only tags, records them as pending event-owned preference-tag moderation items, and does not automatically expose them to later visitors
- `GET /api/events/:eventId/demand-cards` is the backend-authored card-mode demand projection contract; it returns only joinable (`OPEN` / `READY`) demand-card groups for that event.
- the old public demand-card join route is retired from the public contract surface
- `GET /api/events/:eventId` exposes public event discovery through browse time-window groups built from visible PRs with the same activity type. Create time options come from event start rules; create location options come from `event.locationPool` plus POI-owned per-time-window capacity and POI-owned availability rules; create route options come from `event.routePool`. The response also exposes whether user PR creation is allowed for the event. Event-owned create time windows include start-rule-derived description copy when configured.
- PR create, publish, and content-edit command boundaries validate that the full PR time window is accepted by the selected location's POI availability rules. Missing POI records and empty `availabilityRules` mean all-day availability. Route-mode PRs carry `location: null`, so POI availability checks short-circuit through the same null-location path.
- `GET /api/events/:eventId/demand-cards` groups demand through compatibility card keys, while the underlying candidate PR set comes from visible, joinable root PR reads keyed by activity type.
- `GET /api/pr/search` is the PR search read contract; it queries by active `Anchor Event` id plus repeated local-date values and returns matching visible actionable PR candidates under that event's current activity type and time-pool rules
- if PR search has exactly one result, frontend may replace-route to `/pr/:id` while avoiding a browser-back auto-redirect loop
- `/events/:eventId` accepts optional query `mode=card|list` as compatibility route state and forwards it to `/e/:eventId`; missing or invalid values use the landing route's stored assignment, backend assignment, or fallback behavior
- `/e/:eventId` `LIST` landing mode renders the event-domain List Mode surface and follows the same date grouping, PR visibility, event-assisted create, beta-group, and other-event browsing semantics as the previous Anchor Event list view
- a valid `/e/:eventId?mode=` query is explicit frontend route state for initial rendering and in-page mode switching, and the frontend skips `GET /api/events/:eventId/landing-assignment` while it is present; `spm` remains attribution-only rather than a UI-mode switch
- without valid route mode, frontend stabilizes `/e/:eventId` landing mode through local storage keyed by `eventId + assignmentRevision`; timeout fallback enters `LIST`
- Anchor Event landing, recommendation, PR detail entry, PR create, PR join, and PR waitlist flows emit user telemetry for the Anchor Event -> PR funnel through one app journey and one `anchor_event_landing` business segment when the user path originates from `/e/:eventId`.
- Funnel attribution uses `app_journey_id`, `segment_id`, typed subject fields such as `event_id_ref`, `pr_id_ref`, `card_key`, and command `correlation_id`. Correlated JSON commands must send `content-type: application/json` together with `x-correlation-id`.
- `/pr/:id` participant roster UI should use the existing `/pr/:id/partners/:partnerId` profile route for participant-badge navigation rather than introducing a second profile-route family
- `GET /api/pr/:id/actions/preflight` is the batch action-availability contract for PR detail UX. It evaluates one viewer against one PR and returns action entries such as `join`, `confirm`, and `check_in` through one stable minimal shape:
  - `evaluatedAt`
  - `actions[actionName].allowed`
  - `actions[actionName].problem.type`
  - `actions[actionName].problem.code`
  - `actions[actionName].problem.title`
  - `actions[actionName].problem.detail`
  - `actions[actionName].nextRelevantAt`
- preflight reads stay advisory. Backend command handlers remain authoritative and reuse the same decision logic plus the same stable `type` and `code` values when they reject a write.
- `OPTIONS /api/pr/:id/actions` may expose generic method capabilities and `HEAD /api/pr/:id/actions/preflight` may support metadata-aware infrastructure behavior. PR action availability semantics live on the `GET` response body.
- action-availability transport shape is a cross-unit reusable substrate. Each domain owns its action-name set, code registry, and fact loader.

## 7. Configuration And Metadata Contract

- Backend exposes public config values through `/api/config/public/:key`.
- Backend exposes build metadata through `/api/meta/build`.
- Frontend relies on those endpoints to avoid hardcoding operationally managed values.
- Event-specific beta-group QR codes are not public config values; they are Anchor Event fields and flow through the Anchor Event read and admin contracts.
- Event-owned landing rollout config is persisted through the infra `config` table while Anchor Event owns the namespace, payload schema, parse / serialize rules, and admin contract. Product-side rollout control is expressed through per-mode landing ratio override plus assignment revision; modes with ratio `0` are excluded from weighted assignment, and an all-zero override resolves to `FORM`.
- Admin edits event-owned landing rollout config through `GET /api/admin/events/:eventId/landing-config` and `PUT /api/admin/events/:eventId/landing-config`.
- Event-owned preset preference tags and their moderation state are persisted through dedicated Anchor Event tables instead of config blobs; admin reads them through `GET /api/admin/events/:eventId/preference-tags`, replaces published tags through `PUT /api/admin/events/:eventId/preference-tags/published`, and moderates pending tags through `POST /api/admin/events/:eventId/preference-tags/:tagId/publish|reject`.
- Admin edits Anchor Event time-window description copy through `timePoolConfig.startRules[].description`; the admin workspace preview returns the materialized description for each generated time window.
- Admin selects the Anchor Event feedback questionnaire template pointer through Anchor Event management. That pointer affects future PR materialization for PRs whose type resolves to the Anchor Event. Existing PRs keep their mounted questionnaire instance until a PR-specific pointer override changes it.
- Frontend Admin Anchor Event management exposes section-level use-case surfaces for basic info, locations, time policy, tags, and other event-owned settings. A section-level frontend use-case may initially merge the current backend workspace event with the section draft and submit the existing full-object Anchor Event mutation. Future backend endpoint splits should preserve the section-level frontend contract while moving persistence granularity closer to the edited business surface.
- Frontend Admin PR management exposes separate PR basic and PR messages views backed by section-level use-case surfaces. PR basic uses existing PR content, status, visibility, feedback-questionnaire, create, and delete admin endpoints. PR messages use existing PR message list, create, edit, and delete admin endpoints.
- Frontend Admin POI management exposes section-level use-case surfaces for POI basic maintenance and POI review. POI basic uses the existing POI upsert admin endpoint for gallery, per-window capacity, meeting-point, and availability-rule state; POI review uses publish and reject commands. Shared POI edit drafts should stay in one editor state owner so server refreshes do not overwrite unsaved local edits.
- Frontend Admin pages use a shared two-column operator shell. The left column owns global Admin navigation plus route-context modules shared across second-level views, including Anchor Event selection, PR filters, POI selection, and feedback questionnaire template selection. The right workspace owns the page header and active second-level business section content.

## 8. Share Descriptor Contract

- Entity-backed public detail routes such as `GET /api/pr/:id` provide canonical share metadata inside the detail payload.
- Canonical share metadata includes stable route-owned fields required for base share correctness:
  - title
  - description
  - canonical path
  - default image path
  - revision token
- Canonical PR share title fallback order is explicit title, compact route summary, primary location, type, then the generic `PR` label.
- Canonical PR share description may include compact route summary in the same detail slot currently used for primary location. Richer route wording belongs to the share surface that owns that description.
- Frontend treats that metadata as the source for base share descriptors rather than recomputing a separate share truth in page-local code.
- Rich descriptions, thumbnails, and posters remain optional enhancements; failure to produce them must not remove or invalidate the base share descriptor.
- WeChat share coordination distinguishes:
  - the signature URL used to initialize JS-SDK for the current route
  - the target URL that will actually be shared outward
- Frontend owns the route-scoped active share session and replay behavior, and it uses backend-provided canonical share metadata for entity truth.

## 9. PR Messaging Contract

- Backend owns persisted `PRMessage` items and one backend-authoritative `PRMessageInboxState` per `prId + userId`.
- `PRMessage` is a PR-scoped plain-text message item inside one `PartnerRequest` thread. A message is either participant-authored or operator-authored system context, and backend owns that author and type classification.
- `PRMessageInboxState` is the cross-unit marker state used to answer two separate questions without frontend-owned inference:
  - the viewer's read marker for that PR thread
  - whether the current unread message wave has already consumed one `PR_MESSAGE` notification opportunity for that recipient
- The frontend message rollout is PR-generic. The system should keep message entities, notification naming, and persistence semantics aligned with the single PR vocabulary.
- Frontend page placement is route-based: `/pr/:id` is the handoff and detail page, and `/pr/:id/messages` is the dedicated message page.
- Canonical route and API shape converge on the PR family:
  - `GET /api/pr/:id/messages`
  - `POST /api/pr/:id/messages`
  - `POST /api/pr/:id/messages/read-marker`
- `GET /api/pr/:id/messages` returns the visible message list plus thread-level viewer state needed for UI assembly and explicit read-marker advancement. That response should be sufficient for frontend to render:
  - ordered message items
  - whether each item is participant-authored or a system message
  - whether the current viewer can post
  - the latest visible message marker
  - the viewer's current read marker or an equivalent unread summary
- `POST /api/pr/:id/messages` accepts one plain-text message payload from an authenticated active participant, persists the new message, and returns the created item plus refreshed thread viewer state.
- `POST /api/admin/prs/:id/messages` accepts one plain-text message payload from admin-authenticated tooling, persists one system message for that PR, and returns the created item plus refreshed thread state for downstream admin UX refresh.
- `POST /api/pr/:id/messages/read-marker` advances the authenticated viewer's read marker idempotently after the thread is actually shown. Read-marker advancement should be explicit rather than piggybacked on list fetch, so prefetching or hidden loads do not silently clear an unread wave.
- Message visibility and read-marker advancement reuse the same backend-owned eligibility rule: only current active participants may see or act on the thread. Participant-authored message creation uses that same rule, while admin-authored system-message creation is a separate admin-only capability.
- PR message notification semantics are governed by `notification-contracts.md`, including unread-wave eligibility, delayed summary dispatch, durable opportunity and wave records, and dispatch-time revalidation.
- Frontend owns only route and page placement, thread rendering, composer input, join-success confirmation follow-up rendering, join-success subscription prompting, combined community follow-up rendering, official-account prompt cooldown, and cache refresh behavior. Backend contracts own membership, unread-wave reset, and notification gating truth.

## 10. Coordination And Failure Assumptions

- The primary coordination path is browser route -> frontend process and UI -> typed backend API -> backend persistence and side effects -> frontend cache and UI refresh.
- Rules that affect eligibility, status, timing, or identity must coordinate through backend-owned contracts; frontend may optimize UX and does not invent new domain truth.
- Best-effort outbox and job processing may complete after the initiating API response, so frontend must not assume all downstream side effects have already happened unless the API contract says so.
- Unsupported browser capabilities and auth or config gaps surface through backend status and code plus frontend fallback UX rather than through separate frontend-owned policy logic.

## 11. System Scenario Verification Contract

- Root-owned system scenario tests live under `tests/scenario/`.
- System scenarios verify user journeys through a real browser page, real frontend dev server, real backend HTTP server, and isolated Postgres state.
- Test runner, reporter, artifact, and scenario lifecycle ownership rules are governed by `test-platform.md`.
- Scenario `Given` setup may reuse backend scenario builders when they express the target business state without browser setup noise.
- Scenario `When` and minimal user-visible `Then` assertions should operate through the browser page.
- Backend probes are reserved for persistence or hidden side-effect proof that is not observable through the frontend workflow result.
- Frontend routes that participate in system scenarios should expose stable `data-testid` semantic nodes for primary actions, modal actions, and result-state affordances.
- `data-testid` names should follow route and workflow meaning, for example `pr-detail.join.open`, and action nodes should live on the real interactive element.
- CI validation is separated by verification owner: backend gate for backend-local proof, frontend gate for frontend-local proof, and E2E gate for cross-unit browser-to-Postgres user journeys.
- Backend and frontend gates protect ordinary PR integration into `develop` and `master`.
- E2E gate protects PRs whose base branch is `master`, with manual dispatch available for release qualification or diagnosis.

## 12. Analytics And User Telemetry Contract

- User-behavior telemetry is stored in `user_telemetry_journeys`, `user_telemetry_segments`, and `user_telemetry_events`.
- `POST /api/telemetry/user/events` ingests batched user telemetry. It accepts dot-separated event names, one required `appJourneyId`, optional segment context, typed subject references, source fields, and correlation fields.
- `app_journey_id` represents one continuous user visit. The frontend keeps the journey active across route changes and starts a new journey after the configured inactivity expiry.
- A business segment groups related actions inside a journey. Anchor Event landing uses segment kind `anchor_event_landing` and stores event id, assigned mode, rendered mode, assignment revision, segment start route, segment start SPM, and segment start source QR.
- Journey source fields keep immutable entry attribution through `start_spm` and mutable current attribution through `current_spm`. Dashboard source breakdown v1 groups by journey `start_spm`.
- User telemetry event names use dot-separated hierarchy, including Anchor Event funnel events such as `anchor_event.landing.viewed`, `anchor_event.recommendation.requested`, `anchor_event.pr_row.action_taken`, `pr.entry.reached`, and `pr.commitment.result`.
- Program-internal behavior collection belongs to a future observability track. Future internal collection should keep OTLP-compatible correlation through `correlation_id`, `request_id`, and `trace_id`.
- Product analytics reads user telemetry and business state as a derived interpretation layer. `GET /api/analytics/anchor-event-funnel` is the v1 aggregate endpoint for the Anchor Event -> PR conversion funnel.
- `GET /api/analytics/anchor-event-funnel` requires the `analytics` role and accepts optional `startAt`, `endAt`, `eventId`, `spm`, `sourceQr`, `assignmentRevision`, and `renderedMode` filters.
- The aggregate response includes normalized filters, summary KPIs, mode comparison rows, per-mode funnel steps, commitment outcome breakdown, start-SPM source breakdown, failure breakdown, and official-account follow Nudge click-rate metrics.
- Official-account follow Nudge BI treats `official.account.follow.nudge.action.click` with `action = "complete"` as the user clicking the Nudge's `关注公众号` button; its click rate is distinct from backend-confirmed follower sync truth.
- Supported dashboard modes are `FORM`, `CARD_RICH`, and `LIST`. Each mode keeps its own funnel step sequence because the user behavior path differs by rendered landing mode.
- PR commitment means a successful create, join, or waitlist result. The response keeps those commitment types as breakdown dimensions.

## 13. BI Entry And Analytics Authorization Contract

- `/admin/analytics` is the BI dashboard route and requires the `analytics` role.
- `/bi?code=...` is a lightweight BI entry route. The page uses the query `code` as the analytics seed user's pin and a page-local hard-coded analytics seed user id, calls the admin login endpoint, then redirects to `/admin/analytics` on success.
- `/bi` scrubs the code by replacing the route after a successful login. Failed login stays on `/bi`, renders a simple error message, and offers a home action.
- The analytics seed user is seeded with role `analytics`. The seed admin user is seeded with roles that include both `service` and `analytics`.
- Admin navigation filters entries by route-required roles. An analytics-only session can see `/admin/analytics`; a service-plus-analytics session can see analytics plus service-owned admin routes.
- Backend privileged route guards use `requireRoles(...)`. Service-owned admin APIs require `service`; analytics APIs require `analytics`.
