# Phase 6 Source-Backed Implementation Rehearsal

Date: 2026-07-22

> Rebased on 2026-07-23. This rehearsal remains useful for source facts, but
> its fee-confirmation ambiguity model, legacy inventory gates, and stdout/SLS
> observability plan are superseded by the current root packet and slice
> decisions.

## Scope And Result

This rehearsal walked the ratified design through current Backend/Web source,
schema, migration, test and deployment seams. It changed no application source,
schema, database, provider or runtime. The result is a revised implementation
order and a set of hard preconditions that must be satisfied before each
external effect is cut over.

`6-1` remains the first executable slice and still requires Sir's explicit
start. Later slices are not authorized by this document.

## Source Facts That Changed The Plan

| Current fact | Implementation consequence |
| --- | --- |
| Job completion updates match only `jobs.id`; a lease-expired old handler can overwrite a newer claim. | Add a per-claim token and completion CAS before structured handlers or retry behavior are changed. |
| `scheduleOnce` uses a global DB handle, active-only `dedupe_key`, and returns no existing Job ID on conflict. | Add a transaction-aware persistence seam plus separate terminal-safe causation and HELD-reservation uniqueness; do not overload legacy dedupe. |
| `deletePendingJobsByDedupe` physically deletes pending/retry Jobs. | Introduce durable generic `CANCELED`; ACK/invalidation releases reservation and cancels eligible execution without erasing control history. |
| Existing handlers are `Promise<void>`; PR-message records provider failure and returns, so Job marks it `SUCCEEDED`. | Characterize the bug, bridge old handlers explicitly, and use structured dispositions for every migrated definition. |
| There is no Job-attempt telemetry sink, metrics SDK or tracing SDK. FC captures stdout in SLS. | Do not invent a console sink. Keep DB execution truth and defer attempt telemetry to real observability infrastructure. |
| Current WeChat credit columns are non-null integers. | Model `LIMITED / UNLIMITED` at the channel-neutral domain boundary, but map current WeChat rows only to `LIMITED`; do not perform a speculative nullable-column migration. |
| Current WeChat adapter collapses all non-`43101` failures into `TRANSPORT_ERROR` and has no idempotency key. | Do not classify network/HTTP/parse uncertainty as retry-safe. A retryable result requires provider evidence that the effect was not applied. |
| WAITLIST_PROMOTED does full preparation before scheduling and again in the handler. | Request-time work becomes minimal policy/input validation; dispatch-time reload is authoritative. The exemplar proves the owner surface, not reliable handoff. |
| PR message is inserted before inbox/wave/opportunity/Job writes, and Web advances a marker when query data arrives rather than after a visible render. | Commit message plus HELD/high-water atomically; ACK only after mounted route, render commit and visible document; retry the same cursor after ACK failure. |
| Bill settlement CAS, settlement consequence and synchronous fee confirmation are separate commits/calls. | Replace the chain with one named RideHailing settlement-handoff transaction before adding the fee-confirmation handler. |
| Official fee-confirm docs require `order_id` and make both allowance fields optional; they do not promise lost-response idempotency. | Send `order_id` only. Sir accepts duplicate effect on lost response, so use one generic Job with ordinary retry and no owner ambiguity state/operator path. |
| Runtime has FC timer/request-tail wake-ups and protected DB backlog diagnostics, but no governed observability backend. | Keep bounded DB diagnostics, remove Job/CaoCao console output, retain `notification_deliveries`, and defer real O11y beyond Phase 6. |

Primary evidence anchors:

- [Job entity](../../../apps/backend/src/entities/job.ts),
  [JobRunner](../../../apps/backend/src/infra/jobs/job-runner.ts), and
  [composition root](../../../apps/backend/src/index.ts);
- [waitlist-promoted scheduler](../../../apps/backend/src/infra/notifications/wechat-waitlist-promoted.ts),
  [channel adapter](../../../apps/backend/src/infra/notifications/channels/notification-channel-adapter.ts),
  [current option entity](../../../apps/backend/src/entities/user-notification-opt.ts),
  [PR message creation](../../../apps/backend/src/domains/pr/message/create-pr-message.ts),
  and [Web thread UI](../../../apps/web/src/domains/pr/ui/sections/PRMessageThread.vue);
- [payment execution](../../../apps/backend/src/domains/payment/use-cases/payment-execution.ts),
  [settlement consequence](../../../apps/backend/src/domains/payment/use-cases/payment-settlement-consequence.ts),
  [current synchronous fee call](../../../apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts),
  and [provider OpenAPI](../../../packages/fake-caocao-server/openapi/provider/caocao-provider-minimal.openapi.yaml);
