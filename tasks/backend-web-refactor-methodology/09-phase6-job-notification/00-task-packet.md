# Phase 6 — Job / Notification Runtime

## Status

**Locally complete on 2026-07-23.** `6-0` through `6-5` completed their
authorized design, implementation, migration, local runtime proof, durable-doc
promotion and final review. The resulting source shape has:

- generic fenced Job execution and creation reservations;
- Notification-owned business-template tasks with atomic/recoverable producer
  handoffs;
- PR-message semantic visible acknowledgement without a thread inbox table;
- forward retirement of opportunity/wave/inbox state, every concrete per-kind
  Notification decoder, and no-cycle generic compatibility payloads;
- one atomic RideHailing settlement-created
  `ride-hailing.fee-confirm.v1` Job with an `order_id`-only provider call; and
- protected DB-backed maintenance diagnostics with the Phase 6 Job/CaoCao
  console/stdout paths removed.

Canonical static gates, Backend/Web unit suites, backend/system scenarios and
database migration checks are recorded in the Phase 6 exit verification log.
`notification_deliveries` is deliberately retained as inert audit history.
Real telemetry infrastructure and its eventual retirement belong to Phase 7;
Phase 4/5 deployed evidence remains independently open and does not qualify
this local Phase 6 result.
This packet is the only Phase 6 control surface.
It does not by itself authorize application-source, schema, migration,
deployment, or provider changes.

## Objective And Hypothesis

Phase 6 makes delayed work and user-attention delivery legible as two related
but distinct owners:

- **JobRunner** owns durable due-work execution: claim, lease, retry, timing
  bucket, execution budget, and serverless trigger interaction.
- **Notification** owns business-template bindings and attention semantics:
  task creation, recipient revalidation, preference/credit rules,
  channel-neutral outcome classification and transport consequences.
- **Business source owners** retain independently valuable product state. The
  current PR read/unread aggregate did not prove value outside the Job window
  and is removed from the target model.

The ratified D6-N-01 decision treats a Job with a typed/versioned Notification
payload as the durable Notification Task. It does not add a separate
Notification Intent. `notification_opportunities` was therefore retired after
source/migration proof. D6-J-02 further establishes that pure attempt history
moves to observability, while wave mechanics become a held/released Job
creation reservation and the PR inbox-state table leaves the target. A future
bounded per-message viewed membership defaults to the PRMessage owner rather
than recreating a thread-level state entity.

The hypothesis is that a narrow JobRunner execution contract plus a curated
Notification command surface can remove direct PR-to-transport coupling and
make later provider consequences (including RideHailing post-settlement fee
confirmation) recoverable without introducing a generic outbox or a second
source of business truth.

## Entry Facts And Unknowns

- Phase 5 handed F-02 forward. Phase 6 closed it with an atomic,
  deterministically keyed Job handoff and an explicit acceptance of possible
  duplicate provider effect after a lost successful response.
- The deployed shape is scale-to-zero: external FC timer ticks and bounded
  request-tail maintenance drive the DB-backed JobRunner.
- `6-0` confirmed that `domain_events` / `outbox_events` are historical rather
  than current source state and promoted the corresponding present-tense
  durable-doc correction. A target design must not treat a generic outbox as
  already available.
- Notification opportunity, wave, job, and delivery state have overlapping
  lifecycle claims. `6-0` proved that opportunity has creation/link writes but
  no dispatch read or terminal transitions; D6-J-01 proved the wave table is
  behaviorally unused and “deliveries” are handler-attempt evidence. Ratified
  D6-J-02 assigns them to the simpler O11y / Job-window placement.

## Guardrails Touched

- Preserve existing user-facing notification timing, opt-out, quota,
  revalidation, and channel-result behavior unless PRD changes first.
- Preserve JobRunner's central timing semantics. Notification policies may
  select a business timing policy but do not own job lease/retry/bucket logic.
- Do not create a generic `outbox`, generic retry executor, or cross-domain
  transaction helper by implication.
- Keep provider I/O outside short database transactions; every future external
  consequence needs an explicit idempotency/dedupe, recovery/ambiguity,
  operator-if-needed and verification decision.
- Keep FC deployment topology and source behavior distinct: source can prove a
  contract, not that deployed environment values or cron overrides are live.
- `6-0`, D6-N-01, D6-J-01, D6-J-02 and D6-F-01 are read-only except for their
  task packets and evidence-backed durable-doc corrections. They must not run
  migrations, mutate a database, invoke provider APIs, or alter application
  source.

## Ratified Source Slice Map

The owner model and slice dependency graph are ratified, and every source slice
has now closed its named predecessor and evidence gates. Slice numbers are
Phase 6 slices, not task-folder ordinals.

