# System State And Authority

## Backend-Authoritative State

Persisted in Postgres via backend entities and repositories:

- `PartnerRequest` as the single durable PR record, including PR-level place facts (`location` or `PR.route`), PR-level meeting-point override configuration, PR-level join-gate configuration, and PR-level mounted feedback questionnaire instance pointer
- partner slots and participation state
- PR messages and per-user PR message inbox state
- users, including `users.phone_number`, user notification options, and user reliability
- `users.wechat_official_account_followed_at` as the positive marker that the backend has confirmed a user follows the WeChat official account
- anchor events, event-specific beta-group QR codes, landing rollout config, event-owned preset preference tags and moderation state, event-owned default PR notes, event-owned join-gate templates, event-owned feedback questionnaire template pointers, unified event location pools, event-owned route pools, event-owned meeting-point defaults and location-specific meeting-point overrides, type-derived Anchor Event PR context, time-pool strategy state, POIs with integer identity, name-based location matching, optional full address and coordinate pairs, submission status, meeting-point fallback configuration, per-time-window capacity and availability rules, support resources, booking-resource join-gate templates, booking-contact resolution derived from users and active participants, join-notice acceptances, and booking execution records
- feedback questionnaire templates, feedback questionnaire instances, and feedback questionnaire responses
- config, operation logs, domain events, outbox events, jobs, notification opportunities, notification waves, and notification deliveries
- analytics aggregate tables

This is the source of truth for product behavior.

## Backend-Derived Operational State

- outbox backlog and event-processing progress
- job leases, retries, due-job claims, and bucket-based scheduling semantics carried by `run_at`, `resolution_ms`, `early_tolerance_units`, and `late_tolerance_units`
- notification opportunity scheduling, wave state, send attempts, and cleanup state

These shape runtime behavior but remain backend-owned.

## Frontend Non-Authoritative State

- TanStack Query caches of backend data
- route-local UI state
- local message composer drafts and thread expansion/collapse state
- local and session storage for session tokens, anonymous user id, admin tokens, pending WeChat actions, official-account follow prompt cooldown, anchor-event landing mode stability, analytics session id, and `spm`
- active route-share session state, currently selected share descriptor, and replay bookkeeping for WeChat/browser share flows

This state improves UX and continuity but does not define product truth.

## Authority Boundary Rules

Canonical entity reads are the source for entity facts used across routes and
surfaces. A frontend preview or list component that renders stable facts for an
entity should receive the entity id and load those facts through the canonical
read contract for that entity. Caller-provided data should represent caller
context, such as placement, route override, cover media, time label, or action
slots.

The backend is authoritative for:

- PartnerRequest and partner-slot state
- persisted `PR.route`, route schema validation, location/route mutual exclusion, canonical route display label, and canonical share metadata derivation
- PR feedback questionnaire instance pointers
- feedback questionnaire templates, instances, and responses
- PR detail meeting-point fallback resolution
- PR message visibility, read-marker progression, and notification wave gating
- identity binding, session verification, and role semantics
- confirmed WeChat official-account follow state derived from official-account follower-list sync
- event, time-pool, POI, booking-support, and admin-managed configuration state
- POI submission status, submitter linkage, reviewer linkage, and rejection reason
- `POI.id` is the durable integer identity; `POI.name` is the business location label used when matching `PR.location` and Anchor Event location-pool entries to POI-owned data.
- PR join-gate configuration, join-gate projection, booking-contact resolution from active participant `users.phone_number`, and join-notice acceptance resolution
- PR feedback questionnaire projection, including mounted instance and current viewer response state
- notification scheduling and dispatch for meeting-point update notifications
- POI-owned availability rules that determine whether a PR location accepts a full PR time window
- event-owned preference-tag pool, moderation state, default PR notes for future materialization, route pool, landing recommendation, and type-derived Anchor Event PR context
- event-owned feedback questionnaire template pointer used for future PR materialization
- event-specific beta-group QR codes; generic config must not be the owner for activity-specific beta-group entry
- domain events, notifications, analytics persistence, and operation logs

The frontend is authoritative for:

- route composition and page assembly
- UI-specific interaction state
- route editor draft interaction state, map provider rendering state, marker/polyline presentation state, and viewport fitting behavior
- browser-side storage and pending-action continuity
- capability detection and fallback UX
- client-side caching and invalidation strategy
- active route-scoped share orchestration and replay of the current share descriptor

The frontend must not recreate or override backend domain rules as independent truth.

## Escalation Rule

Update Product TDD when a change affects:

- ownership of authoritative state
- backend/frontend error semantics relied on by flows
- authentication mode or token/cookie contract
- route-to-API coordination shape
- whether a responsibility stays inside one unit or becomes a shared contract
