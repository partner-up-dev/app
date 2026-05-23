# BI Domain Contracts

This document owns the BI domain's cross-unit technical contract. It explains what BI reads, which facts are authoritative, and how user behavior events participate in projections.

## BI Source Families

BI is built from three source families:

- Business fact data: authoritative product tables and read models.
- User behavior events: registry-governed `user_telemetry_*` raw events plus fact projections.
- Program behavior signals: software observability and program-internal behavior signals.

BI must select the source family by the question being answered.

## Business Fact Authority

Lifecycle metrics for PRs are business facts, not user behavior events.

- PR formed / closed / expired metrics query PR business state, especially current PR table statuses.
- Cohorts use PR `created_at` and PR time-window `endAt` as business date dimensions.
- User telemetry can explain how users reached a command, but it is not the source of truth for whether a PR is currently closed, expired, full, formed, or active.

Per-user PR counts should use business fact data when the question is ownership or participation state. User behavior events may support funnel or intent analysis, not durable count truth.

## User Behavior BI

User behavior events answer questions about observed behavior chains:

- retention by UV over 3 / 5 / 7 days or arbitrary windows;
- PR create / join funnels from observation to intent to submission to backend-confirmed result;
- anchor-event transition paths, for example whether users naturally move from self-study or running into badminton or commuting;
- view-other-Anchor-Events conversion;
- official-account follow nudge click behavior.

User behavior BI reads fact projections. It should not repeatedly reconstruct route, identity, experiment, or consent context from raw events at dashboard query time.

## Projection Boundary

Raw `user_telemetry_events` is the ledger. BI uses fact-specific projections such as:

- PR create / join funnel event facts;
- retention activity facts;
- Anchor Event transition facts;
- view-other-Anchor-Events conversion facts;
- Anchor Event funnel facts;
- official-account follow nudge facts.

Do not introduce a broad dashboard-facing `event_enriched` projection as the primary BI API. Shared helper projections may be introduced later only when they are narrow, for example identity-context or route-context helpers, and when repeated fact-local reconstruction becomes a proven maintenance cost.

Current implementation note: production user-behavior BI readers use PostgreSQL fact views with Drizzle schemas. Fact event-name references are verified against the TypeScript Event Registry. PR lifecycle status is projected from business fact tables as both a `created_at` cohort and a PR time-window `endAt` cohort; close / expired readings should use the `endAt` cohort when the question is about completed activity windows.

BI query windows over user telemetry are instant ranges. API query parameters must carry timezone information, SQL filters must compare against `timestamptz`, and product-local date keys must be derived explicitly at projection time. Raw SQL projections must receive telemetry instants as boundary-decoded `Date` values rather than parsing timestamp strings inside BI code. BI code must not silently reinterpret telemetry instants as server-local `timestamp without time zone` values.

## Context Completeness

BI must not guess missing context.

- Unknown route, identity, experiment, consent, or environment context is surfaced as `context_unknown` or `context_incomplete`.
- A metric may choose to exclude incomplete context, but the exclusion must be visible in the query or response contract.

## Event Dictionary

BI event dictionaries are derived from the unique Event Registry.

- Event dictionaries and fact event-name references are projected from or verified against the unique Event Registry, not maintained as independent catalogs.
- Event family, owner, version, schema, and BI usage must match the registry.
- `event_kind` is not a BI dictionary dimension; dashboards should select explicit event names / families for each metric.
- Event semantic changes require an event version bump.

## Dashboard Contract

`/admin/analytics` is the BI dashboard route and requires the `analytics` role.

`/bi?code=...` remains the lightweight BI entry route for the seeded analytics user:

- it uses the query `code` as the analytics seed user's pin;
- it calls the admin login endpoint;
- it redirects to `/admin/analytics` on success;
- it scrubs the code from the route after successful login.

Analytics APIs require the `analytics` role. Service-owned admin APIs require `service`; analytics-only sessions can see analytics surfaces without seeing service-owned admin routes.

## Current Required BI Questions

The BI domain must support:

- 3 / 5 / 7 day and arbitrary-window retention by UV;
- per-user PR count;
- PR formed / closed / expired metrics from business fact data;
- PR create and join funnels;
- Anchor Event transition analysis;
- view-other-Anchor-Events conversion;
- official-account follow nudge click-rate behavior.

The legacy Anchor Event funnel dashboard may keep compatibility-facing response fields while its internals use the governed telemetry/projection model.

The old cold-start analytics reader is retired. Production BI readers must use `user_telemetry_*` projections and business fact tables.
