# Documentation Governance Cleanup Protocol

## 1. Purpose

This protocol governs the documentation cleanup pass for PartnerUp MVP-HA.

The goal is to reduce stale, duplicated, misplaced, or process-local documentation without damaging durable product, technical, runtime, or local constraint truth.

This is a task-local draft. It is not durable project policy until reviewed and promoted into the correct durable owner.

## 2. Non-Goals

- Do not redesign the documentation directory topology by default.
- Do not rewrite product intent while cleaning technical docs.
- Do not use cleanup as a vehicle for hidden behavior or architecture changes.
- Do not delete content only because it is old, verbose, or inconvenient.
- Do not promote task-local evidence into durable docs before it has stable ownership and verification.

## 3. Documentation Layers

### `docs/00-meta/`

Owns documentation and work-system ontology:

- input routes
- working modes
- durable ownership language
- task packet expectations
- promotion rules
- cleanup protocol after promotion

It must not own product behavior, cross-unit contracts, unit-local implementation details, or runtime runbooks.

### `docs/10-prd/`

Owns product truth:

- product drivers
- user-visible claims
- capabilities
- workflows
- rules and invariants
- scope boundaries
- business vocabulary
- derived domain structure

It must not own package layout, route wiring, API structure, controller/service/repository structure, deployment runbooks, or task sequencing.

### `docs/15-alignment/`

Owns coordination grammar for risky or reference-sensitive collaboration:

- object and address conventions
- constrained surface maps
- operation vocabulary
- request structures
- impact handshakes

It is not a truth layer. It must not redefine PRD, Product TDD, Unit TDD, or Deployment claims.

### `docs/20-product-tdd/`

Owns cross-unit technical truth:

- technical unit responsibilities
- authoritative state boundaries
- cross-unit contracts
- scenario verification boundaries
- product-claim realization across units

It must not own product claims without technical realization context, broad package manuals, repo-global documentation policy, or runtime procedures.

### `docs/30-unit-tdd/`

Owns optional hard-local technical truth:

- fragile local invariants
- non-obvious local authority rules
- unit-local failure semantics
- costly-to-rediscover verification expectations

It must not own cross-unit contracts, product claims, or system-wide deployment expectations.

### `docs/40-deployment/`

Owns runtime truth:

- environments
- rollout flow
- runtime execution model
- observability entrypoints
- failure handling
- recovery expectations

It must not own product claims, technical decomposition rationale, local code organization, or task-local sequencing.

### Local `AGENTS.md`

Owns tactical local constraints:

- subtree-specific placement rules
- local hazards
- recurrence tripwires
- conventions closest to the relevant code

It must not become a broad replacement for Unit TDD or Product TDD.

### `tasks/`

Owns volatile task material:

- exploration notes
- current assumptions
- evidence
- drafts
- temporary decisions
- verification logs
- promotion candidates

It must not be treated as current durable truth unless a durable doc explicitly promotes the relevant finding.

## 4. Truth Unit Model

Clean documentation at the level of truth units, not only files.

A truth unit is one durable statement that future work may rely on. Common forms:

- product claim
- product invariant
- business vocabulary definition
- workflow step
- scope boundary
- technical contract
- authority rule
- state ownership rule
- runtime fact
- recovery expectation
- local hazard
- verification expectation

Each truth unit should have:

- one durable owner
- one upstream basis
- one current status
- one expected verification path
- explicit downstream readers when known

## 5. Finding Status

Use these statuses during audit.

### `Active`

The truth unit is current, correctly owned, and useful.

Allowed actions:

- keep
- lightly rewrite for clarity
- add references if needed

### `Suspect`

The truth unit may be stale, contradicted, unverifiable, or ownerless, but evidence is insufficient.

Allowed actions:

- mark in task audit
- gather evidence
- ask for human confirmation

Do not delete or rewrite as truth yet.

### `Duplicate`

The same truth appears in multiple places without a clear primary owner.

Allowed actions:

- select owner
- merge into owner
- replace secondary copies with references
- delete secondary copies only after references are repaired

### `Misplaced`

The content appears correct, but belongs to another layer.

Allowed actions:

- move to correct owner
- leave a short reference if the old location remains a useful navigation point

### `Contradicted`

The truth unit conflicts with code, tests, runtime evidence, or a higher-authority doc.

Allowed actions:

- pause if product or architecture meaning is unclear
- update only after authority and evidence are explicit
- preserve evidence trail in the task packet

### `Deprecated`

The truth unit is explicitly replaced by newer truth.

Allowed actions:

- replace with a pointer to the new owner
- delete if the replacement is unambiguous and no transition note is useful

### `Task-local`

The content is useful process material but should not live in durable docs.

Allowed actions:

- demote to task packet
- summarize as durable truth only if it passes promotion rules
- delete from durable docs when no durable value remains

## 6. Cleanup Verbs

Only use explicit cleanup verbs.

### `keep`

Leave the truth unit unchanged after confirming it is active and correctly owned.

### `clarify`

Improve wording without changing meaning or ownership.

Verification: diff shows equivalent meaning.

### `move`

Relocate a truth unit to the correct owner without changing meaning.

Verification: old owner no longer carries wrong authority; new owner has the complete claim.

### `merge`

Combine duplicate truth units into one owner.

Verification: one canonical owner remains; secondary copies are removed or converted to references.

### `split`

Separate mixed truth units that belong to different owners.

Verification: each resulting unit has exactly one owner.

### `promote`

Move verified stable truth from `tasks/` into durable docs.

Verification: source evidence exists; durable owner is correct; task-local detail is not copied wholesale.

### `demote`

Move process-local or unstable material out of durable docs.

