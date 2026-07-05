# Documentation Governance Cleanup

## Objective & Hypothesis

The project has iterated quickly, and durable documentation may now contain stale, duplicated, misplaced, or process-local material. Before editing durable documentation, establish a task-local governance protocol for auditing and cleaning the documentation system.

Hypothesis: the existing top-level documentation layer topology is broadly sound. The primary missing piece is lifecycle protocol: document ownership, claim status, allowed cleanup operations, promotion rules, deletion thresholds, and verification expectations. Later PRD review found that `docs/10-prd/` itself may still need internal topology changes, especially around vocabulary, workflows, and rules.

## Guardrails Touched

- `docs/00-meta/` owns working method, input routes, modes, and durable governance language.
- `docs/10-prd/` owns product intent, user-visible behavior, product rules, scope, and business vocabulary.
- `docs/15-alignment/` is coordination grammar for risky or reference-sensitive work, not a durable truth layer.
- `docs/20-product-tdd/` owns cross-unit technical truths and authority boundaries.
- `docs/30-unit-tdd/` is optional and only for hard local unit truth.
- `docs/40-deployment/` owns runtime, rollout, observability, and recovery truth.
- Local `AGENTS.md` files own subtree-local constraints and tactical hazards.
- `tasks/` owns volatile task-local reasoning, evidence, drafts, and promotion candidates.
- Durable documentation should not be mutated until the cleanup protocol is reviewed and explicitly started.

## Current Understanding

- The current top-level layer indexes already define strong ownership boundaries.
- PRD has internal topology pressure: some product truths are still correct, but too much behavior, vocabulary, workflow, and rule detail is carried in a flat structure.
- The most likely failure modes are lifecycle failures:
  - obsolete claims left active
  - duplicated truths with no single owner
  - correct content in the wrong layer
  - task evidence promoted too early
  - implementation detail embedded in PRD
  - deployment/runtime facts buried outside deployment docs
  - local hazards spread into global docs
- Cleanup should operate on durable truth units such as claims, invariants, contracts, and runbook facts, not only on whole files.

## Proposed Control

Use the draft protocol in [doc-governance-cleanup-protocol.md](./doc-governance-cleanup-protocol.md) as the control surface for the first cleanup pass.

The protocol should answer:

- which layer owns each kind of truth
- how to mark document findings
- which cleanup verbs are allowed
- when deletion is safe
- when task-local evidence may be promoted
- how to verify a cleanup mutation
- when to pause for human confirmation

## Proposed Cleanup Flow

```text
Solidify protocol
  -> inventory durable docs
  -> classify findings
  -> resolve ownership
  -> perform small cleanup batches
  -> verify references and contradictions
  -> promote stable protocol into durable meta docs only after review
```

## Phase Detail Files

- [Phase 1: Entrypoint Inventory And Routing Audit](./phase-01-entrypoints-audit.md)
- [Phase 2: PRD Audit](./phase-02-prd-audit.md)
- [Phase 3: Product TDD Audit](./phase-03-product-tdd-audit.md)
- [Phase 4A: Unit TDD Audit](./phase-04-unit-tdd-audit.md)
- [Phase 4B: Local AGENTS.md Audit](./phase-04-local-agents-audit.md)
- [Phase 5: Deployment Audit](./phase-05-deployment-audit.md)
- [Batch 1 Proposal: Meta-Governance Promotion For F1-003 And F1-005](./batch-01-meta-governance-f1-003-f1-005.md)
- [Batch 2 Proposal: Root AGENTS.md Bootstrap Slimming](./batch-02-root-agents-bootstrap-slimming.md)
- [Batch 3 Proposal: PRD Topology And Cleanup Plan For F2-001 To F2-005](./batch-03-prd-f2-001-to-f2-005-solution-plan.md)
- [Batch 4: Product TDD Cleanup Plan And Execution Record](./batch-04-product-tdd-f3-001-to-f3-007-plan.md)
  - [Segment 1: Authority Bridge And Claim Matrix Refresh](./batch-04-segment-1-authority-and-claim-matrix.md)
  - [Segment 2: Cross-Unit Contract Split](./batch-04-segment-2-cross-unit-contract-split.md)
  - [Segment 3: Ecommerce Contract Durable Reframe And Provider Depth](./batch-04-segment-3-ecommerce-contract-depth.md)
  - [Segment 4: Local Development Origin Ownership](./batch-04-segment-4-local-dev-origin-ownership.md)
- [Batch 5: Unit TDD Content Recovery Plan And Execution Record](./batch-05-unit-tdd-critical-cleanup-plan.md)
- [Batch 6: Local AGENTS Critical Cleanup Plan And Execution Record](./batch-06-local-agents-critical-cleanup-plan.md)
- [Batch 7: Deployment Cleanup Plan For F5-001 To F5-007](./batch-07-deployment-f5-001-to-f5-007-plan.md)
- [Batch 8: Observability Boundary Correction Plan](./batch-08-observability-boundary-correction-plan.md)

## Verification

Initial exploration reviewed:

- `docs/00-meta/concepts.md`
- `docs/00-meta/input-intent.md`
- `docs/00-meta/input-constraint.md`
- `docs/00-meta/mode-a-explore.md`
- `docs/00-meta/mode-b-solidify.md`
- `docs/10-prd/index.md`
- `docs/15-alignment/README.md`
- `docs/20-product-tdd/index.md`
- `docs/30-unit-tdd/index.md`
- `docs/40-deployment/index.md`

