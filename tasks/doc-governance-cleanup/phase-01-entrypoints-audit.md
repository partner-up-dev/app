# Phase 1: Entrypoint Inventory And Routing Audit

## Scope

This phase audits documentation entrypoints only. It does not decide whether PRD, Product TDD, Unit TDD, Deployment, local `AGENTS.md`, or historical task packet content is correct.

The question for this phase:

> Do the entrypoint documents route readers to the right durable owner, working mode, and escalation protocol before deeper cleanup starts?

## Audited Entrypoints

```text
AGENTS.md
docs/00-meta/concepts.md
docs/00-meta/input-artifact.md
docs/00-meta/input-constraint.md
docs/00-meta/input-intent.md
docs/00-meta/input-reality.md
docs/00-meta/mode-a-explore.md
docs/00-meta/mode-b-solidify.md
docs/00-meta/mode-c-execute.md
docs/00-meta/mode-d-diagnose.md
docs/10-prd/index.md
docs/15-alignment/README.md
docs/15-alignment/change-request-template.md
docs/20-product-tdd/index.md
docs/30-unit-tdd/index.md
docs/40-deployment/index.md
```

## Inventory

| Entrypoint | Current Role | Phase 1 Status | Notes |
| --- | --- | --- | --- |
| `AGENTS.md` | Repo-level operating model and documentation routing | Active | Correctly lists doc layers, task packets, search defaults, impact handshake, and negotiation triggers. It is necessarily broad. |
| `docs/00-meta/concepts.md` | Short glossary for framework terms | Active with gap | It defines input type, mode, task packet, search defaults, alignment substrate, impact handshake, local context, and promotion. It does not yet define documentation cleanup/lifecycle terms. |
| `docs/00-meta/input-*.md` | Typed input route SOPs | Active with minor ambiguity | Existing routes work for ordinary product, technical, bug, and artifact work. Documentation governance cleanup currently fits best as task-local `Artifact` plus possible `00-meta` promotion, but that route is implicit. |
| `docs/00-meta/mode-*.md` | Working posture SOPs | Active | Mode separation is clear and does not redefine durable owners. |
| `docs/10-prd/index.md` | PRD owner and reading order | Active | Clear owner boundary and explicit "must not appear" list. |
| `docs/15-alignment/README.md` | Alignment substrate entrypoint | Active with clarify candidate | Correctly states that alignment is coordination grammar, not a truth layer. Impact handshake naming is mostly in root `AGENTS.md` and `00-meta`, while the alignment template carries the same fields without naming the handshake directly. |
| `docs/20-product-tdd/index.md` | Cross-unit technical truth entrypoint | Active | Clear owner boundary, reading order, and downstream relationship. |
| `docs/30-unit-tdd/index.md` | Optional hard-unit truth entrypoint | Active | Correctly prevents broad package manuals and lists the current active unit doc. The "current repo state" list should be checked in Phase 4. |
| `docs/40-deployment/index.md` | Runtime truth entrypoint | Active | Clear owner boundary and reading order. |

## Finding Ledger

### F1-001: Documentation Lifecycle Governance Has No Durable Owner Yet

```text
Address:
AGENTS.md:72-78
docs/00-meta/concepts.md:77-83
tasks/doc-governance-cleanup/doc-governance-cleanup-protocol.md

Truth unit:
Rules for document truth-unit status, cleanup verbs, deletion thresholds, audit records, and promotion gates.

Current owner:
Task-local draft under tasks/doc-governance-cleanup/.

Expected owner:
Likely docs/00-meta/, either as a new doc-governance document or as small additions to concepts/mode/input docs.

Status:
Suspect / promotion candidate.

Operation:
Promote after review.

Evidence:
Root AGENTS defines task packet guidance and promotion only at a high level. concepts.md defines "Promotion" but not cleanup statuses, allowed cleanup verbs, or deletion thresholds. The draft protocol now contains those details task-locally.

Downstream references:
All future documentation cleanup phases.

Verification:
Before promotion, confirm the protocol should become durable project policy and decide whether it belongs in a new docs/00-meta/doc-governance.md or split across existing meta docs.

Decision:
Do not mutate durable docs yet. Keep as promotion candidate.
```

### F1-002: Documentation Governance Cleanup Does Not Map Cleanly To One Input Route

```text
Address:
docs/00-meta/input-artifact.md
docs/00-meta/input-constraint.md
tasks/doc-governance-cleanup/README.md

Truth unit:
How to classify repository documentation governance work when product behavior does not change.

Current owner:
Implicitly handled as an Artifact while the protocol is task-local. The task packet describes this cleanup as a Constraint + Solidify style task.

Expected owner:
docs/00-meta/ if the project wants documentation governance work to be a first-class route case.

Status:
Suspect.

Operation:
Clarify, not rewrite, after protocol review.

Evidence:
input-artifact.md covers "task packet" and "one-off analysis"; input-constraint.md covers technical/dependency/performance/environment boundaries with Product TDD or Unit TDD as primary owners. Documentation governance is a work-system constraint whose likely durable owner is docs/00-meta/.

Downstream references:
Future documentation cleanup and meta-governance tasks.

Verification:
Decide whether this is acceptable as "Artifact first, promote to 00-meta if reusable" or whether input routes need an explicit note for documentation-system governance.

Decision:
Keep as an open question. No durable change in Phase 1.
```

