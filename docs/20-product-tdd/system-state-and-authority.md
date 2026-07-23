# System State And Authority

## State Family Map

This file intentionally keeps the authority map in one place. Use this family map to scan the dense authority list without treating the families as separate owners.

| Family | State Examples |
| --- | --- |
| Collaboration state | `PartnerRequest`, partner slots, PR place facts, join gates, current creator, meeting-point guidance, Study Sprint. |
| Identity and session state | users, anonymous UUID continuity, authenticated session, WeChat binding and official-account follow markers. |
| PR discovery and location state | Current PR Type Configuration, discovery view policy, type presets, POIs, POI submissions, and location availability. |
| Messaging and notification state | PR messages, user notification options, durable Jobs and held/released Job creation reservations. Pure attempt history is program observability. |
| Commerce, payment, and provider state | merchandising, listing quotes, orders, retained historical Rental execution, active RideHailing execution, bills, provider registry, payment execution. |
| Analytics and BI state | telemetry storage, enrichment, aggregate/projection tables, BI facts. |
| Frontend non-authoritative state | route-local UI state, TanStack Query caches, local/session storage, share replay, capability fallback state. |

## Backend-Authoritative State

Target authoritative persistence after the declared compatibility windows:

- `PartnerRequest` as the single durable PR record, including PR-level place facts (`location` or `PR.route`), PR-level meeting-point override configuration, PR-level post-ready edit policy, PR-level join-gate configuration, and PR-level mounted feedback questionnaire instance pointer
- partner slots and participation state
- PR messages; the target contract has no general per-user PR read/unread state
- users, including `users.phone_number`, user notification options, and user reliability
- `users.wechat_official_account_followed_at` as the positive marker that the backend has confirmed a user follows the WeChat official account
- current PR Type Configuration selected by `PR.type`, view ratios for `/prd`, type-owned preference tags and moderation state, current type defaults, type-owned location/route suggestions, type-owned meeting-point defaults, POIs with integer identity, name-based location matching, optional full address and coordinate pairs, submission status, meeting-point fallback configuration, per-time-window capacity and availability rules, and join-notice acceptances
- feedback questionnaire templates, feedback questionnaire instances, and feedback questionnaire responses
- config, operation logs, Jobs, Job creation reservations, and user notification options
- analytics aggregate / projection tables, including user telemetry enrichment and BI facts
- ecommerce merchandising truth, including Product Catalog (`SPU` / `SKU`),
  Offer, Placement Instance, Offer pricing rules, SKU pricing models, SKU
  facts, and SKU base cancellation policy
- ecommerce listing / quote truth, including persisted Offer Listing quote
  snapshots and quote validity state
- ecommerce trade truth, including Order, order snapshots, PR-attached order
  relation, order termination attempts, and `CreateOrderAttempt` idempotency /
  provider-unknown recovery state
- ecommerce family execution truth, including retained historical Rental
  execution fields on `rental_orders` and active RideHailing execution fields
  on `ride_hailing_orders`; RideHailing provider binding lives in
  `ride_hailing_orders.dispatchBinding`, while the Trade choice-set resolution
  records only the final vehicle resolved by the provider lifecycle. Provider
  fee confirmation introduces no separate RideHailing business lifecycle or
  uncertainty authority
- ecommerce bill truth, including Bill, BillLine, BillLine payment execution
  slot identity, BillLine settlement confirmation, and settlement derivation.
  For RideHailing, the first qualifying all-charge-settled transition,
  including all-zero final-Bill creation, ensures its fee-confirmation Job in
  the same named transaction
- ecommerce payment provider registry truth, including configured provider
  instances and provider routing credentials
- Study Sprint Pomodoro room, participant session, event ledger, and session aggregate state

This is the source of truth for product behavior.

### Phase 6 Notification Retirement Boundary

`pr_message_inbox_states`, `notification_opportunities`,
`notification_waves`, the read-marker API and every concrete per-kind
Notification Job handler/decoder are forward-retired. The cut-off intentionally
did not preserve old clients or pending concrete Jobs, and no current behavior
may recreate those state families. Generic `notification.send.v1` Jobs and the
semantic visible-thread acknowledgement are the current path.

`notification_deliveries` alone remains transitional audit compatibility data
until Phase 7 provides governed attempt observability. It is neither
authoritative notification state nor Job control, and current generic
notification work does not write it. Historical per-kind handlers, decoders
and Delivery writers are forward-retired; the retained rows are inert audit
history rather than an active compatibility path.

Current PRMessage rows retain a nullable tombstone and expose an all-row
acknowledgement cursor; ordinary visible thread/context reads exclude
tombstones. The dedicated Web route uses the semantic acknowledgement route
only after a rendered, visible thread; raw reads cannot release a generic
reservation. PR validates participant access and all-row cursor ownership,
then Notification maps that semantic request to private Job control.
Administrative message deletion tombstones the visible row and releases
affected current-recipient attention windows in the same transaction; root
deletion captures/releases the active roster before cascade. Physical purge
remains a later retention concern, never a shortcut around a held cursor.

For the PR-message attention-window family, `user_notification_opts` is also
the narrow serialization boundary between source-time availability and
preference/provider mutation: the source locks the recipient option row before
it creates a held Job reservation, while Notification locks that same row to
clear or restore credit and release stale/current reservations. Job still owns
only neutral reservation control under opaque creation identities; it does not
own opt-out, provider, PR-status or membership semantics.

PR owns the source facts that make a PR-message window ineligible: active
membership, terminal status, visible-message tombstone and root lifetime. Its
named lifecycle transactions lock `PR → current roster`, change the PR fact and
ask Notification to invalidate semantic recipient/aggregate scope before
commit. Notification alone turns that scope into private Job control. The
generic `43101` path and authenticated PR-message subscription route use the
same Notification-owned preference/credit clear transaction; restoring credit
does not recreate historical attention.

## Backend-Derived Operational State

- Job leases, retries, due-job claims, bucket-based timing, held/released
  creation reservations and generic terminal execution status
- the typed, terminal-safe `ONCE_PER_CAUSE` RideHailing fee-confirmation Job;
  its versioned business payload carries only local `orderId`, and its status is
  generic execution control rather than provider-effect or settlement business
  state
- no governed Job-attempt telemetry backend currently exists;
  `notification_deliveries` remains transitional audit compatibility rather
  than authoritative operational state

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
- PR message visibility and explicit visible-thread acknowledgment; Notification
  maps acknowledgment to a private Job creation-window release
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
- notifications, analytics persistence, and operation logs
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
