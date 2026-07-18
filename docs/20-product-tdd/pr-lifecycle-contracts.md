# PR Lifecycle Contracts

This file owns cross-unit contracts for PR lifecycle, creation, participation, waitlist, Study Sprint, share descriptors, and PR action availability.

## 1. PR Lifecycle Contract

- Backend owns `PartnerRequestStatus` and legal state transitions.
- Frontend renders and branches on the shared durable status set: `DRAFT`, `OPEN`, `READY`, `ACTIVE`, `CLOSED`, `EXPIRED`.
- Frontend may present derived `FULL` when a PR is `OPEN`, has `maxPartners`, and current active participants are greater than or equal to `maxPartners`; `FULL` is not a persisted `PartnerRequestStatus`.
- Backend owns the persisted partner-bounds invariant: manual PR writes must reject `minPartners < 1`, missing `minPartners`, and present `maxPartners < 2`; system-generated create paths may default missing or invalid `minPartners` to `2` before persistence, while still rejecting present `maxPartners < 2`.
- Legacy invalid partner-bound data is repaired through forward-only data migrations before deploy; frontend and backend reads do not introduce separate normalization policy.
- If the status set or lock/join semantics change, backend runtime, frontend UX, and the PRD lifecycle description must move together.

## 2. PR Creation And Publish Contract

- Canonical PR routes converge on `/pr/*`; rollout may keep legacy scene-specific route families as temporary redirect bridges while shared links and clients converge.
- Canonical PR creation stays PR-owned and route-driven through `/pr/new`.
- Create commands are split by input mode:
  - `POST /api/pr/new/form`
  - `POST /api/pr/new/nl`
- Create commands return the created PR id, resulting status, and canonical detail path so frontend can route without inferring publish outcome locally.
- For `USER` authority, Backend requires an active authenticated caller before root or child persistence, persists `createdBy` to that caller, and publishes `OPEN` in the same command. Explicit `SYSTEM` full-capacity expansion remains system-owned; admin creation remains the separate `ADMIN` command surface.
- Structured, natural-language, `/prd`-sourced, and full-capacity expansion PR creation converge on the same backend PR create authority after input preparation; WeCom is an ingress adapter and cannot bypass the USER guard. Admin PR create remains a separate operator command surface.
- `POST /api/pr/:id/publish` requires an authenticated user and returns `AUTHENTICATED_REQUIRED` for anonymous callers. The shared RPC policy may start WeChat OAuth; any pending/replay behavior is command-owner-specific. Browser A's USER create path performs its auth preflight before POST and never automatically creates or replays a PR after OAuth.
- `DRAFT`, published-content, and status mutations require an authenticated user. Creator-owned mutations remain governed by current `PartnerRequest.createdBy` authorization.
- Structured PR creation accepts arbitrary `type` input with current PR-type suggestions and accepts one resolved `time_window`; batch and free are UI modes rather than separate persisted PR models.
- Structured PR creation accepts one place mode. Location mode sends `location` with `route: null`; route mode sends ordered `route` points with `location: null`.
- `PartnerRequest.route` is a nullable ordered JSON array of points shaped as `{ wgs84, bd09, gcj02, name, full_address }`, where coordinate pairs are `[lat, lng]` and each route point carries a non-empty `name` plus at least one coordinate pair.
- Route-mode PRs use compact route summary `route[0].name~route[-1].name` as the backend-derived place display name. Each endpoint is truncated independently so the joined summary stays within 16 characters.
- PR create and content-edit command boundaries accept non-null `PR.time_window` endpoints only as instant datetimes with timezone offsets. They canonicalize offset input, such as `2026-06-27T00:00:00+08:00`, before persistence. Date-only user input is not persisted directly; natural-language date-only intent materializes into a product-local all-day instant window using `[T 00:00, T+1 00:00)`.
- PR create and publish command boundaries reject a `PR.time_window[0]` that has already passed. PR create, publish, and content-edit command boundaries validate that the full PR time window is accepted by the selected location's POI availability rules. Missing POI records and empty `availabilityRules` mean all-day availability. Route-mode PRs carry `location: null`, so POI availability checks short-circuit through the same null-location path.

## 3. PR Detail And Current Creator Contract

