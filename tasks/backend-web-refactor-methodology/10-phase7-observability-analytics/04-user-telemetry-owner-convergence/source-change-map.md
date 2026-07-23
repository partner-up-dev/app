# `7-3` Source Change Map

Frozen against the locally complete `7-2` worktree on 2026-07-23.

## Backend Owner

| Surface | Intended mutation |
| --- | --- |
| `src/infra/telemetry/user-event-registry.ts` | preserve literal name/version/schema types; derive active canonical event input; resolve the active version for new emission; tighten the four Backend PR event payloads |
| `src/contracts.ts` | expose only the type projection through the existing public contracts export |
| `src/infra/telemetry/user-ingest.service.ts` | return mutually exclusive accepted/rejected/idempotent counts whose sum equals the input batch |
| `src/infra/telemetry/request-event-recorder.ts` | consume active Registry input and contain every telemetry-only failure in a typed passive outcome |
| `src/infra/telemetry/index.ts` | publish the narrowed owner API and outcome types |
| telemetry unit/scenario tests | prove Registry exhaustiveness, strict payloads, ledger rejection/idempotency and business-success isolation |

The five existing PR controller call sites remain unchanged. They already run
after command commit and before the HTTP response; containment belongs once in
the recorder, not in every caller.

## Web Owner

| Surface | Intended mutation |
| --- | --- |
| `shared/telemetry/events.ts` | consume the Backend type-only canonical contract; remove the alias catalog |
| `shared/telemetry/collector.ts` | own route/referrer/SPM sanitization, journey/context synthesis and canonical wire records |
| `shared/telemetry/queue.ts` | own the bounded FIFO, batch take and bounded front requeue |
| `shared/telemetry/transport.ts` | own RPC, timers, single-flight lifecycle and terminal/retry outcome classification |
| `shared/telemetry/track.ts` | remain a thin canonical facade plus existing development inspection hook |
| `shared/telemetry/auth-session.ts` | use one narrow typed context-event entry instead of a public raw escape hatch |
| 20 existing callers | mechanically replace 31 used snake-case aliases with canonical dotted names without changing payloads |
| focused telemetry tests | freeze journey/context order, sanitization, queue limits, retry classes, lifecycle hooks and facade behavior |

## Deliberately Untouched

- consent/collection activation policy;
- journey expiry and session-storage ownership;
- business command outcomes;
- historical Registry contracts and deprecated versions;
- event meaning or BI formula;
- durable telemetry/outbox semantics; and
- program-observability sinks.
