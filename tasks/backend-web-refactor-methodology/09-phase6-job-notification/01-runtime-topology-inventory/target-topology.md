# `6-0` Target Dependency Topology Proposal

> Historical topology proposal. Its fee-confirmation owner-state and immediate
> attempt-O11y statements are superseded by the 2026-07-23 executable `6-4`
> decision and no-console/future-O11y plan.

## Ratified Design Direction

The `6-0` direction below is source-backed. Its detailed Notification public
API and task model were ratified in D6-N-01 and are refined by D6-J-02 in
[`../02-notification-dispatch-model-discussion/`](../02-notification-dispatch-model-discussion/).
It must not be read as source-mutation authorization.

**D6-N-01 / D6-J-02 / D6-F-01 revision:** the initial `6-0` proposal assumed an
owner-specific Notification Intent beside Job. The later review supersedes that
part: Job is the durable Notification Task; pure handler-attempt history moves
to observability; PR message-attention mechanics become a held/released Job
creation reservation; the opportunity/delivery/wave/inbox tables are ratified
retirement/consolidation targets. RideHailing owns fee-confirmation business
state and uncertainty while Job remains generic execution control.

1. **Do not resurrect a generic global outbox.** The current source has none,
   and a generic event bus would add an owner and broad coupling without a
   proven need.
2. **Use a typed Job as durable work while preserving semantic owner state.**
   A Notification Job owns the scheduled task identity; Phase 6 adds no
   Notification opportunity/intent record. RideHailing fee-confirmation state
   belongs on the RideHailing Order because it is provider-effect business
   truth; its Job remains only the task for one owner generation.
3. **JobRunner remains execution infrastructure, not business-delivery
   authority.** It owns persisted work mechanics, while the producer owns
   payload semantics, eligibility, idempotency and final business outcome.
4. **Notification gets a curated business-template surface.** Other domains
   ask it to schedule a typed business notification; they do not import a
   WeChat scheduler, provider template ID, channel adapter, repository, or
   internal service.
5. **External effects are at-least-once until an idempotency proof says more.**
   A retry may follow a lease expiry or lost provider response. No handler may
   assume a JobRunner retry proves exactly-once delivery.

## Job / JobRunner Target Tree

1. A business owner or infrastructure owner creates a **named typed work
   request** with validated/versioned payload, dedupe/idempotency rule, timing
   policy, retry classification, and final-outcome owner.
2. For ordinary best-effort work, that owner calls a narrow JobRunner scheduling
   port.
3. When the work must survive the same transaction as a business transition,
   the owning persistence boundary atomically writes the typed Job item. An
   additional owner-specific outcome record is justified only when it has an
   independent reconciliation/product lifecycle. This is a transaction-specific
   port, not a generic `withCommerceTransaction` helper and not a shared global
   event bus.
4. FC timer and bounded request-tail remain **wake-up mechanisms** only:
   they invoke the protected tick; they do not decide business timing,
   eligibility, or outcome.
5. JobRunner claims, leases, invokes a validated handler, and records durable
   execution/recovery state from a structured disposition. It emits correlated
   attempt telemetry rather than creating another attempt-history table.
   JobRunner's `SUCCEEDED` must not conceal a retryable provider outcome.
6. Metrics/recovery observe work lag, lease expiry, retry exhaustion, missed
   windows, and handler-classified outcomes; operator replay is only available
   where the owner provides a safe idempotency/reconciliation rule.

## Notification Target Tree

1. PR / future domain
   → **Notification business-template scheduling contract**
   → typed/versioned Notification Job payload and schedule metadata.
2. Notification resolves `(business template, channel)` through a private
   binding registry. User preference plus logical limited/unlimited credit
   belongs to one user-notification-option aggregate; a future nullable adapter
   may use `null = unlimited`, while current WeChat counters remain non-null and
   limited.
3. Notification creates the Job at a transactionally consistent boundary. The
   Job is the durable Notification Task and holds stable causation, correlation
   and dedupe identity. `notification_opportunities` is consolidated unless a
   separate queried lifecycle is proven.
4. JobRunner
   → generic `notification.send.v1` handler
   → reload/revalidate recipient, preference/credit, aggregate and channel state
   → render through template/channel binding
   → channel adapter
   → provider.
5. Notification classifies the attempt outcome; JobRunner performs the matching
   durable transition and emits attempt telemetry. PR-message “wave” is a Job
   creation reservation held beyond execution until the visible thread sends a
   cursor acknowledgment covering the reservation's coalesced high-water. The
   outcome taxonomy is:

   - non-retryable skip/refusal/cancel;
   - proven definitely-not-applied, safe-to-repeat failure while work remains
     pending;
   - ambiguous network/HTTP/parse outcome as a non-retrying failure; and
   - terminal sent/exhausted/missed states.

   The exact attempt/job result migration is a `6-3` decision, but a terminal
   success cannot conceal a retriable provider outcome.
6. The channel adapter is the only WeChat-specific edge. `WECHAT_TEMPLATE`,
   email, and SMS enter only through a separately proven adapter slice; current
   Phase 6 does not add a fallback merely to match a historical document.

## F-02 Placement In This Topology — Ratified D6-F-01 Boundary

1. BillLine payment settlement remains authoritative and commits before fee
   confirmation executes; it must not be rolled back because the external
   consequence is pending or failed.
2. The same narrow transaction records a RideHailing-owned confirmation
   generation in `REQUIRED` state and ensures one typed FeeConfirmation Job for
   that generation. No separate intent entity is added.
3. Before provider I/O, RideHailing advances to `IN_FLIGHT`. The handler calls
   the provider only under a verified idempotency or reconciliation-before-
   retry contract; success becomes `CONFIRMED`, ambiguity becomes `UNKNOWN`.
4. Job records only generic task execution. Operator recovery invokes a
   RideHailing command; a proven-safe retry advances owner generation and
   creates a new Job. Neither path reruns the settled Bill transition.

## Explicit Compatibility Closures

- PR → `infra/notifications` scheduling imports become PR → Notification
  business-template scheduling commands.
- PR-message direct service/scheduler composition becomes internal to
  Notification.
- Notification opportunity task/link data moves to typed Job payload/metadata;
  attempt history moves to observability; wave/inbox gating moves to a Job
  creation reservation. The current backend-authoritative read/unread contract
  is explicitly retired.
- Job type strings and arbitrary JSON remain storage details behind validated
  owner definitions; a broad global registry is not required as a first step.
- Historical outbox/event wording has been removed from durable current-state
  claims; a future narrow durable-work handoff must earn its own contract and
  migration proof.
