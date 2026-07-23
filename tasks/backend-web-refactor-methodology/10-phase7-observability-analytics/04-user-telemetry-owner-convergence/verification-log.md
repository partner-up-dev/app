# `7-3` Verification Log

Date: 2026-07-23

## Structural Proof

- 43 production Web `trackEvent(...)` calls use canonical dotted names.
- Searches return zero references to:
  - `CANONICAL_EVENT_NAMES`;
  - `resolveCanonicalUserTelemetryEventName`;
  - `trackRawUserTelemetryEvent`; and
  - snake-case event aliases at `trackEvent(...)` call sites.
- `events.ts` consumes only the Backend public type projection and derives
  frontend behavior events by Registry owner.
- The Registry rejects a duplicate active contract name at initialization.
- The recorder, not five PR controller call sites, contains telemetry failure.

## Executed Proof

| Gate | Result |
| --- | --- |
| Backend telemetry unit | 3 files / 15 tests passed |
| Web telemetry unit | 5 files / 18 tests passed |
| Real-Postgres telemetry scenarios | 1 file / 2 scenarios passed |
| Backend type | `pnpm check:type:backend` passed |
| Web type | `pnpm check:type:web` passed |
| Patch hygiene | scoped `git diff --check` passed |

The real-Postgres scenarios prove first acceptance, duplicate idempotency,
deterministic rejection ledgering and a temporary telemetry INSERT failure
after PR commit. The failing telemetry write yields no `pr.created` event for
that journey while the HTTP request succeeds and exactly one returned PR row
exists for the authenticated creator.

## Deliberate Compatibility

All current active events are version 1. Web therefore emits one current
version literal without maintaining a name-to-version table. Before a
same-name v2 is introduced, the call protocol must choose an explicit
per-event version or generated/runtime descriptor; D7-3-08 prevents silently
adding another Web version catalog.

Several legacy-compatible Registry payload schemas remain intentionally broad.
The broad acceptance schema is now the only owner; Web no longer preserves a
second handwritten schema map. Tightening a family requires evidence from its
current call sites and a version decision when semantics change.
