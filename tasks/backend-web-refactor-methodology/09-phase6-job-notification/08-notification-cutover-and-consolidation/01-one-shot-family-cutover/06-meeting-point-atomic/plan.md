# `6-3.1f` Plan

1. Complete the generic Notification vertical first. Extend the typed payload
   to carry immutable event facts: `prId`, `meetingPointUpdateId`,
   `meetingPointDescription`, and `updatedAtIso`. Add ONCE_PER_CAUSE
   private identity, prepared rendering, option/credit mapping, dispatch
   context and the existing WeChat template binding. A missing channel
   configuration is a dispatch-time permanent refusal, not a source-write
   veto.
2. Refactor only the meeting-point support needed for atomic sources:
   transaction-aware PR-type/POI reads, an executor-aware effective resolver,
   and a narrow transaction-bound Notification port. The port accepts semantic
   source facts and a frozen candidate roster; it cannot select Job mechanics.
3. Implement PR-content as its own named source bridge. It must lock/re-read
   the PR before/after the core write, generate the event UUID inside the
   committing transaction, and put generic task fan-out in that same
   transaction. Do not smuggle a generic transaction callback across PR and
   Notification. If a surrounding legacy side effect cannot safely coexist
   with the narrow bridge, stop and isolate that boundary explicitly.
4. Implement PR-type coordination as a separately owned serializable
   transaction: lock/re-read the config, observe affected PRs, apply the
   coordination fields, derive each changed effective meeting point, freeze
   the PR rosters, and hand each per-PR event to Notification.
5. Move admin POI mutation into a POI domain use case, then implement its own
   serializable transaction. It locks the POI and retains the old-name plus
   new-name affected-PR union so a rename cannot lose notifications.
6. Cut all source creation calls away from the concrete legacy scheduler.
   Retain its handler registration and cancellation only for pending rows.
   Add cross-source scenarios and promote the passing owner/source contract
   to durable documentation.

## Cheapest Verification

| Claim | Lowest-cost credible proof |
| --- | --- |
| immutable event rather than timestamp dedupe | Owner unit requests two source UUIDs at the same instant and gets two task sets with distinct private creation keys. |
| generic ownership | Owner/runtime/channel units prove event fields render exactly, current recipient checks skip before I/O, accepted limited credit preserves preference, and 43101 clears it. |
| PR-content atomicity | Real-Postgres writer-failure scenario leaves the target PR core field unchanged and creates no generic Job. |
| PR-type atomicity | Real-Postgres writer-failure scenario leaves coordination config unchanged and creates no generic Job; success fans out only for effective changes. |
| POI atomicity | Real-Postgres writer-failure scenario leaves POI unchanged and creates no generic Job; rename covers both old and new location names. |
| no coalescing | Two rapid committed effective updates yield two per-recipient generic tasks whose descriptions/timestamps remain distinct. |
| drain boundary | Static inventory finds no new source creation reference to the concrete scheduler, collector, key, Opportunity or Delivery writer, while legacy handler registration remains. |
| regression | Focused units/scenarios, then backend unit/scenario/type/lint/build and diff checks. |
