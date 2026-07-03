# Batch 3 Proposal: PRD Topology And Cleanup Plan For F2-001 To F2-005

## Scope

This proposal covers Phase 2 PRD findings only:

- F2-001: Product claims lag current capability surface.
- F2-002: Scope contains detailed page IA and rollout facts.
- F2-003: Rules mix product invariants with Product TDD-style mechanism language.
- F2-004: Event/Form workflow section is overloaded.
- F2-005: Business vocabulary is behind current terms.

Product TDD audit findings are deferred. This batch may read Product TDD as owner evidence, but must not create or execute a Product TDD cleanup plan.

This is a solution plan only. No PRD files should be edited before a specific sub-batch is approved.

## Reviewer Corrections Incorporated

The first draft treated the five PRD findings as mostly local file gaps. That framing is too shallow.

This revision treats Batch 3 as a PRD topology cleanup:

- Glossary must not become a large flat term dump.
- Vocabulary is contextual; the same word may carry different meaning in different product contexts.
- Claims need an orthogonality audit, not just additive expansion.
- PRD is already too large for a single flat behavior layer, so structural decomposition is part of the cleanup.

## Objective

Make PRD easier to govern before adding more content:

- claims form a small, orthogonal product thesis set
- vocabulary is scoped by context rather than globally flattened
- scope remains a boundary document
- capabilities remain a surface map, not a second workflow file
- workflows become addressable by product context
- rules retain product authority while implementation mechanisms stay outside PRD

## Proposed PRD Topology Direction

Current pressure is not only file size; it is missing hierarchy. Batch 3 should introduce a deeper PRD shape only where the existing flat files are already overloaded.

Candidate topology:

```text
docs/10-prd/
|-- index.md
|-- glossary.md                  # routing + universal terms only
|-- vocabulary/                  # context-scoped vocabulary, if approved
|   |-- collaboration.md
|   |-- event-context.md
|   |-- commerce-and-support.md
|   `-- operations.md
`-- behavior/
    |-- claims.md
    |-- scope.md
    |-- capabilities.md
    |-- workflows.md             # routing or compact overview after split
    |-- workflows/
    |   |-- core-pr.md
    |   |-- event-context.md
    |   |-- commerce-and-support.md
    |   `-- messaging-reliability-and-study.md
    |-- rules-and-invariants.md  # routing or compact overview after split
    `-- rules/
        |-- collaboration.md
        |-- event-context.md
        |-- commerce-and-support.md
        `-- notification-and-reliability.md
