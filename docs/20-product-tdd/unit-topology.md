# Unit Topology

Architecture objectives, module construction and exception rules are owned by
[`architecture-objectives-and-decision-rules.md`](./architecture-objectives-and-decision-rules.md). This file
owns the current technical units, domain owner map and allowed dependency direction.

## Technical Units

### Backend Unit

Code container: `apps/backend`

Owns:

- HTTP API surfaces under `/api/*` and `/internal/*`
- domain rules, eligibility checks, and state transitions
- authoritative persistence
- auth/session verification
- durable Job control/creation modes, Notification semantics/channel edges,
  runtime diagnostics, future program-observability integration, and analytics
  persistence
- integrations with WeChat, WeCom, LLM, and operational configuration

### Frontend Unit

Code container: `apps/web`

Owns:

- route entrypoints and page composition
- browser-side workflow orchestration
- typed RPC consumption
- local persistence for session continuity, attribution, and pending browser actions
- environment-aware UX for share, WeChat auth, and client capability fallback

## Supporting Containers That Are Not Separate Technical Units

- repo root workflows under `scripts/` and `.github/`
- root system scenario tests under `tests/scenario/`
- documentation under `docs/`
- deployment descriptors such as `apps/backend/s.yaml`

These support delivery and operations but do not own independent product behavior.
`tests/scenario/` coordinates real frontend rendering, real backend HTTP, and
isolated database state to verify cross-unit user journeys from the browser
edge.

## Internal Subsystem Clusters

Backend clusters:

- PR lifecycle and coordination: `pr`
- PR Discovery/Authoring and POI integration: `pr`, `poi`
- ecommerce: `merchandising`, `trade`, historical-Rental `fulfillment`,
  `ride-hailing`, `bill`, `payment`
- identity and user: `auth`, `user`
- admin and operations: admin management, POI/config/meta
- cross-cutting infra: jobs, notifications, user telemetry, analytics

Frontend clusters:

- app/process layer: app bootstrap, router, auth bootstrap, WeChat processes
- domain layer: `pr`, `share`, `user`, `admin`, `analytics`, `support`, `landing`
- shared layer: generic UI, auth/session storage, user-telemetry runtime, and API helpers
- page layer: route entrypoints
- narrow compatibility/util surface: remaining top-level `lib`; add no new
  owners there. The former top-level `router` and `stores` re-export bridges
  are retired; router wiring belongs to `app`, and session state belongs to
  `shared/auth`.

These are subsystem clusters inside the two units, not independent top-level units.

## PR Domain Owner Map

| Capability | Current owner / state | Target dependency direction |
| --- | --- | --- |
| PR Lifecycle and canonical PR facts | `domains/pr` owns the canonical surface, lifecycle implementation and read projections; the former `domains/pr-core` compatibility implementation was retired in Phase 3 slice `3-5` | callers → curated `domains/pr` command/query/contract |
| PR Type Configuration | `domains/pr-type-config` owns current-policy queries, operator commands and stable contracts; its Postgres repository remains internal. `admin-pr-type-config` is the operator composition/HTTP adapter. | consumers → named neutral PR Type Configuration queries/commands/contracts → internal persistence; Admin remains an adapter and does not duplicate policy validation or writes |
| PR Authoring | `domains/pr-authoring` plus ordinary PR creation commands | route/controller → Authoring public options/submission surface → ordinary PR command |
| PR Discovery | `domains/pr-discovery` for catalog, view resolution, directory and recommendation reads | route/controller → Discovery query surface → canonical PR/Type/POI reads |
| PR Messaging | `domains/pr` owns messages, visibility, message/lifecycle source facts and the visible-thread acknowledgment surface; Notification owns semantic attention-window schedule/release and private Job mapping | Web/route → PR message command/query → Notification semantic schedule/acknowledgment; PR lifecycle/admin transactions supply only executor plus PR/recipient facts, and no caller imports Job persistence, creation keys or provider template data |
| POI | `domains/poi` and POI persistence | Authoring/Discovery consume POI-owned query/contracts rather than duplicating location authority |
| Feedback Questionnaire | `domains/feedback-questionnaire` and feedback persistence | PR integration consumes feedback command/query/contracts; questionnaire owner remains independent |

The `domains/pr-core` compatibility window is closed: its implementation and the private `PartnerRequestService`
facade were removed after runtime, type-only and test consumers were cut over in Phase 3 slice `3-5`. Anchor Event
is no longer a product/domain authority: its durable identity/routes/tables were retired when PR Type Configuration,
Authoring and Discovery became the current model.
Empty historical directory names or generic analytics `eventId` fields do not re-establish that authority.

## Allowed Dependency Direction

| Caller | Allowed dependency | Disallowed dependency |
| --- | --- | --- |
| Backend controller | domain public command/query/contract | repository, Drizzle row or cross-domain internal service |
| Backend domain | its own internals; another domain's curated public surface; explicit infra/provider port | another domain's repository or deep implementation path |
| Web page | domain UI/workflow plus app/shared page infrastructure | raw RPC invocation or reusable business workflow implementation |
| Web domain workflow | domain query/command/model and generic shared infrastructure | page/AppRoot ownership or another domain's internals |
| Web query/command adapter | typed HTTP transport, inferred route contracts and query cache | UI/page assembly |
| Web shared | owner-neutral primitives/infrastructure | domain semantics or domain modules |