| Slice | State | Responsibility | Depends on |
| --- | --- | --- | --- |
| `6-0` | Complete, read-only | current topology, authoritative-state ledger, runtime trigger, target proposal, decision gates, and durable-doc reconciliation | none |
| `6-1` | Locally complete | generic Job definition/handler contract, structured dispositions, claim–lease–retry/terminal control, and `UNTIL_ACKNOWLEDGED` creation reservation with high-water/ACK concurrency proof; ad-hoc console observer removed | complete local proof |
| `6-2` | Locally complete | Notification public business-template command, typed payload/policy registry, template/channel binding, logical limited/unlimited credit semantics over current limited WeChat storage, eligibility revalidation, conservative outcome classification, and representative owner-surface cutover | stable `6-1` contract |
| `6-3` | Locally complete | atomic/recoverable producer cutovers; semantic PR-message ACK; forward retirement of legacy inbox/read-marker, opportunity/wave state, concrete decoders and no-cycle payload compatibility; delivery audit retained | `6-1` + `6-2` + migration/scenario proof |
| `6-4` | Locally complete | one typed generic Job atomically created per qualifying settlement, RideHailing-internal `order_id`-only provider call, ordinary Job retry, no intent/owner ambiguity state/operator recovery/backfill | `6-1` transaction writer + ratified risk/cut-over decisions |
| `6-5` | Locally complete; Phase exit verified | local runtime/recovery proof, scoped console/stdout cleanup, compatibility retirement/review, retained `notification_deliveries`, deferred real O11y | complete static/unit/backend/system proof |

`6-4` is intentionally semantic and narrow: it must not become a repository-
generic outbox or a generic Commerce transaction abstraction.

## Packet Layout

- [`01-runtime-topology-inventory/`](./01-runtime-topology-inventory/) owns
  `6-0` facts, diagrams, target proposal, rehearsal, and verification log.
- [`02-notification-dispatch-model-discussion/`](./02-notification-dispatch-model-discussion/)
  owns Sir's scheduler/template/channel/opportunity discussion, ratified
  boundary sketch,
  decision log, and source-entry rehearsal.
- [`03-job-outcome-wave-ownership/`](./03-job-outcome-wave-ownership/) owns the
  intermediate read-only evidence; its durable attempt-ledger/PR-inbox target
  is superseded by D6-J-02.
- [`04-job-observability-window-policy/`](./04-job-observability-window-policy/)
  owns the corrected future-O11y/no-console boundary, Job windowed-creation,
  PR-inbox retirement, and state-placement decisions.
- [`05-ride-hailing-fee-confirmation-job-boundary/`](./05-ride-hailing-fee-confirmation-job-boundary/)
  preserves the historical D6-F-01 review; its ambiguity/operator branches are
  superseded by executable `6-4`.
- [`06-jobrunner-execution-foundation/`](./06-jobrunner-execution-foundation/)
  owns executable slice `6-1`.
- [`07-notification-owner-surface/`](./07-notification-owner-surface/) owns
  executable slice `6-2`.
- [`08-notification-cutover-and-consolidation/`](./08-notification-cutover-and-consolidation/)
  owns executable slice `6-3`.
- [`09-fee-confirmation-recovery/`](./09-fee-confirmation-recovery/) owns
  evidence-gated executable slice `6-4`.
- [`10-runtime-proof-and-phase-review/`](./10-runtime-proof-and-phase-review/)
  owns executable slice `6-5` and Phase 6 exit proof.
- `slice-map.md` records the ratified dependency order; each source-slice packet
  still requires explicit start before application or schema mutation.
- `implementation-rehearsal.md` records the source-backed implementation
  pre-mortem, resolved implementation choices, exact batch order and stop
  conditions.
- `planning-verification-log.md` records the post-discussion consistency and
  document-integrity checks.
- [`2026-07-23-durable-correction-plan.md`](./2026-07-23-durable-correction-plan.md)
  records the durable documents that must be corrected after the simplified
  source slices pass.

## Durable Promotion State

- `docs/20-product-tdd/system-state-and-authority.md`,
  `cross-unit-contracts.md`, and `unit-topology.md` have received the
  source-backed correction that historical outbox/domain-event infrastructure
  is not a current runtime capability.
- Durable PR-message, Notification, Job/O11y owner boundaries and the general
  state-placement rule have been promoted. The D6-J-02 promotion inventory is
  recorded in `04-job-observability-window-policy/durable-promotion-log.md`.
- The verified PR-ready atomic vertical has promoted its ready-cycle, atomic
  handoff, generic-task and template-configuration facts to the durable
  Notification, PR lifecycle, topology and backend-runtime documents.
- The verified meeting-point vertical has promoted its immutable source event,
  named three-source transaction boundary and low-dependency query-entrypoint
  rule to the durable Notification, PR, topology and architecture decision
  documents. Its interim pending-row drain was superseded by the explicit
  forward cut-off and complete concrete-decoder retirement.
- The verified waitlist-alternative vertical has promoted its source-cycle
  identity, pure current-state projection/reconciler, active-only recovery
  policy and provider-template reuse to the durable Notification, PR
  lifecycle, topology and architecture documents. Its interim pending-row
  drain was superseded by the same forward cut-off.
- Durable docs describe inbox/opportunity/wave and concrete per-kind decoders
  as forward-retired after migration `0094`; `notification_deliveries` alone
  remains inert audit history pending a future professional observability and
  data-retention decision. Phase 7 later established a clean baseline rather
  than that replacement.
- `docs/40-deployment/backend-runtime.md` remains the runtime owner for FC
  trigger cadence and target configuration; a source inventory cannot promote
  an environment-specific fact there.
