# `6-0` — Job / Notification Runtime Topology Inventory

## Objective And Hypothesis

Establish, without mutation, the current dependency paths and state links for
JobRunner and Notification; then propose a target topology that can support
Phase 6 slices without smuggling in a generic outbox or unproven provider
replay.

## Questions To Close

1. Which modules currently schedule work, register handlers, claim due jobs,
   and invoke the external/serverless trigger?
2. Which state records are authoritative for notification intent, scheduling,
   attempt outcome, and retry—and which stated lifecycle links are absent?
3. Which PR/Commerce callers currently depend on Notification or transport
   internals rather than a curated owner surface?
4. Is an outbox/domain-event pipeline current source truth, historical schema
   residue, or only a durable-doc claim?
5. What exact idempotency, operator, and provider information must be decided
   before F-02 can become an executable slice?

## Scope And Non-Mutation Boundary

- Read durable Product TDD, deployment docs, source, entities/repositories,
  tests, migration ledger, and FC trigger descriptor.
- Do not alter source, schema, migrations, runtime configuration, provider
  state, or database state.
- Task-packet files record facts, inferences, proposals, and rehearsal only.

## Completed Artifacts

- `evidence-index.md`: path-backed claims and contradiction ledger.
- `current-topology.md`: current Job and Notification module/state/trigger
  topology.
- `target-topology.md`: target owner edges and compatibility closures.
- `classic-use-case-sequences.md`: current and target sequence diagrams in
  ordered-list form.
- `rehearsal.md`: source-slice branching, prerequisites, failure paths, and
  low-cost verification.
- `verification-log.md`: source/doc/migration/trigger cross-check record.

## Low-Cost Verification Plan

1. Trace each claimed JobRunner path from both scheduling/registration and
   execution/tick directions.
2. Trace each claimed Notification path from business mutation and handler
   dispatch directions.
3. Cross-check an outbox claim across current entities/source and forward
   migrations, not documentation alone.
4. Cross-check FC trigger README/template/handler against the backend internal
   tick route; do not claim deployed environment values without operator
   observation.

## Exit Result

- Current facts, the target proposal and its later ratified decision packets
  are visibly separate.
- The requested Job/Notification topology and classic sequence diagrams are
  path-backed in the completed artifacts above.
- Every ratified source slice has a narrow entry gate and cheap proof plan.
- The current outbox/domain-event and channel-fallback documentation drift has
  been promoted as a factual correction; no target source behavior was claimed
  as current.