### F1-003: Impact Handshake Is Correct But Split Across Entrypoints

```text
Address:
AGENTS.md:85-95
docs/00-meta/concepts.md:61-67
docs/00-meta/mode-c-execute.md:14-17
docs/15-alignment/README.md
docs/15-alignment/change-request-template.md

Truth unit:
Before risky durable mutation, restate address/object, state diff, blast radius, invariants, and verification.

Current owner:
Root AGENTS.md carries the concrete field list. concepts.md defines the term. Execute SOP references it. Alignment README defines the substrate and template carries compatible fields.

Expected owner:
Root AGENTS.md may remain operational entrypoint, but docs/15-alignment/ or docs/00-meta/ should be the durable detailed owner if the handshake grows.

Status:
Duplicate / clarify candidate.

Operation:
Clarify or split ownership later.

Evidence:
The same coordination contract is distributed across several entrypoints. The split is understandable, but a future reader may not know whether the authoritative detailed shape is root AGENTS.md, alignment template, or a future meta governance doc.

Downstream references:
All risky documentation cleanup mutations.

Verification:
If promoted, keep one canonical detailed definition and make other entrypoints reference it.

Decision:
No immediate cleanup. Track as a candidate for a small meta-doc clarification batch.
```

### F1-004: Layer Boundary Summaries Are Duplicated But Intentional

```text
Address:
AGENTS.md:28-36
docs/10-prd/index.md
docs/20-product-tdd/index.md
docs/30-unit-tdd/index.md
docs/40-deployment/index.md

Truth unit:
Each documentation layer has an owner boundary and "must not appear here" list.

Current owner:
Root AGENTS.md provides global navigation. Each layer index owns its local boundary.

Expected owner:
Same as current.

Status:
Active.

Operation:
Keep.

Evidence:
The root entrypoint is intentionally concise. The layer indexes carry detailed boundaries and reading order. There is no observed contradiction in Phase 1.

Downstream references:
All deeper phase audits.

Verification:
When deeper phases find contradictions, change the specific layer index rather than removing the root summary.

Decision:
Do not merge or delete this duplication.
```

### F1-005: Alignment Loading Rule Is Consistent But Worth Preserving Exactly

```text
Address:
AGENTS.md:31
AGENTS.md:47
docs/10-prd/index.md:47
docs/20-product-tdd/index.md:102
docs/15-alignment/README.md:34-44

Truth unit:
Read alignment docs only when reference sensitivity, weak evidence, ambiguous boundaries, or non-local blast radius justify it.

Current owner:
docs/15-alignment/README.md, with concise references from root AGENTS.md and relevant layer indexes.

Expected owner:
Same as current.

Status:
Active.

Operation:
Keep.

Evidence:
The wording differs by entrypoint, but the rule points in the same direction: do not load alignment by default; use it when natural-language or boundary ambiguity makes mutation risky.

Downstream references:
Future cleanup batches that cross layer ownership.

Verification:
Preserve this selective loading rule when promoting the cleanup protocol.

Decision:
No cleanup needed.
```

### F1-006: Phase File Convention Should Become Task-Local Practice First

```text
Address:
tasks/doc-governance-cleanup/README.md
tasks/doc-governance-cleanup/phase-01-entrypoints-audit.md

Truth unit:
Each audit phase should have an independent detail file so the human can review details without relying on chat explanations.

Current owner:
Task-local packet convention for this cleanup task.

Expected owner:
Stay task-local unless repeated across future tasks.

Status:
Task-local.

Operation:
Keep.

Evidence:
The user explicitly requested independent files per phase for this cleanup task.

Downstream references:
All remaining phases in this task packet.

Verification:
Each future phase writes its own `phase-NN-*.md` file and README links it.

Decision:
Adopt for this task packet. Do not promote yet.
```

## Phase 1 Conclusions

The entrypoint system is coherent enough to support deeper audit. There is no immediate need to reorder the documentation tree.

The main cleanup candidates are meta-governance gaps, not layer-boundary failures:

- the cleanup protocol itself has no durable owner yet
- documentation governance work is not explicitly represented in input routes
- Impact Handshake details are spread across multiple entrypoints

## Recommended Next Batch

Before auditing PRD content, decide whether to run a small meta-governance batch:

```text
Batch:
Promote the reviewed cleanup protocol into docs/00-meta/.

Possible durable mutation:
Add docs/00-meta/doc-governance.md.
Update docs/00-meta/concepts.md with a short "Documentation Governance" concept.
Optionally add one sentence to input-artifact.md or input-constraint.md about documentation-system governance tasks.
Optionally make Impact Handshake point to one canonical detailed owner.
```

This batch should wait for explicit human approval because it mutates durable meta truth.

## Next Phase If No Meta Promotion Yet

Proceed to Phase 2: PRD audit.

Suggested file:

```text
tasks/doc-governance-cleanup/phase-02-prd-audit.md
```

Suggested audit order:

```text
docs/10-prd/glossary.md
docs/10-prd/_drivers/*
docs/10-prd/behavior/claims.md
docs/10-prd/behavior/workflows.md
docs/10-prd/behavior/rules-and-invariants.md
docs/10-prd/behavior/scope.md
docs/10-prd/behavior/capabilities.md
docs/10-prd/domain-structure/*
```
