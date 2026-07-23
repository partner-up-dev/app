# `6-3.1f-05` Verification Log

## Result

The admin POI PUT path now delegates to a POI-owned, named serializable
transaction. It atomically persists the POI mutation and generic
`pr.meeting-point-updated` handoffs; it neither creates concrete legacy
meeting-point Jobs nor Opportunity/Delivery rows.

## Focused Proof

- A POI-only fallback PR receives exactly one generic task with the immutable
  description, per-PR causation and POI-operation correlation; explicit and
  type-level fallbacks remain suppressed.
- An address/gallery-only mutation persists but creates no task.
- A rename locks the old/new location union. An old-name PR falling to no
  point remains suppressed; an already-new-name fallback PR receives the new
  POI event.
- A direct port whose second handoff throws restores the POI's name/point and
  removes the first generic Job as well as all legacy rows.
- The new POI public use case initially exposed a real barrel cycle:
  `meeting-point.service -> poi barrel -> POI use case -> PR transaction
  adapter -> meeting-point.service`. The service now imports POI's
  low-dependency query surface directly, preventing an initialization-time
  `undefined` resolver capture. The full scenario suite exercises the affected
  PR detail path.

## Commands And Results

| Command | Result |
| --- | --- |
| focused `backend-scenario` for `pr-waitlist` and `poi-meeting-point-notification` | passed: 2 files / 14 tests |
| `pnpm test:scenario:backend` | passed: 34 files / 116 tests |
| `pnpm test:unit:backend` | passed: 103 files / 468 tests |
| `pnpm check:type:backend` | passed |
| `pnpm check:lint:backend` | passed |
| `pnpm check:build:backend` | passed |

## Deferred To Cross-Source Consolidation

Only `06` may remove the now-unused concrete creation APIs. It must retain
the legacy handler, decoder and cancellation protocol until a separate
pending-row drain decision permits their removal.
