# Documentation Governance Cleanup

## Objective & Hypothesis

The project has iterated quickly, and durable documentation may now contain stale, duplicated, misplaced, or process-local material. Before editing durable documentation, establish a task-local governance protocol for auditing and cleaning the documentation system.

Hypothesis: the existing documentation layer topology is broadly sound. The missing piece is not a new directory model, but a lifecycle protocol that defines document ownership, claim status, allowed cleanup operations, promotion rules, deletion thresholds, and verification expectations.

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

- The current layer indexes already define strong ownership boundaries.
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
- [Batch 1 Proposal: Meta-Governance Promotion For F1-003 And F1-005](./batch-01-meta-governance-f1-003-f1-005.md)
- [Batch 2 Proposal: Root AGENTS.md Bootstrap Slimming](./batch-02-root-agents-bootstrap-slimming.md)

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
- No durable documentation has been changed.
- Next mutation should be limited to this task packet unless the user explicitly approves promoting protocol content into `docs/00-meta/`.

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