Compatibility edges that currently violate this direction must be named and baselined. They are not permission
for new edges of the same shape.

### Commerce Reconciliation Exception

`ride-hailing` owns one deliberately narrow transaction Port for reconciling a
provider observation with local Commerce facts. Its private persistence adapter
is the sole location permitted to coordinate Trade, RideHailing, Bill and the
causally keyed fee-confirmation Job reservation. It acquires Trade then
RideHailing locks; provider I/O occurs before or after that short transaction.
The Port exposes only semantic observation, final-settlement and exact
BillLine-settlement/Job-handoff operations, never a repository, Drizzle row,
executor, raw provider payload, or generic Commerce transaction.

This is a named exception because the terminal-fare invariant spans those
owners. A future coordination path must prove an equivalent shared atomic
invariant and add a narrow semantic Port plus sequence/proof; it must not copy
this adapter or introduce a generic `withCommerceTransaction` convenience API.

## System-Shaping Constraints

- Scale-to-zero backend runtime means delayed work must rely on DB-backed jobs and externally triggerable ticks rather than long-lived in-memory schedulers.
- Job scheduling semantics are backend-infra owned: JobRunner persists bucket
  timing, claim/lease/retry/terminal execution control and declared creation modes.
  `UNTIL_ACKNOWLEDGED` holds a creation reservation independently of execution
  terminality. Notification supplies business timing/creation policy and maps a
  semantic acknowledgment to the private Job key; PR/Web do not own Job
  mechanics.
- Notification owns business template IDs, channel bindings, user-option
  preference/credit semantics, eligibility, rendering and provider outcome
  classification. Job owns the durable Notification Task. Attempt-by-attempt
  diagnostic history belongs to correlated program observability. JobRunner
  consumes only a generic complete/retry/fail/skip disposition; any business
  outcome or uncertainty that changes reconciliation remains durable on the
  semantic domain owner.
- Notification runtime composition consumes PR revalidation facts through the
  narrow `domains/pr/notification-contexts` query entrypoint. It must not
  import a broad PR barrel at module initialization: that can re-enter legacy
  Notification compatibility wiring and capture an uninitialized projection.
  The projection returns PR-owned current facts/anchors, never a derived Job
  `runAt`, Job key or Job policy; Notification derives those private mechanics.
- A current-state revalidation projection is a read boundary, not a hidden
  lifecycle command. In particular, waitlist-alternative eligibility may use
  pure temporal predicates over persisted PR facts but must never invoke
  temporal refresh, promotion, release or status mutation while deciding
  whether a Notification task can be created or dispatched.
- When a PR transition cannot tolerate task loss, PR may use one named,
  owner-internal transaction adapter to call an executor-facing semantic
  Notification port. Notification binds its private Job writer internally; the
  source never receives a writer, Job identity or creation key. The public
  Notification surface stays semantic-only, and this is not permission for a
  generic cross-domain transaction helper. Waitlist promotion and New Partner
  active admission are the current proofs: their cycle identities are PR-owned,
  while Notification uses those facts only to key and revalidate a task. New
  Partner additionally freezes its exact recipient fan-out in that transaction
  because current membership cannot reconstruct the original event audience.
  PR-ready uses the same narrow shape for both manual and temporal READY entry:
  PR owns the row lock, durable ready cycle and roster observation; Notification
  owns source eligibility and private Job policy. Its handoff commits or rolls
  back with the PR transition, never through a post-commit concrete scheduler.
- Effective meeting-point changes use the same named-transaction principle
  without turning it into a universal helper. PR-content, PR-type coordination
  and POI each own the lock/mutation/before-after observation appropriate to
  their source, then call Notification's narrow transaction-bound handoff.
  The immutable source event facts are one operation UUID, visible description
  and timestamp; a multi-PR source operation may share its UUID/correlation,
  but every PR remains a distinct causation/fan-out. The PR effective-point
  rule consumes POI and PR-type facts through their explicit query entrypoints,
  never aggregate barrels that also export mutation use cases: initialization
  order must not decide semantic resolution.
- PR capacity and queue ordering use a separate owner-internal admission
  adapter. It exposes semantic direct-admit, waitlist-entry, promotion and
  creator-publish operations rather than an executor or reusable callback; it
  locks the PR then the selected active entrant under a bounded serializable
  retry. It owns only local slot/capacity/reliability/status mutation. Provider
  calls, Job/Notification policy, expansion and unrelated
  policy/location facts stay outside that short boundary.
- PR-message attention invalidation follows the same source-boundary rule. A
  participant removal, terminal transition, message tombstone or root deletion
  locks the PR then the affected active roster and asks Notification to release
  semantic recipient/aggregate windows within that transaction. Notification,
  not PR/Admin/Controller, maps those facts to private Job keys. No concrete
  PR-message handler or historical-row drain remains.
- Opportunity/wave/inbox persistence and every legacy per-kind Notification
  handler/decoder are forward-retired. `notification_deliveries` alone remains
  inert transitional audit history pending a professional observability and
  data-retention decision; no dependency may use it for execution or business
  authority.
- The monorepo shares backend exports with the frontend at compile time, so some contract drift is intentionally caught by types even though runtime interaction still happens over HTTP.
- Data evolution is forward-only, which constrains how backend state contracts may change over time.
- WeChat and browser-environment differences materially shape which user flows are available and how the units coordinate them.
