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
- background jobs, outbox processing, notification delivery, analytics persistence, and operation logs
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
- ecommerce: `merchandising`, `trade`, `fulfillment`, `bill`, `payment`
- identity and user: `auth`, `user`
- admin and operations: admin management, POI/config/meta
- cross-cutting infra: events, jobs, notifications, user telemetry, analytics, operation log

Frontend clusters:

- app/process layer: app bootstrap, router, auth bootstrap, WeChat processes
- domain layer: `pr`, `share`, `user`, `admin`, `support`, `landing`
- shared layer: generic UI, auth/session storage, telemetry runtime, analytics, API helpers
- page layer: route entrypoints
- compatibility layer: top-level `lib`, `router` and `stores`; keep existing bridges narrow and add no new owners there

These are subsystem clusters inside the two units, not independent top-level units.

## PR Domain Owner Map

| Capability | Current owner / state | Target dependency direction |
| --- | --- | --- |
| PR Lifecycle and canonical PR facts | `domains/pr` is the canonical surface/read owner; lifecycle implementation still delegates extensively to `domains/pr-core` | callers → curated `domains/pr` command/query/contract; compatibility `pr-core` → canonical owner only after cutover |
| PR Type Configuration | Postgres entity/repository own current persistence; `admin-pr-type-config` owns current operator composition while Authoring/Discovery/Lifecycle consume configuration directly | consumers → neutral PR Type Configuration queries/commands → internal persistence; Admin remains an adapter |
| PR Authoring | `domains/pr-authoring` plus ordinary PR creation commands | route/controller → Authoring public options/submission surface → ordinary PR command |
| PR Discovery | `domains/pr-discovery` for catalog, view resolution, directory and recommendation reads | route/controller → Discovery query surface → canonical PR/Type/POI reads |
| POI | `domains/poi` and POI persistence | Authoring/Discovery consume POI-owned query/contracts rather than duplicating location authority |
| Feedback Questionnaire | `domains/feedback-questionnaire` and feedback persistence | PR integration consumes feedback command/query/contracts; questionnaire owner remains independent |

`domains/pr-core` is a named compatibility window, not a second PR authority. Existing imports are migration
evidence; no new caller should depend on it. Anchor Event is no longer a product/domain authority: its durable
identity/routes/tables were retired when PR Type Configuration, Authoring and Discovery became the current model.
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

## System-Shaping Constraints

- Scale-to-zero backend runtime means delayed work must rely on DB-backed jobs and externally triggerable ticks rather than long-lived in-memory schedulers.
- Job scheduling semantics are backend-infra owned: JobRunner persists bucket timing attributes on each job record and decides due/missed status centrally; notification modules only supply per-type timing policy.
- The monorepo shares backend exports with the frontend at compile time, so some contract drift is intentionally caught by types even though runtime interaction still happens over HTTP.
- Data evolution is forward-only, which constrains how backend state contracts may change over time.
- WeChat and browser-environment differences materially shape which user flows are available and how the units coordinate them.