- [maintenance runner](../../../apps/backend/src/infra/maintenance/maintenance-runner.ts),
  [internal tick controller](../../../apps/backend/src/controllers/internal-maintenance.controller.ts),
  [runtime truth](../../../docs/40-deployment/backend-runtime.md), and
  [observability truth](../../../docs/40-deployment/observability.md).

## Resolved Implementation Choices

1. Job adds generic terminal `SKIPPED` and `CANCELED` states. `SKIPPED` is a
   handler disposition; `CANCELED` means control was stopped before another
   invocation. Neither means provider delivery.
2. Every claim receives a unique lease token. Success/retry/failure/skip writes
   compare Job ID, `RUNNING`, lease owner and lease token; zero updated rows mean
   stale completion without changing newer execution state.
3. Creation modes are distinct:
   - ordinary/legacy `ONCE` may retain active dedupe compatibility;
   - `ONCE_PER_CAUSE` is terminal-safe for causal handoff;
   - `UNTIL_ACKNOWLEDGED` retains one HELD reservation and monotonic high-water.
4. A pure `JobRepository` may accept the existing `RepositoryExecutor`; public
   business APIs do not accept Drizzle transactions. Only named integration
   adapters use the transaction-bound Job writer.
5. PR-message creation and reservation coalescing are one short transaction.
   This guarantees that an externally visible cursor is already represented in
   high-water. If this invariant cannot be achieved, implementation stops; the
   fallback would require a durable acknowledged-through watermark and
   key-scoped serialization, which is deliberately not added speculatively.
6. WAITLIST_PROMOTED remains the `6-2` exemplar because it is the smallest
   owner-surface cutover. Its current post-transition best-effort handoff is
   named debt and is closed with the family handoff work in `6-3`.
7. Notification provider uncertainty is terminal/non-retrying unless the
   channel adapter can prove non-application and safe repetition. No generic
   Notification Intent/Delivery state is added to compensate.
8. Fee confirmation is the typed Job itself. Its named transaction uses the
   established Trade -> Ride lock order, settles the exact payment tuple,
   recomputes all charges paid, and inserts one causal `ONCE_PER_CAUSE` Job.

## Exact Cross-Slice Execution Order

```text
6-1A characterize + make runner injectable
  -> 6-1B typed definitions + legacy adapter
  -> 6-1C additive schema + JobRepository/transaction-bound writer
  -> 6-1D creation modes + ACK races
  -> 6-1E lease fencing + structured dispositions; no console telemetry sink
  -> 6-1F built-in compatibility registration and focused gates

6-2A WAITLIST_PROMOTED characterization
  -> 6-2B Notification public vocabulary/policy/binding/credit ADT
  -> 6-2C generic handler + curated PR query adapter
  -> 6-2D exemplar caller/registration cutover; old handler retained

6-3.1 one-shot families, lowest risk first, with named handoff class
  -> 6-3.2 atomic PR-message reservation + visible-render ACK
  -> 6-3.3 forward-cut-off opportunity/wave/inbox/API/decoder retirement

6-4A official contract/risk gate (complete)
  -> 6-4B exact settlement + causal Job transaction
  -> 6-4C typed order_id-only provider Job handler
  -> 6-4D verification and forward cut-over

6-5.1a source ledger/local contract preflight (complete)
  -> 6-5.1b generic wake-up/DB diagnostic + console cleanup
  -> 6-5.1c post-6-4 recovery matrix
  -> 6-5.2 real O11y/delivery retirement deferred beyond Phase 6
  -> 6-5.3 remaining legacy retirement and Phase review
```

## First Authorized Batch When `6-1` Starts

The first mutation batch is deliberately characterization and seams, not a
schema migration:

1. inventory source registrations and, with operator access before deployment,
   live pending/retry/running Job type and payload shapes;
2. add focused JobRunner tests for timing/missed/retry/lease-expiry/unknown
   handler/legacy active dedupe, including the current PR-message return bug;
3. extract an injectable runner factory with clock, store and observer ports
   while preserving the current singleton/composition root;
4. add a failing stale-completion scenario that demonstrates why lease-token
   CAS is required;
5. stop before schema work if an existing row cannot be assigned a named
   decoder/drain policy.

This batch has the cheapest review surface and creates the test seam needed by
all later mutation batches.

## Cross-Slice Stop Conditions

- A visible PR message can commit without its high-water coalesce in the same
  transaction.
- A completion write can succeed without proving ownership of the current
  claim token.
- A provider retry path cannot prove non-application and repetition safety.
- A cross-owner invariant requires a generic transaction executor in a public
  domain API.
- Existing Job rows, settled RideHailing orders or legacy Notification rows
  cannot be inventoried/classified without guessing.
- Deployed SLS query, retention, alerting or safe-probe authority is absent when
  `notification_deliveries` retirement is proposed.