```

This topology is not all-or-nothing. Each sub-batch should split only the owner that is causing immediate governance pressure.

## Proposed Sub-Batches

### PRD-0: Topology Decision And Reference Strategy

Covers:

```text
F2-002
F2-004
F2-005
```

Target files:

```text
docs/10-prd/index.md
docs/10-prd/glossary.md
docs/10-prd/behavior/workflows.md
docs/10-prd/behavior/rules-and-invariants.md
```

Objective:

Approve the minimum PRD directory shape before moving content. This prevents local cleanup from hardening another flat structure.

Decision points:

- Whether `glossary.md` remains the only vocabulary file or becomes a routing file for context-scoped vocabulary.
- Whether overloaded workflow content should split into `behavior/workflows/*`.
- Whether rules should remain a single file for now or split after PRD-5 line classification.
- Whether references should prefer stable headings, stable anchors, or short routing index files during the split.

Recommended default:

- Split workflows first, because F2-004 has the clearest overload.
- Keep rules in one file until PRD-5 classifies product authority vs Product TDD mechanism language.
- Convert glossary only as far as needed to avoid a flat global dump.

Verification:

```text
rg -n "behavior/workflows.md|rules-and-invariants.md|glossary.md|Claim [0-9]" docs tasks/doc-governance-cleanup
```

Check references before and after any split.

### PRD-1: Claim Orthogonality Audit

Covers:

```text
F2-001
```

Target files:

```text
docs/10-prd/behavior/claims.md
```

Reference files:

```text
docs/10-prd/_drivers/*
docs/10-prd/behavior/capabilities.md
docs/10-prd/behavior/workflows.md
docs/20-product-tdd/claim-realization-matrix.md
```

Objective:

Decide the claim set before adding or expanding claims.

Orthogonality test:

- Each claim should own one reason the product exists.
- Claims should not be capabilities, modules, or route families.
- Claims should not overlap merely because they mention the same `PR` object.
- A new capability cluster should become a claim only if it introduces a new product thesis, not just a new realization path.

Current risk:

- Claim 2 mixes entry-path diversity with stable collaboration semantics.
- Claim 3 overlaps with Claim 2 where revisit/re-entry becomes another entry path.
- Claim 4 mixes trust, reliability, notification, coordination, and feedback loops.
- A proposed bounded fulfillment/support claim may be real, but it may also be a support capability under collaboration completion rather than a first-class thesis.

Output shape:

```text
Claim axis:
- Object formation
- Contextual entry and discovery
- Re-entry and distribution
- Trust and coordination
- Progressive identity
- Optional bounded fulfillment/support, only if it is orthogonal
```

Mutation style:

- First create a claim map in the task packet or as a short preface in `claims.md`.
- Then rewrite claims only if the axes are stable.
- Avoid adding Claim 6 until we decide whether bounded fulfillment/support is orthogonal.

Verification:

- Every claim maps to at least one upstream driver.
- Every major capability cluster maps to exactly one primary claim and optional secondary claims.
- No claim is justified only by current implementation or route shape.

### PRD-2: Context-Scoped Vocabulary Model

Covers:

```text
F2-005
```

Target files:

```text
docs/10-prd/glossary.md
```

Possible new files, if PRD-0 approves split:

```text
docs/10-prd/vocabulary/collaboration.md
docs/10-prd/vocabulary/event-context.md
docs/10-prd/vocabulary/commerce-and-support.md
docs/10-prd/vocabulary/operations.md
```

Objective:

Prevent glossary growth from becoming a flat dictionary. Define terms only inside the context where the definition is stable.

Recommended model:

- `glossary.md` owns universal PRD vocabulary and routes to scoped vocabulary.
- Context vocabulary files define terms relative to a product context.
- Ambiguous terms must carry a context boundary instead of pretending to be globally stable.

Initial term routing:

```text
Universal / shared:
- PR
- PartnerRequest
- Pairing Code, only if defined as collaboration-visible aid

Collaboration:
- Join Gate
- Current Creator
- Meeting-Point Guidance

Event context:
- Anchor Event
- Form Mode
- Dummy PR
- POI Location Application

Commerce and support:
- PR-Attached Commerce Offer
- Feedback Questionnaire
- Operator Support

Study / messaging:
- Study Sprint
```

Explicit non-goals:

- Do not add every UI label.
- Do not define implementation flags or command-boundary terms in PRD vocabulary.
- Do not force one global definition when the term is intentionally context-relative.

Verification:

```text
rg -n "Form Mode|Dummy PR|Join Gate|Meeting-Point Guidance|Feedback Questionnaire|Study Sprint|Pairing Code|Current Creator|POI Location Application" docs/10-prd
```

Check that each term has a context owner, not just a definition.

### PRD-3: Scope And Capabilities Compression

Covers:

```text
F2-002
```

Related:

```text
F2-007, but only where it overlaps F2-002.
```

Target files:

```text
docs/10-prd/behavior/scope.md
docs/10-prd/behavior/capabilities.md
```

Reference files:

```text
docs/10-prd/behavior/workflows.md
docs/10-prd/behavior/rules-and-invariants.md
```

Objective:

Make `scope.md` a boundary document and `capabilities.md` a surface map.

Mutation style:

- Remove row-level IA from scope when another PRD owner preserves the behavior.
- Keep in-scope/out-of-scope product boundaries explicit.
- Compress capability bullets that duplicate workflow steps or rules.
- Do not delete behavior simply because it is detailed; move or retain it under the right PRD owner.

Verification:

```text
rg -n "facts-card|participant roster|participant profile|venue images|/pr/:id/messages|message notifications|meeting-point guidance" docs/10-prd/behavior
```

Removed scope/capability details must still exist in workflow/rule owners if they remain product truth.

### PRD-4: Workflow Decomposition

Covers:

```text
F2-004
```

Target files:

```text
docs/10-prd/behavior/workflows.md
```

Possible new files, if PRD-0 approves split:

```text
docs/10-prd/behavior/workflows/core-pr.md
docs/10-prd/behavior/workflows/event-context.md
docs/10-prd/behavior/workflows/commerce-and-support.md
docs/10-prd/behavior/workflows/messaging-reliability-and-study.md
```

Objective:

Split overloaded workflows by user context, not by current route implementation.

Recommended owner split:

- Core PR lifecycle: create, join, revisit, share.
- Event context: anchor event entry, Form Mode, dummy PR materialization, event search/list/card, event-assisted creation, POI application.
- Commerce and support: PR-attached commerce ordering, support and feedback loops.
- Messaging, reliability, and study: non-realtime PR messaging, reliability loop, Study Sprint.

Verification:

```text
rg -n "Enter PR Through Anchor Event Browsing And Search|Submit And Review A POI Location Application|Order A PR-Attached Commerce Offer|Study Sprint Pomodoro|Reliability Loop|Support, Feedback" docs tasks/doc-governance-cleanup
```

Old heading references must be updated or routed through a stable workflow index.

### PRD-5: Rules Language Layering

Covers:

```text
F2-003
```

Target files:

```text
docs/10-prd/behavior/rules-and-invariants.md
```

Supporting evidence:

```text
docs/20-product-tdd/cross-unit-contracts.md
docs/20-product-tdd/system-state-and-authority.md
docs/20-product-tdd/ecommerce-contracts.md
```

Objective:

Keep user-visible product rules in PRD while preventing backend/frontend mechanism language from accumulating there.

Mutation style:

- Rephrase product authority as product authority, for example `system-owned`, `event-assisted`, or `creation flow assigns`.
- Preserve user-result rules such as recommendation ordering, creation gates, visible state, quote trust, unpaid-order blocking, and participant-visible guidance.
- Do not remove technical authority facts unless Product TDD already owns them.
- If Product TDD ownership is unclear, leave the PRD line unchanged and record a future Product TDD follow-up without creating that follow-up batch now.

Verification:

```text
rg -n "backend|frontend|command|write path|module|boundary|authored|assigns|injects" docs/10-prd/behavior/rules-and-invariants.md docs/20-product-tdd
```

Each technical-language removal must either be rephrased as product authority or already be preserved in Product TDD.

## Recommended Execution Order

1. PRD-0 Topology Decision And Reference Strategy.
2. PRD-1 Claim Orthogonality Audit.
3. PRD-2 Context-Scoped Vocabulary Model.
4. PRD-3 Scope And Capabilities Compression.
5. PRD-4 Workflow Decomposition.
6. PRD-5 Rules Language Layering.

Reason:

- Topology must be decided before content is moved.
- Claim axes determine whether new behavior is a new thesis, a subclaim, or only a capability realization.
- Vocabulary should be scoped after the topological owner model is known.
- Scope/capability compression is safer once claims and vocabulary are stable.
- Workflow decomposition reduces file pressure before detailed rule language work.
- Rules language depends on Product TDD owner evidence, but Product TDD cleanup remains deferred.

## Batch-Level Invariants

- Do not change product behavior.
- Do not flatten contextual terms into a global dictionary.
- Do not add claims before checking orthogonality.
- Do not preserve the current flat PRD shape merely to minimize file count.
- Do not remove product truth unless another PRD owner retains it.
- Do not move technical authority facts out of PRD until Product TDD ownership is explicit.
- Do not edit Product TDD files in Batch 3.
- Keep `_drivers/*` upstream and unchanged unless a product thesis actually changes.
- Keep `domain-structure/*` derived; do not let it redefine claims.

## Open Human Decisions

Resolved during execution:

1. Batch 3 introduced `docs/10-prd/vocabulary/`; `glossary.md` now owns universal vocabulary plus routing.
2. Claims were rewritten before workflow split so the product thesis axes governed later decomposition.
3. Bounded fulfillment/support was not promoted to Claim 6. It remains a support capability under Claim 4's collaboration completion loop.
4. Rules were not split into `behavior/rules/*` in Batch 3. The batch only rephrased PRD technical mechanism language into product authority language.

## Execution Record

Executed durable changes:

- `docs/10-prd/index.md` now routes readers to scoped vocabulary and workflow subfiles.
- `docs/10-prd/glossary.md` now owns universal vocabulary only and links to scoped vocabulary files.
- `docs/10-prd/vocabulary/collaboration.md`, `event-context.md`, `commerce-and-support.md`, and `operations.md` define context-scoped terms.
- `docs/10-prd/behavior/claims.md` now includes a Claim Axis Map and keeps five orthogonal claims.
- `docs/10-prd/behavior/scope.md` and `capabilities.md` were compressed so detailed IA and workflow steps stay with workflow/rule owners.
- `docs/10-prd/behavior/workflows.md` became a workflow router and detailed workflows moved into `behavior/workflows/*`.
- `docs/10-prd/behavior/rules-and-invariants.md` rephrased backend/frontend mechanism language into product authority language where Product TDD already owns the mechanism.
- `docs/10-prd/domain-structure/cross-domain-interactions.md` now uses event-assisted create language.

Deferred follow-up:

- `docs/20-product-tdd/claim-realization-matrix.md` still uses pre-Batch-3 claim wording and should be updated in a later Product TDD batch.