- `/pr/:id` remains the primary PR detail route for read, join, exit, confirm, check-in, and share. It keeps the persistent notification-subscriptions section mounted there when reminder registration is relevant for that PR and links into adjacent PR sub-routes instead of absorbing all secondary actions inline.
- PR-level confirmation enablement gates confirm action availability, confirmation reminders, confirmation-window auto-confirm, confirmation-deadline slot release, and the dedicated confirmation follow-up in the join-success sequence. Join lock, check-in, and the persistent notification-subscriptions section keep their own eligibility rules.
- `PartnerRequest.createdBy` is current creator responsibility rather than immutable authorship.
- `POST /api/pr/:id/join` repairs a creatorless active PR by assigning the earliest active participant as `createdBy` after the join succeeds.
- `POST /api/pr/:id/exit`, admin participant release, and automatic confirmation-deadline release reconcile `createdBy` after active participant changes and waitlist promotion: if the current creator remains active it stays unchanged; otherwise the earliest remaining active participant becomes `createdBy`; if no active participant remains, `createdBy` becomes `null`.
- PR detail action projection must not block `exit` solely because the viewer is the current creator.
- `GET /api/pr/mine/created` and `GET /api/pr/mine/joined` return id-only PR list items. They express membership in the viewer's created and joined PR collections. Preview rendering of title, status, location, time, and participant count reads `GET /api/pr/:id`.
- `/prd` directory and recommendation responses carry a bounded canonical PR candidate projection with `prId` and `/pr/:id` path. Candidate actions enter the ordinary PR detail page; they do not fork PR facts or mount a second join flow inside Discovery.
- `GET /api/pr/:id` returns `core.location`, `core.route`, and `core.placeDisplayName`. Location-mode PRs return `route: null`; route-mode PRs return `location: null` and expose the compact route summary as `core.placeDisplayName`.
- `GET /api/pr/:id` returns canonical PR title and optional support QR fields directly in the PR read model. Title fallback order is explicit PR title, `PR.type`, compact route summary or primary location, then the generic `PR` label. Frontend consumes this read-model truth and never derives a second type identity.
- `GET /api/pr/:id` returns `core.meetingPoint`, the backend-resolved meeting-point guidance, plus `core.meetingPointVisibility`. Fallback order is PR-specific configuration, current PR-type/place guidance, then POI configuration. Route-mode PRs have `location: null`, so meeting-point resolution stops after PR-specific configuration and automatic type/POI fallbacks resolve to empty. Before `ACTIVE`, `core.meetingPointVisibility` is `VISIBLE` when guidance exists. After `ACTIVE`, when resolved guidance exists, the backend returns `core.meetingPoint` only to current active participants; other viewers receive `core.meetingPoint: null` and `core.meetingPointVisibility: ACTIVE_PARTICIPANTS_ONLY`. Frontend renders the value or the private placeholder under the primary location in the facts card.
- `GET /api/pr/:id` returns a feedback projection when the PR has a mounted feedback questionnaire instance. The projection includes the instance id, the questionnaire definition snapshot needed for rendering, and the current viewer's response state so the frontend can offer submission or retry without deriving feedback truth locally.
- `POST /api/feedback/:instanceId` is the authenticated feedback questionnaire submission contract. The route treats `instanceId` as a `FeedbackQuestionnaireInstance` id, validates answers against that instance's definition snapshot, and upserts one `FeedbackQuestionnaireResponse` for the current respondent identity. PR participation, attendance, and slot ownership gating live in PR integration surfaces rather than in this generic feedback command.

## 4. Join Gates And Waitlist Contract

