# Registry Type Safety Purpose

## Working Claim

Registry type safety is not an end in itself. It serves the boundary between event semantics and the code that produces, stores, projects, and consumes user telemetry events.

The registry should prevent semantic drift in places where TypeScript can reasonably help, while still relying on runtime validation at network, database, migration, and analytics boundaries.

## What It Should Serve

### 1. Event Production Correctness

Event producers should not be able to casually emit unregistered event names or wrong event versions.

Type safety should make the normal path look like:

- choose an event from the registry;
- provide attributes and payload that match that event's schema;
- get compile-time help before runtime validation.

This is most valuable at frontend telemetry call sites and backend user-result event emitters.

### 2. Registry-Governed Ingest

The ingest boundary still needs runtime validation because events arrive over HTTP and persisted historical data may predate the current TypeScript build.

Type safety should help the ingest implementation avoid mismatching registry fields, but it cannot replace Zod/runtime validation.

### 3. BI Event Selection

BI readers should not pass arbitrary string arrays such as `["pr.joined"]` without registry awareness.

Type safety should let BI code select event sets by registered names, families, or BI usage tags derived from the registry.

This helps prevent misspelled event names, stale names, and accidental inclusion of deprecated events.

### 4. Projection Contract Drift

Registry-derived dictionary fields such as event family, owner, BI usage, and deprecated status should not be retyped or hand-maintained in each projection.

Type safety should support a single generated / projected event dictionary contract that can be compared against DB-level projection output.

### 5. Refactor Safety

Renaming, deprecating, or versioning an event should force compile-time failures in producers and BI selectors that still reference the old event.

This is the highest-leverage reason to preserve event-name literal types.

## What It Should Not Pretend To Solve

- It cannot guarantee the shape of historical rows already stored in Postgres.
- It cannot make raw `db.execute<T>` runtime-safe.
- It cannot replace runtime validation at API boundaries.
- It should not require every low-value legacy-compatible event to receive a perfect strict schema before the BI-critical paths are stable.
- It should not turn the registry into a huge generic type system that is harder to maintain than the events themselves.

## Practical Standard

The first useful standard is:

- registered event names and versions are literal types;
- event emission helpers require a registered event key;
- BI selectors derive event-name sets from registry metadata instead of free-form strings;
- events used by production BI projections have strict attributes / payload schemas;
- loose schemas are allowed only as an explicit migration or legacy-compatible state.

## Open Design Question

Should strict schemas be required immediately for every registered event, or should the system enforce strict schemas first for BI-critical events and mark the rest as legacy-compatible / loose?