Verification: durable docs no longer require readers to depend on unstable evidence.

### `deprecate`

Mark a truth unit as replaced by another truth unit.

Verification: replacement owner and reason are explicit.

### `delete`

Remove a truth unit.

Verification: deletion threshold is met.

### `rewrite`

Change the substance of a truth unit.

Verification: requires authority, evidence, and explicit impact handshake.

## 7. Deletion Threshold

Deletion is allowed only when at least one condition is true:

- the content is purely task-local and has no durable value
- the content is an exact duplicate and the canonical owner remains
- the content is contradicted and has been replaced by verified truth
- the content describes a removed feature, route, environment, or contract and no migration note is needed
- the content is navigation noise and all references remain discoverable without it

Deletion is not allowed when:

- the only evidence is age
- the content is unclear but potentially authoritative
- downstream references have not been checked
- deleting it would silently change product or technical meaning

## 8. Promotion Rules

Promote from `tasks/` into durable docs only when all are true:

- the finding is stable after verification
- the durable owner is known
- future rediscovery would be expensive
- the durable statement can be written as a compact truth unit
- the task evidence can be summarized without copying process logs

Promotion target:

- product behavior -> `docs/10-prd/`
- cross-unit technical truth -> `docs/20-product-tdd/`
- hard local technical truth -> `docs/30-unit-tdd/` or local `AGENTS.md`
- runtime truth -> `docs/40-deployment/`
- work-system rule -> `docs/00-meta/`
- local tactical hazard -> nearest local `AGENTS.md`

## 9. Audit Record Format

Each cleanup batch should keep a compact audit record in the task packet.

Suggested format:

```text
Address:
Truth unit:
Current owner:
Expected owner:
Status:
Operation:
Evidence:
Downstream references:
Verification:
Decision:
```

Use file paths and stable headings where possible. Avoid positional-only references unless no stable anchor exists.

## 10. Batch Size

Prefer small reviewable batches.

Good batch boundaries:

- one documentation layer
- one domain vocabulary cluster
- one cross-unit contract family
- one deployment topic
- one repeated duplicate pattern
- one index/navigation cleanup

Avoid mixing product truth, cross-unit contracts, runtime facts, and local AGENTS changes in the same batch unless the impact handshake explains why they must move together.

## 10.1 Batch Proposal Files

Every non-trivial cleanup solution must be written as a task-local batch proposal file before durable docs are edited.

Use this convention:

```text
tasks/doc-governance-cleanup/batch-NN-<short-topic>.md
```

Each proposal should include:

- scope and covered findings
- objective
- current state
- proposed owner decision
- proposed durable mutations
- impact handshake
- invariants
- verification
- open human decisions
- execution notes after approval

Do not rely on chat-only explanations for cleanup plans. Chat may summarize, but the inspectable plan lives in the batch file.

## 11. Cleanup Order

Recommended first pass:

1. Solidify this protocol in `tasks/doc-governance-cleanup/`.
2. Inventory durable docs by owner, topic, and likely downstream readers.
3. Audit entrypoints first:
   - root `AGENTS.md`
   - `docs/00-meta/*`
   - layer `index.md` and `README.md` files
4. Audit PRD truth:
   - claims
   - workflows
   - rules and invariants
   - scope
   - glossary
5. Audit Product TDD truth:
   - unit topology
   - authority
   - cross-unit contracts
   - test platform
6. Audit optional Unit TDD only where active docs exist.
7. Audit Deployment truth.
8. Review local `AGENTS.md` files only when they conflict with or duplicate durable docs.
9. Review old task packets only for explicit promotion candidates, not as active truth.

## 12. Impact Handshake For Durable Mutations

Before durable documentation changes, restate:

- Address and Object: exact files, headings, anchors, or truth units
- State Diff: `From -> To`
- Blast Radius Forecast: downstream docs, code surfaces, tests, workflows, or operators affected
- Invariants Check: what must remain unchanged
- Verification: concrete proof that side effects are bounded

Use this handshake whenever:

- a rewrite changes meaning
- a deletion removes a previously authoritative statement
- ownership crosses layers
- a conflict touches product behavior or cross-unit contracts
- downstream references are unclear

## 13. Verification

Minimum verification for documentation cleanup:

- `rg` references to renamed or deleted headings, terms, files, or anchors
- check affected layer index/README still points readers correctly
- confirm no lower layer redefines a higher layer
- confirm no task-local claim becomes durable without promotion criteria
- confirm product and technical meaning did not change unless explicitly intended

When code or runtime reality is used as evidence:

- link the code symbol, test, config, route, workflow, or runtime command that proves the claim
- do not infer broad truth from one implementation detail unless the owner boundary supports it

## 14. Pause Conditions

Pause and ask for confirmation when:

- product intent and implementation reality conflict
- two durable docs claim competing authority
- deletion would remove a user-visible rule or technical contract
- a cleanup shortcut would make future work less readable or less maintainable
- evidence is insufficient and the likely blast radius crosses layers

## 15. Expected Deliverables

For the first governance cleanup pass:

- this task packet control surface
- this draft protocol
- a durable-doc inventory
- a finding ledger
- one or more small cleanup batches after approval
- final promotion recommendation:
  - what should enter `docs/00-meta/`
  - what should remain task-local
  - what should be discarded

## 16. Open Questions

- Should the promoted durable protocol live in a new `docs/00-meta/doc-governance.md`, or be split across existing input route and mode docs?
- Should audit records remain only in `tasks/`, or should durable docs include lightweight owner/status metadata?
- Should deprecated durable docs use explicit deprecation headers, or should replaced content be removed immediately after reference repair?
- Should old task packets be archived by convention, or left as historical task-local evidence with stronger search exclusions?
