# Event-Context Contracts

This file owns cross-unit contracts for Anchor Event discovery, event-assisted PR creation, Form Mode, dummy PR materialization, event list/card/search, POI applications, and event-context telemetry.

## 1. Anchor Event To PR Contract

- Anchor Event assisted create prepares the same PR-owned structured payload and submits `POST /api/pr/new/form`.
- Event-assisted create carries transient create source or event referral through frontend route state, while persisted PR state remains the same PR-owned field set used by structured create.
- Event-assisted create submits ordinary structured place fields: location mode writes `PartnerRequest.location` and clears `PartnerRequest.route`; route mode writes `PartnerRequest.route` and clears `PartnerRequest.location`.
- Event-assisted create uses the same authenticated mutation boundary and publish behavior as structured PR creation.
- Anchor Event owns `prCreationPolicy`. `USER_AND_ADMIN` allows public structured, natural-language, event-assisted, and Form Mode zero-candidate auto-create for that event type. `ADMIN_ONLY` admits Admin PR creation and Admin PR content editing for that event type while public structured create, natural-language create, event-assisted create, and Form Mode zero-candidate auto-create for that event type return stable code `ANCHOR_EVENT_USER_PR_CREATION_DISABLED`.
- Anchor Event owns `fullPrExpansionPolicy`. `DISABLED` is the default and keeps a full event-context PR as the only PR for that event time window unless another create path runs. `ENABLED` lets the backend full-status join path attempt system auto-expansion into a visible sibling PR under the same event type and time window.
- Anchor Event owns `participationFrequencyLimit`. When `intervalPrCount` is present, PR-core join and waitlist commands order visible event PRs by time-window start, time-window end, then PR id. A user whose latest active event participation (`JOINED`, `CONFIRMED`, or `ATTENDED`) is within that interval is rejected with stable code `ANCHOR_EVENT_PARTICIPATION_FREQUENCY_LIMITED`; `PENDING`, `EXITED`, `RELEASED`, and `CANCELLED` slots do not count as limiting history. PR detail projects the same rule through `partnerSection.viewer.joinBlockedReason` or `waitlistBlockedReason`.
- `PR.type` is the input that Anchor Event context resolution depends on. User-side PR content edits do not accept `type` after creation, so ordinary edits cannot make event-context reads drift away from creation-time materialized PR runtime state. Admin PR content editing remains the operator-owned reclassification path.
- The old public batch-specific event-create route is retired from the public contract surface.
- PR creation resolves event-owned defaults by PR type when that type maps to an Anchor Event. The created PR receives materialized PR-owned state for event-owned default notes when the create payload has no notes, confirmation enablement and timing defaults, join gates, and feedback questionnaire instance pointer. This materialization rule applies to public structured create, event-assisted create, Form Mode zero-candidate auto-create, admin create, and system auto-expansion. Later Anchor Event default edits affect future PRs only.

## 2. Event Landing And Search Routes

- `/events/search` is a PR discovery route scoped by one active `Anchor Event` plus one or more local dates; its route state should be recoverable through query parameters such as `eventId` and repeated date values.
- `/e/:eventId` is the ad-scan-first canonical Anchor Event landing entry; it may render `FORM`, `CARD_RICH`, or `LIST` mode, while `/events/:eventId` forwards legacy traffic to the landing route.
- `/` and `/e/:eventId` may trigger the official-account follow nudge through one shared frontend 6-hour local cooldown. The Home page uses a later timed prompt, while the event route may prompt after 3 seconds.
- `/e/:eventId` owns the Form Mode selection state, no-match candidate result state, and zero-candidate system auto-create handoff in one route-level state machine.
- `GET /api/events` is the public active Anchor Event catalog contract and should return enough event object data for event-card selection surfaces. Response ordering is backend-authoritative display policy, so frontend should treat it as opaque instead of hardcoded ranking truth; it does not own PR search results.
- `GET /api/events` and `GET /api/events/:eventId` expose each Anchor Event's beta-group QR code when configured; `/about` and `/e/:eventId` use that event-owned value for beta-group entry instead of reading a generic beta-group public config key.
- Anchor Event stores assisted place pools as `locationPool` and `routePool`. `routePool` entries are shaped as `{ id, route }`, where `route` reuses the `PartnerRequest.route` point schema. One event may have location entries or route entries as its assisted place source, and the database enforces that pool-mode invariant.
- `GET /api/events/:eventId/landing-assignment` returns the backend-authored landing mode plus `assignmentRevision` for `/e/:eventId`.

## 3. Form Mode Contract

