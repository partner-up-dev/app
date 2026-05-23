# Analytics And User Telemetry Contracts

This document owns the cross-unit technical contract for user-behavior telemetry. Runtime procedures and monitoring belong in `docs/40-deployment/observability.md`; volatile implementation notes belong in task packets.

## Signal Families

PartnerUp separates three signal families:

- Business fact data: authoritative product state in domain tables, for example current PR status, partner slots, users, Anchor Events, and POIs.
- User behavior events: user-caused behavior streams captured in `user_telemetry_*`.
- Program behavior signals: software observability and program-internal behavior, for example logs, traces, metrics, operation logs, jobs, and future internal event collection.

BI may combine all three families. User behavior telemetry must not become the source of truth for business facts that already live in authoritative tables.

## User Behavior Collection Principles

User-behavior telemetry is a ledger, not a report.

- Raw events are append-only and forward-only.
- BI readers should consume fact projections, not ad-hoc raw payloads or broad dashboard-facing enriched-event objects.
- Historical events are not rewritten to repair BI; projection logic and data migrations own interpretation changes.

User-behavior telemetry collects user-caused behavior chains only.

- Frontend may report what the user observed, clicked, intended, or submitted.
- Backend may report the confirmed result of a user command, for example `pr.created`, `pr.joined`, `pr.waitlisted`, or `pr.closed`.
- Automatic system facts such as `pr.expired` do not enter user telemetry. They belong to business fact data or program behavior collection.

Context is expressed through the event stream.

- Ordinary behavior events stay small.
- Route, auth session, consent, experiment, app version, commit hash, device, and other context are represented by context events.
- Projection reconstructs context by `journey_id + occurred_at` plus deterministic projection tie-break rules.
- Projection tie-breakers are query stability rules, not business-order truth.

Identity is not copied to every behavior event.

- Ordinary behavior events must not carry anonymous id or authenticated user hash in metadata, attributes, or payload.
- Current identity context is represented by `auth.session.created`.
- BI identity enrichment looks backward to the nearest prior `auth.session.created` event.
- Do not introduce `identity.changed` without a concrete BI query that cannot be answered from session-created context.

Do not capture UI snapshots.

- Do not capture complete page state, component trees, or store snapshots.
- Each event owns only the facts needed to describe that event.

Event semantics are governed.

- Events must be registered in one unique Event Registry before they are accepted.
- Same-name semantic changes require an `event_version` bump.
- Frontend and backend must not add unowned, unversioned event names directly at call sites.

## Time Instant Contract

Telemetry timestamps represent real instants, not local wall-clock labels.

- API inputs and outputs for telemetry instants must use ISO-8601 date-time strings with timezone information, either `Z` or an explicit offset.
- Frontend telemetry, backend request-scoped telemetry, ingest DTOs, SQL filters, storage, and BI projections must preserve timezone semantics end to end.
- Postgres storage for telemetry instants uses `timestamptz`; Drizzle schema uses `timestamp(..., { withTimezone: true })`.
- SQL filters against telemetry instant columns cast date-time parameters as `::timestamptz`.
- The backend DB boundary decodes `timestamptz` values into JavaScript `Date` before domain or projection code sees them, including raw SQL projection paths that bypass Drizzle column decoders.
- Do not store cross-system telemetry instants as `timestamp without time zone` or accept no-offset datetime strings.
- Exceptions are limited to explicit local calendar or wall-clock fields, such as a product-local date key or display-only local time. Those fields must state their local-time semantics in their contract.

## Raw User Event Contract

`POST /api/telemetry/user/events` ingests batched user telemetry events. Accepted events use this conceptual shape:

```ts
type RawUserEvent = {
  event_id: string
  event_name: string
  event_version: number
  journey_id: string
  occurred_at: string
  trace_id?: string
  event_family?: string
  attributes?: Record<string, string | number | boolean | null>
  payload?: Record<string, unknown>
}
```

Accepted events require:

- `event_id`: global idempotency key.
- `event_name`: registered, versioned event name.
- `event_version`: registered event semantic version.
- `journey_id`: application activity session id.
- `occurred_at`: event-source instant with timezone information.

Accepted events may carry:

- `trace_id`: join key to program behavior collection / observability.
- `event_family`: registry-owned stable BI aggregation family.
- `attributes`: low-cardinality analysis dimensions.
- `payload`: event-owned business facts.

Accepted events must not carry:

- `seq`
- `correlation_id`
- `cause_event_id`
- `source`
- `authority`
- anonymous id
- authenticated user hash

Ingest adds operational fields such as `received_at` and validation failure details. Frontend events do not own those fields.

## Journey Contract

`journey_id` represents one single-tab application activity session:

- the frontend generates the journey id as a UUID;
- the active journey is persisted in `sessionStorage`, so it is scoped to one browser tab and browser session;
- the journey is created lazily on the first user telemetry event that needs it;
- the journey is reused while the current tab remains active within the idle timeout;
- the current idle timeout is 30 minutes; after that, the next event creates a new journey;
- a new browser tab creates an independent journey;
- hard reload in the same tab may keep the same journey when `sessionStorage` survives and the idle timeout has not elapsed;
- login, logout, account binding, or auth refresh does not restart the journey by itself.

User command requests carry the active journey through `x-journey-id`.

- The backend parses `x-journey-id` at the Hono boundary.
- Controllers may read the parsed request context.
- Use-cases/services receive typed journey context when they need to emit backend-confirmed user-result events.
- Domain services must not import Hono types.
- If `x-journey-id` is missing or invalid, the backend does not generate an orphan user journey. The business request may still proceed, but backend-confirmed user-result telemetry is skipped.

Events that do not belong to a user journey must not be accepted into user telemetry.

## Event Registry Contract

The Event Registry is the unique source of truth for event acceptance and event dictionary projection. It owns:

- event name;
- event family;
- version;
- owner;
- trigger condition;
- forbidden condition;
- attributes schema;
- payload schema;
- PII / consent classification;
- BI usage.

BI event dictionaries and fact event-name references are projections from or checks against this registry, not a second hand-maintained registry.

`event_kind` is intentionally not part of the accepted envelope, storage schema, or registry contract. Query semantics must come from explicit `event_name` / `event_family` selection and BI usage metadata, not from a broad role bucket.

## Context Events

The first supported context events are:

- `journey.started`
- `journey.ended`
- `route.entered`
- `route.left`
- `auth.session.created`
- `consent.changed`
- `experiment.assigned`
- `visibility.changed`
- `network.changed`

`journey.started` carries the initial route, referrer, and entry attribution known at creation time. It may later be extended with stable runtime environment for the journey, such as app version, frontend commit hash, device/browser/OS, locale, and viewport class.

If these stable environment facts materially change, start a new journey instead of mutating the journey meaning in place.

`journey.ended` is a registered context event, but it is not required for the current collection contract. Timeout-based new journey creation is sufficient until a concrete BI query needs reliable hard-end semantics.

## Event Naming

`event_name` describes a stable product affordance or user behavior fact. Placement can be part of the name when it changes product meaning.

Examples:

```txt
pr_page.header.join_clicked
pr_card.list.join_clicked
```

These may share:

```txt
event_family = "pr.join_intent"
```

Do not encode colors, CSS classes, temporary copy, or A/B styling variations into `event_name`. Use attributes for low-cardinality variants when they matter to BI.

Successful backend-confirmed user-result event names use direct past tense:

- `pr.created`
- `pr.joined`
- `pr.waitlisted`
- `pr.closed`

## Attributes And Payload

Use `attributes` for low-cardinality dimensions frequently used for filter/group-by, for example:

- surface
- section
- entrypoint
- action
- variant
- entry_type

Use `payload` for event-owned business facts and higher-cardinality values, for example:

- `pr_id`
- `anchor_event_type`
- `target_anchor_event_type`
- `failure_reason`

Do not hide stable BI dimensions in arbitrary payload fields. Do not promote high-cardinality values into attributes without explicit analysis value and indexing intent.

## Validation And Rejection

Ingest must validate:

- registered event name and version;
- required envelope fields;
- attributes schema;
- payload schema;
- mandatory `journey_id`.

Invalid, unknown, or schema-incompatible events enter `user_telemetry_rejected_events` with validation details instead of silently polluting the raw ledger.

## Storage Direction

The target `user_telemetry_*` family contains:

- `user_telemetry_journeys`
- `user_telemetry_events`
- `user_telemetry_rejected_events`

`user_telemetry_segments` is retired from the target schema. Prior segment meaning should be represented by context events or projections.

Legacy `user_telemetry_*_v1` tables are migration-only staging surfaces. After forward migration and verification, they should be dropped by a forward-only cleanup migration rather than preserved as long-lived schema.

## Historical Data Migration

The current v1 telemetry data is migrated forward:

- old journey rows become new journey rows;
- old identity fields become reconstructed `auth.session.created` context events where possible;
- old segment rows become context events only when the mapping is explicit;
- old event rows become raw ledger events using the registry mapping;
- unmapped rows are quarantined or marked with explicit migration metadata;
- `occurred_at` remains event time and `received_at` remains ingest time where available.
- legacy staging tables are not part of the target schema after backfill cleanup.

Do not synthesize a business `seq` during migration.
