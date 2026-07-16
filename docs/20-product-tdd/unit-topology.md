# Unit Topology

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

These are subsystem clusters inside the two units, not independent top-level units.

## System-Shaping Constraints

- Scale-to-zero backend runtime means delayed work must rely on DB-backed jobs and externally triggerable ticks rather than long-lived in-memory schedulers.
- Job scheduling semantics are backend-infra owned: JobRunner persists bucket timing attributes on each job record and decides due/missed status centrally; notification modules only supply per-type timing policy.
- The monorepo shares backend exports with the frontend at compile time, so some contract drift is intentionally caught by types even though runtime interaction still happens over HTTP.
- Data evolution is forward-only, which constrains how backend state contracts may change over time.
- WeChat and browser-environment differences materially shape which user flows are available and how the units coordinate them.