- `GET /api/events/:eventId/form-mode` is the Form Mode bootstrap contract. It returns the event snapshot, user PR creation policy projection, event-owned PR time-window editor default mode, location gallery projection, route-pool source-option projection, available start options with start-rule-derived descriptions, each location's POI-availability-filtered start keys, each route's start keys, published preset preference tags, and an optional backend-authored default selection from the nearest joinable location-mode PR under that event's time boundary.
- `POST /api/events/:eventId/form-mode/recommendation` accepts one selected place (`{ kind: "location", locationId }` or `{ kind: "route", route }`), a concrete `timeWindows: Array<{ startAt, endAt }>` set, and the current preference labels, then returns one matched recommendation plus an ordered candidate list.
- Route selection is matched against the submitted concrete route rather than a route-pool entry id; the submitted route may be a local reverse of a route-pool source option.
- `timeWindows` are PR start-time match windows: point windows require candidate `PR.time_window[0]` equality, and non-point windows use the half-open rule `startAt <= PR.time_window[0] < endAt`.
- The backend does not interpret fuzzy UI presets and does not match against PR duration overlap. Fuzzy time preference is frontend UI input only and is not persisted as fuzzy state on `PR`; the frontend expands all-day fuzzy input to one product-local day window from `00:00` inclusive to the next local `00:00` exclusive.
- When the request has a current viewer user id, backend excludes PRs where that viewer is already an active partner (`JOINED`, `CONFIRMED`, or `ATTENDED`) before ranking recommendations.
- When both recommendation result lists are empty, frontend submits `POST /api/events/:eventId/form-mode/auto-create` with the concrete selected creation time window, selected place, full preference-label set, and optional READY-after edit policy. The backend creates a system-owned `OPEN` PR (`createdBy = null`) and returns its canonical detail path; the frontend routes to that PR detail without the created-request notice handoff. The first later active join claims current creator responsibility through the shared PR join contract.

## 4. POI Application And Public POI Contract

- Form Mode location creation is a route entry into POI application, not an Anchor Event mutation.
- `POST /api/pois/applications` creates a `PENDING` POI from one name and one image URL.
- `GET /api/pois/applications/mine` returns the current user's submitted POI applications.
- POIs have integer `id` identity and a unique `name`; `PR.location` remains an arbitrary string and matches POI-owned data by `POI.name`.
- Public POI reads return only `PUBLISHED` POIs. Admin POI reads include all statuses and admin POI commands may publish or reject user-submitted POIs.
- POI coordinate fields are nullable two-number tuples: `gcj02`, `wgs84`, and `bd09`, each encoded as `[lat, lng]`. `fullAddress` is nullable text.
- Public POI reads keep their existing `meetingPoint` response shape.

## 5. Event List, Card, Search, And Dummy PR Contract

- `POST /api/events/:eventId/preference-tags/submissions` accepts visitor-authored label-only tags, records them as pending event-owned preference-tag moderation items, and does not automatically expose them to later visitors.
- `GET /api/events/:eventId/demand-cards` is the backend-authored card-mode demand projection contract. It returns only joinable `OPEN` demand-card groups for that event after excluding PR candidates where the current viewer is already an active partner.
- The old public demand-card join route is retired from the public contract surface.
- `GET /api/events/:eventId` exposes public event discovery through browse time-window groups built from visible PRs whose `PR.type` resolves to that Anchor Event. Create time options come from event start rules; create location options come from `event.locationPool` plus POI-owned per-time-window capacity and POI-owned availability rules; create route options come from `event.routePool`. The response also exposes whether user PR creation is allowed for the event and the event-owned PR time-window editor default mode used by Card/List assisted create. Event-owned create time windows include start-rule-derived description copy when configured.
- `GET /api/events/:eventId/demand-cards` groups demand through compatibility card keys, while the underlying candidate PR set comes from visible, joinable root PR reads whose `PR.type` resolves to that Anchor Event and whose active partner set does not already include the current viewer.
- `GET /api/pr/search` is the PR search read contract. It queries by active `Anchor Event` id plus repeated local-date values and returns matching visible actionable PR candidates under that event's `PR.type` resolution and time-pool rules.
- If PR search has exactly one result, frontend may replace-route to `/pr/:id` while avoiding a browser-back auto-redirect loop.
- `/events/:eventId` accepts optional query `mode=card|list` as compatibility route state and forwards it to `/e/:eventId`; missing or invalid values use the landing route's stored assignment, backend assignment, or fallback behavior.
- `/e/:eventId` `LIST` landing mode renders the event-domain List Mode surface and follows the same date grouping, PR visibility, event-assisted create, beta-group, and other-event browsing semantics as the previous Anchor Event list view.
- A valid `/e/:eventId?mode=` query is explicit frontend route state for initial rendering and in-page mode switching, and the frontend skips `GET /api/events/:eventId/landing-assignment` while it is present; `spm` remains attribution-only rather than a UI-mode switch.
- Without valid route mode, frontend stabilizes `/e/:eventId` landing mode through local storage keyed by `eventId + assignmentRevision`; timeout fallback enters `LIST`.

## 6. Event-Context Telemetry Contract

- Anchor Event landing, recommendation, PR detail entry, PR create, PR join, and PR waitlist flows emit registry-governed user telemetry for the Anchor Event -> PR funnel through the current `journey_id`.
- Funnel attribution should be reconstructed from context events, event-owned payload, and BI projections rather than from `app_journey_id`, `segment_id`, or command `correlation_id` fields.
