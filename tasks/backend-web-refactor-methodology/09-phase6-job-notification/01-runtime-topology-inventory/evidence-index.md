# `6-0` Evidence Index

This index is populated only with path-backed findings. It distinguishes
current source facts from durable-doc intent and target proposals.

| Claim | Classification | Evidence | Cross-check | Status |
| --- | --- | --- | --- | --- |
| JobRunner owns DB-backed due-job claim, lease, retry and status transitions | Current source | `apps/backend/src/infra/jobs/job-runner.ts` (`scheduleOnce`, `runDueJobs`, `claimDueBatch`, mark helpers); `entities/job.ts` | schedule caller → tick → handler trace; entity state/index review | Confirmed |
| The active JobRunner scheduler is triggered by FC timer and best-effort request-tail | Current source + deployment contract | FC trigger `job-runner-trigger.cjs` / `s.yaml`; internal controller; `maintenance-runner.ts`; `index.ts` request-tail | trigger → protected endpoint → `runDueJobs`, plus request-tail → `runDueJobs` | Confirmed; deployed environment values/cadence override remain external |
| Notification owns attention policy, while JobRunner owns claim/timing mechanics | Current durable rule, source partially conforms | `unit-topology.md`; `notification-contracts.md`; `domains/notification`; `infra/jobs` | scheduling-policy and handler traces | Confirmed as target direction; direct PR→infra compatibility edges remain |
| `domain_events` / `outbox_events` are current runtime capability | Contradicted historical claim | baseline/`0015` create history; `0039_telemetry_analytics_cleanup.sql` drops both; no current entity/repository/processor | `rg` across current entities/source/migrations/docs | Rejected; durable docs corrected in this slice |
| Notification opportunity/wave enums describe complete active lifecycle | Current-source gap | opportunity repository only creates / marks scheduled; wave repository only creates / finds; handlers write deliveries | state-transition search + handler review | Rejected; completion is a target design |
| F-02 requires an independent domain-owned FeeConfirmationIntent beside Job | Rejected historical proposal; D6-F-01 ratified target | Phase 5 F-02 handoff; RideHailing `feeConfirm` provider port; JobRunner target control model; no current independent intent consumer/lifecycle | state-owner ledger + provider idempotency/safe-dedupe + failure-injection proof | Rejected: RideHailing owns bounded confirmation state/uncertainty; one generic Job per owner generation is only the task |
| `notification_opportunities` currently has an independently consumed intent lifecycle | Contradicted current-state claim | repository exposes create + mark scheduled; dispatch handlers consume Job payload directly; no opportunity read or terminal-state writes found | D6-N-01 source trace | Rejected; independent target lifecycle would be new design, not preservation |
| Preference and limited/unlimited channel credit may share one user-notification-option aggregate | Ratified target model supported by product semantics | subscription action expresses preference and grants entitlement; future unlimited channel can encode `credit = null` | D6-N-01 discussion + state-transition rehearsal required | Ratified; distinct fields/invariants remain mandatory |
| A provider/channel `send` call can itself be the complete job handler | Target-boundary candidate | current handler revalidation, quota cleanup, delivery records and JobRunner return/throw behavior | D6-N-01 source trace | Rejected as complete handler; valid only as generic Notification handler's transport leaf |
| A typed Job can be the durable Notification Task without a second Intent row | Ratified target; not current deletion permission | Job already owns job type/payload/runAt/timing/attempt/lease/dedupe; opportunity has no active reader/terminal lifecycle | D6-N-01 source trace + migration rehearsal | Ratified; source work must close typed payload, dedupe lifetime, atomic insertion, cancellation and observability correlation |
| `notification_deliveries` represents an independently observed delivery lifecycle | Contradicted current-state claim | create-only repository; handlers write success/failure/skip per attempt; no reader/update/provider receipt; `sentAt` is set even for skip/failure | D6-J-01/D6-J-02 source trace | Rejected; ratified target puts pure attempt history in O11y and control outcome on Job |
| `notification_waves` owns the active PR unread-wave lifecycle | Contradicted current-state claim | only create callsite; no read/transition callsite; current gating uses PR inbox markers plus Job payload | D6-J-01/D6-J-02 source trace | Rejected; ratified target models it as a held/released Job creation mode |
| `pr_message_inbox_states` currently serves an independent user-visible unread product | Unsupported current-state claim | backend returns read/unread fields, but web renders no unread indicator and reads the marker only to drive/avoid repeated acknowledgment | D6-J-02 cross-unit trace | Not proven; ratified target retires the read/unread contract and removes this table after migration proof |

## Documentation Reconciliation Performed

The following source-backed present-tense corrections were promoted without
claiming a future implementation:

- `system-state-and-authority.md`: removes current outbox/domain-event state
  and derived backlog claims.
- `unit-topology.md`: removes current outbox/event-infra ownership claims.
- `cross-unit-contracts.md`: makes a future outbox conditional rather than
  current runtime.
- `notification-contracts.md`: distinguishes its target semantic-event
  direction from direct current compatibility calls and removes the nonexistent
  confirmation-template fallback claim.
- `40-deployment/observability.md`: distinguishes process-local tick exclusion
  from JobRunner's transaction-scoped DB claim lock; it no longer claims that
  all cross-instance coordination is absent.