- `GET /api/pr/:id/join-gates` is the PR join-gate projection contract. It returns the current viewer's configured join gates with per-gate resolved state. The projection reads PR-owned `joinGateConfig`; when that config is empty it returns an empty gate list; join-notice gate resolution comes from the current viewer's notice acceptance record.
- `POST /api/pr/:id/join-gates/:gateKey/resolve` resolves one configured join gate before join or waitlist. `JOIN_NOTICE` writes a viewer-scoped notice acceptance for the gate key and version. When the request lacks an acceptable user identity, it returns `AUTHENTICATED_REQUIRED` through the shared Problem Details error contract. Fallback confirmation is a frontend-injected confirmation view and has no backend projection item or durable resolve command.
- `POST /api/pr/:id/join` rejects unresolved configured join gates with problem code `PR_JOIN_GATE_UNRESOLVED` and rejects PR-type participation frequency violations with problem code `PR_TYPE_PARTICIPATION_FREQUENCY_LIMITED`. Frontend should refresh `GET /api/pr/:id/join-gates` and continue the join-gate modal when it sees the join-gate code. Authentication-required failures use `AUTHENTICATED_REQUIRED` and are handled by the shared RPC auth policy.
- `POST /api/pr/:id/waitlist` creates or reuses one `PENDING` partner slot for the current authenticated viewer when the PR is full-capacity `OPEN` and still before the join-lock boundary. It reuses the same identity, join-gate, PR-type participation frequency, and time-conflict guardrails as join, returns the refreshed public PR view only, and does not make the viewer an active participant. When session rotation is issued, it uses the shared `x-access-token` response header; the response body carries no auth/session payload.
- `POST /api/pr/:id/waitlist` accepts optional JSON field `alternativePrReminderOptIn`. When true, backend stores a waitlist-slot preference that allows exact same-type and same-location alternative PR availability reminders under notification kind `WAITLIST_ALTERNATIVE_AVAILABLE`. Route-mode PRs have `location: null`, so they remain outside this location-matched alternative reminder policy.
- The alternative reminder preference belongs to the source `PENDING` partner slot. Backend clears it when that slot is cancelled or converted out of pending state.
- When the user grants `WAITLIST_ALTERNATIVE_AVAILABLE` quota after waitlist entry, backend rescans that user's opted-in pending source slots for existing alternatives.
- When the same user successfully joins a matching alternative PR, backend cancels matching source pending slots, clears source join-gate resolutions, and records `partner.waitlist_cancel_alternative_joined`.
- `POST /api/pr/:id/waitlist/cancel` converts the current authenticated viewer's pending waitlist slot to `CANCELLED`, clears that viewer's join-gate resolutions for the PR, and returns the refreshed public PR view. Cancelling a pending slot does not promote another waiter because no active capacity was released.
- `GET /api/pr/:id` exposes waitlist state through `partnerSection.viewer.isWaitlisted`, `pendingPartnerId`, `waitlistRank`, `canWaitlist`, and `waitlistBlockedReason`. Frontend should render waitlist CTA and state from these fields.
- The frontend PR join flow remains owned by PR detail. Discovery candidate actions, including matched and nearby FORM results, first enter canonical `/pr/:id`, where join-gate resolution, command execution, auth replay, and post-command prompts remain unified.
- The frontend waitlist flow owns only the opt-in checkbox presentation and submits the checkbox value through the typed waitlist command. Backend owns alternative candidate selection, dispatch-time eligibility, source-slot closure, and notification delivery persistence.

## 5. Study Sprint Contract

- `/pr/:id/study-sprint` is the Study Sprint Pomodoro room route for current active participants of `ACTIVE` `STUDY_SPRINT` PRs.
- PR detail exposes its entry in Utility Actions with copy `开始一起专注<duration>分钟`, using PR time-window-derived duration and a 30-minute fallback.
- The backend Study Sprint contract owns room/session/event persistence and participant-only snapshot reads under `/api/study-sprint/*`.
- Frontend owns route placement, first-use guidance, local timer display, polling cadence, and event submission.

## 6. Share Descriptor Contract

- Entity-backed public detail routes such as `GET /api/pr/:id` provide canonical share metadata inside the detail payload.
- Canonical share metadata includes stable route-owned fields required for base share correctness:
  - title
  - description
  - canonical path
  - default image path
  - revision token
- Canonical PR share title fallback order is explicit PR title, `PR.type`, compact route summary or primary location, then the generic `PR` label. It stays aligned with PR detail title derivation.
- Canonical PR share description may include compact route summary in the same detail slot currently used for primary location. Richer route wording belongs to the share surface that owns that description.
- Frontend treats that metadata as the source for base share descriptors rather than recomputing a separate share truth in page-local code.
- Rich descriptions, thumbnails, and posters remain optional enhancements; failure to produce them must not remove or invalidate the base share descriptor.
- WeChat share coordination distinguishes:
  - the signature URL used to initialize JS-SDK for the current route
  - the target URL that will actually be shared outward
- Frontend owns the route-scoped active share session and replay behavior, and it uses backend-provided canonical share metadata for entity truth.

## 7. Action Availability Contract

- PR detail participation action components should depend on canonical PR read models plus ambient journey context. Route/process entry context should not be copied through component props solely to satisfy telemetry attribution.
- `/pr/:id` participant roster UI should use the existing `/pr/:id/partners/:partnerId` profile route for participant-badge navigation rather than introducing a second profile-route family.
- `GET /api/pr/:id/actions/preflight` is the batch action-availability contract for PR detail UX. It evaluates one viewer against one PR and returns action entries such as `join`, `confirm`, and `check_in` through one stable minimal shape:
  - `evaluatedAt`
  - `actions[actionName].allowed`
  - `actions[actionName].problem.type`
  - `actions[actionName].problem.code`
  - `actions[actionName].problem.title`
  - `actions[actionName].problem.detail`
  - `actions[actionName].nextRelevantAt`
- Preflight reads stay advisory. Backend command handlers remain authoritative and reuse the same decision logic plus the same stable `type` and `code` values when they reject a write.
- `OPTIONS /api/pr/:id/actions` may expose generic method capabilities and `HEAD /api/pr/:id/actions/preflight` may support metadata-aware infrastructure behavior. PR action availability semantics live on the `GET` response body.
- Action-availability transport shape is a cross-unit reusable substrate. Each domain owns its action-name set, code registry, and fact loader.