Task-local verification for this packet:

- Protocol draft exists and is reviewable.
- Durable documentation changes are now limited to approved batches.
- Next mutation should continue to follow the batch proposal protocol unless the user explicitly approves a different route.

## Current Status

Task packet created. Draft protocol and Phase 1 entrypoint audit are ready for review.

Batch 1 has been executed for F1-003 and F1-005. Durable docs changed:

- `AGENTS.md`
- `docs/00-meta/concepts.md`
- `docs/15-alignment/README.md`
- `docs/15-alignment/change-request-template.md`

Batch 2 has been executed for F1-007. Durable docs changed:

- `AGENTS.md`
- `docs/00-meta/bootstrap-workflow.md`
- `docs/00-meta/concepts.md`
- `docs/15-alignment/README.md`

Phase 2 PRD audit has been drafted. No PRD files have been modified.

Phase 3 Product TDD audit has been drafted. During that audit phase, no Product TDD files were modified.

Batch 3 PRD proposal has been executed after explicit start. Durable docs changed:

- `docs/10-prd/index.md`
- `docs/10-prd/glossary.md`
- `docs/10-prd/vocabulary/*`
- `docs/10-prd/behavior/claims.md`
- `docs/10-prd/behavior/scope.md`
- `docs/10-prd/behavior/capabilities.md`
- `docs/10-prd/behavior/workflows.md`
- `docs/10-prd/behavior/workflows/*`
- `docs/10-prd/behavior/rules-and-invariants.md`
- `docs/10-prd/domain-structure/cross-domain-interactions.md`

Product TDD files were not edited in Batch 3. The claim-realization matrix should be reviewed in a later Product TDD batch because PRD claim names and axes were clarified.

Batch 4 Product TDD cleanup has been planned and executed as segmented work.

Batch 4 Segment 1 has been executed. Durable docs changed:

- `docs/20-product-tdd/claim-realization-matrix.md`
- `docs/20-product-tdd/system-state-and-authority.md`
- `docs/20-product-tdd/index.md`

Batch 4 Segments 2, 3, and 4 have also been executed. Additional durable docs changed:

- `docs/20-product-tdd/cross-unit-contracts.md`
- `docs/20-product-tdd/pr-lifecycle-contracts.md`
- `docs/20-product-tdd/event-context-contracts.md`
- `docs/20-product-tdd/pr-messaging-contracts.md`
- `docs/20-product-tdd/admin-surface-contracts.md`
- `docs/20-product-tdd/ecommerce-contracts.md`
- `docs/20-product-tdd/ecommerce-provider-contracts.md`

Batch 4 is complete.

Phase 4 Unit TDD and local AGENTS.md audit has been drafted. No durable Unit TDD or AGENTS files have been modified during the audit.

Batch 5 Unit TDD content recovery has been executed. Durable docs changed:

- `docs/30-unit-tdd/index.md`
- `docs/30-unit-tdd/frontend-event-form-mode.md`
- `docs/30-unit-tdd/frontend-shared-ui-primitives.md`
- `docs/30-unit-tdd/backend-migration-ledger.md`
- `apps/backend/AGENTS.md`
- `apps/frontend/AGENTS.md`

Batch 5 keeps the current flat Unit TDD layout as the working shape and defers the flat-vs-tree topology decision until the recovered content proves its shape.

Batch 6 local AGENTS critical cleanup has been executed. Durable docs changed:

- `apps/backend/AGENTS.md`
- `apps/frontend/AGENTS.md`
- `apps/frontend/src/AGENTS.components.md`
- `apps/frontend/src/AGENTS.styles.md`
- `apps/frontend/src/styles/AGENTS.md`
- `apps/frontend/src/domains/event/ui/AGENTS.md`
- `apps/frontend/src/shared/ui/AGENTS.md`

Phase 5 Deployment audit has been drafted. No durable deployment docs have been modified during the audit.

Batch 7 Deployment cleanup has been executed. Durable docs changed:

- `docs/40-deployment/index.md`
- `docs/40-deployment/environments.md`
- `docs/40-deployment/local-development.md`
- `docs/40-deployment/backend-runtime.md`
- `docs/40-deployment/frontend-runtime.md`
- `docs/40-deployment/provider-edge-routing.md`
- `docs/40-deployment/rollout.md`
- `docs/40-deployment/ci-gates.md`
- `docs/40-deployment/backend-rollout.md`
- `docs/40-deployment/frontend-rollout.md`
- `docs/40-deployment/release-automation.md`
- `docs/40-deployment/observability.md`
- `docs/40-deployment/recovery.md`
- `apps/backend/DEPLOYMENT.md`
- `apps/backend/fc-db-migrate/README.md`
- `apps/backend/fc-job-runner-trigger/README.md`

The job-runner trigger cron documentation now aligns to the actual workflow
fallback `0 */30 * * * *`. The previous Asia/Shanghai business-hour cron is
documented only as an explicit GitHub Environment override example.

Batch 8 Observability boundary correction has been executed. Durable docs
changed:

- `docs/40-deployment/observability.md`
- `docs/20-product-tdd/analytics-and-telemetry-contracts.md`
- `docs/10-prd/behavior/capabilities.md`

Deployment observability now owns program/runtime behavior signals. BI and
user-behavior observability are routed to PRD for product meaning and Product
TDD for cross-unit telemetry / BI realization contracts.
