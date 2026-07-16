# System State And Authority

## State Family Map

This file intentionally keeps the authority map in one place. Use this family map to scan the dense authority list without treating the families as separate owners.

| Family | State Examples |
| --- | --- |
| Collaboration state | `PartnerRequest`, partner slots, PR place facts, join gates, current creator, meeting-point guidance, Study Sprint. |
| Identity and session state | users, anonymous UUID continuity, authenticated session, WeChat binding and official-account follow markers. |
| PR discovery and location state | Current PR Type Configuration, discovery view policy, type presets, POIs, POI submissions, and location availability. |
| Messaging and notification state | PR messages, inbox state, notification opportunities, waves, deliveries, jobs, outbox events. |
| Commerce, payment, and provider state | merchandising, listing quotes, orders, rental and RideHailing execution, bills, provider registry, payment execution. |
| Analytics and BI state | telemetry storage, enrichment, aggregate/projection tables, BI facts. |
| Frontend non-authoritative state | route-local UI state, TanStack Query caches, local/session storage, share replay, capability fallback state. |

## Backend-Authoritative State

Persisted in Postgres via backend entities and repositories:

- `PartnerRequest` as the single durable PR record, including PR-level place facts (`location` or `PR.route`), PR-level meeting-point override configuration, PR-level post-ready edit policy, PR-level join-gate configuration, and PR-level mounted feedback questionnaire instance pointer
- partner slots and participation state
- PR messages and per-user PR message inbox state
- users, including `users.phone_number`, user notification options, and user reliability
- `users.wechat_official_account_followed_at` as the positive marker that the backend has confirmed a user follows the WeChat official account
- current PR Type Configuration selected by `PR.type`, view ratios for `/prd`, type-owned preference tags and moderation state, current type defaults, type-owned location/route suggestions, type-owned meeting-point defaults, POIs with integer identity, name-based location matching, optional full address and coordinate pairs, submission status, meeting-point fallback configuration, per-time-window capacity and availability rules, and join-notice acceptances
- feedback questionnaire templates, feedback questionnaire instances, and feedback questionnaire responses
- config, operation logs, domain events, outbox events, jobs, notification opportunities, notification waves, and notification deliveries
- analytics aggregate / projection tables, including user telemetry enrichment and BI facts
- ecommerce merchandising truth, including Product Catalog (`SPU` / `SKU`),
  Offer, Placement Instance, Offer pricing rules, SKU pricing models, SKU
  facts, and SKU base cancellation policy
- ecommerce listing / quote truth, including persisted Offer Listing quote
  snapshots and quote validity state
- ecommerce trade truth, including Order, order snapshots, PR-attached order
  relation, and order termination attempts
- ecommerce family execution truth, including Rental execution fields on
  `rental_orders` and RideHailing execution fields on `ride_hailing_orders`;
  RideHailing provider binding lives in Trade order choice-set resolution
  snapshots
- ecommerce bill truth, including Bill, BillLine, BillLine payment execution
  slot identity, BillLine settlement confirmation, and settlement derivation
- ecommerce payment provider registry truth, including configured provider
  instances and provider routing credentials
- Study Sprint Pomodoro room, participant session, event ledger, and session aggregate state

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
- local and session storage for session tokens, anonymous user id, admin tokens, pending WeChat actions, official-account follow prompt cooldown, `/prd` view continuity, user telemetry `journey_id`, and `spm`
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
- PR edit capability, including which fields are editable in each status and any `allowEditAfterReady` constraints
- persisted `PR.route`, route schema validation, location/route mutual exclusion, canonical route display label, PR detail/share display-title derivation, and canonical share metadata derivation
- PR feedback questionnaire instance pointers
- feedback questionnaire templates, instances, and responses
- PR detail meeting-point fallback resolution
- PR message visibility, read-marker progression, and notification wave gating
- Study Sprint Pomodoro eligibility, room snapshot visibility, participant session persistence, event ledger writes, and aggregate focus-state projection
- identity binding, session verification, and role semantics
- confirmed WeChat official-account follow state derived from official-account follower-list sync
- current PR type, discovery, POI, and admin-managed configuration state
- POI submission status, submitter linkage, reviewer linkage, and rejection reason
- `POI.id` is the durable integer identity; `POI.name` is the business location label used when matching `PR.location` and current PR type place choices to POI-owned data.
- PR join-gate configuration, join-gate projection, and join-notice acceptance resolution
- PR feedback questionnaire projection, including mounted instance and current viewer response state
- ecommerce merchandising configuration and placement matching outcome
- ecommerce order, family execution, bill, and BillLine settlement lifecycle
  truth
- ecommerce payment provider registry and provider routing configuration
- notification scheduling and dispatch for meeting-point update notifications
- POI-owned availability rules that determine whether a PR location accepts a full PR time window
- PR type preference-tag pool, moderation state, default PR notes for future materialization, place/route suggestions, view policy, and type-specific discovery/authoring behavior
- PR type questionnaire template pointer used for future PR materialization
- domain events, notifications, analytics persistence, and operation logs
- user telemetry storage, event registry acceptance, telemetry enrichment, and BI projections

The frontend is authoritative for:

- route composition and page assembly
- Study Sprint Pomodoro first-use guidance, local timer display, polling cadence, and lifecycle-event submission
- UI-specific interaction state
- route editor draft interaction state, map provider rendering state, marker/polyline presentation state, and viewport fitting behavior
- browser-side storage and pending-action continuity
- capability detection and fallback UX
- client-side caching and invalidation strategy
- active route-scoped share orchestration and replay of the current share descriptor

The frontend must not recreate or override backend domain rules as independent truth.

Payment provider systems are authoritative for gateway-facing payment lifecycle
state, provider transaction identifiers, provider payload snapshots, and
provider failure status. The backend may query or verify provider state when
building payment projections or accepting callbacks, but it must not persist a
separate provider transaction state mirror as product truth.

## Escalation Rule

Update Product TDD when a change affects:

- ownership of authoritative state
- backend/frontend error semantics relied on by flows
- authentication mode or token/cookie contract
- route-to-API coordination shape
- whether a responsibility stays inside one unit or becomes a shared contract
