# Batch 2 Proposal: Root AGENTS.md Bootstrap Slimming

## Scope

This batch addresses a new Phase 1 finding:

```text
F1-007: Root AGENTS.md duplicates meta/alignment governance detail.
```

This is a proposal file only. No additional durable docs have been modified for this batch.

Execution status:

```text
Executed after human approval.
```

## Objective

Reduce root `AGENTS.md` into a bootstrap router for agents while preserving the rules that must be visible immediately at repo entry.

The goal is not to make `AGENTS.md` tiny. The goal is to keep it executable.

Updated direction after human review:

```text
Bootstrap Workflow should not be expanded in root AGENTS.md.
Move workflow detail into docs/00-meta/.
Keep root AGENTS.md as a thin dispatch table plus hard execution references.
Use progressive disclosure for typed input, mode, task packet, search, Impact Handshake, and negotiation rules.
```

## Current State

Root `AGENTS.md` currently has 122 lines.

High-level shape:

```text
1-3    identity
5-16   repository layout
18-22  technical overview
24-36  documentation routing
38-50  operating model
52-57  typed input guide
59-70  mode guide
72-78  task packet guidance
80-83  search guidance
85-89  impact handshake pointer
91-98  negotiation triggers
100-116 development workflow
118-122 coding guidelines
```

The most duplicated region is:

```text
38-98 operating model and governance explanation
```

Durable detail already exists in:

- `docs/00-meta/concepts.md`
- `docs/00-meta/input-*.md`
- `docs/00-meta/mode-*.md`
- `docs/15-alignment/README.md`

## Proposed Owner Decision

### Root `AGENTS.md`

Should own:

- repo identity and one-line mission
- durable documentation routing
- dispatch table for which durable doc to read
- hard repo-level execution rules
- canonical dev/test/check commands
- coding guardrails that must apply everywhere
- pointer to local `AGENTS.md` rule

Should not own detailed explanations of:

- every input type
- every mode
- task packet lifecycle
- source search theory
- alignment primitives
- Impact Handshake field details
- promotion theory
- negotiation protocol details

### `docs/00-meta/`

Should own detailed explanations for:

- bootstrap workflow
- input routes
- modes
- task packet expectations
- source search defaults
- promotion rules
- future documentation governance rules

### `docs/15-alignment/`

Should own detailed explanations for:

- alignment loading rule
- Impact Handshake details
- negotiation / pause protocol for risky mutation
- coordination primitives
- operation vocabulary and verification contracts

## Proposed Durable Mutation

Operation:

```text
split + clarify
```

State diff:

```text
From:
AGENTS.md contains both bootstrap instructions and condensed explanations of 00-meta / 15-alignment concepts.

To:
AGENTS.md becomes a thin dispatch table and hard-rule manifest. Workflow detail moves to docs/00-meta/, and risky-mutation coordination remains in docs/15-alignment/.
```

## Recommended Rewrite Shape

### Keep Mostly As-Is

```text
# title and one-line mission
Repository Layout
Technical Overview
Development Workflow
Coding Guidelines
```

Rationale:

- These are fast repo-entry facts or hard execution rules.
- `Development Workflow` contains commands and repo-specific operational constraints that agents need without extra navigation.
- `Coding Guidelines` is short and global.

### Compress

#### `Documentation`

Current role:

- lists all doc layers
- includes task packet control-surface detail

Recommended shape:

```markdown
## Documentation Routing

- `docs/00-meta/`: input routes, modes, task packets, search defaults, and promotion rules.
- `docs/10-prd/`: product intent, workflows, rules, scope, and business vocabulary.
- `docs/15-alignment/`: opt-in coordination substrate for risky or reference-sensitive mutation.
- `docs/20-product-tdd/`: cross-unit technical realization and authority boundaries.
- `docs/30-unit-tdd/`: optional hard-unit technical truth.
- `docs/40-deployment/`: runtime, rollout, observability, and recovery truth.
- `tasks/`: volatile task packets and evidence.
- nearest `AGENTS.md`: additive local constraints before edits in that subtree.
```

#### `Operating Model` / `Bootstrap Workflow`

Current role:

- contains 11 steps plus detailed sub-guides

Recommended action:

```text
move workflow detail to docs/00-meta/
replace root section with a dispatch table
```

Candidate durable owner:

```text
docs/00-meta/bootstrap-workflow.md
```

Alternative:

```text
docs/00-meta/concepts.md plus existing input/mode docs
```

Recommendation:

```text
create docs/00-meta/bootstrap-workflow.md
```

Reason:

- `concepts.md` is intentionally short.
- input/mode docs each own a slice, but no single doc owns the repo-entry workflow.
- A dedicated bootstrap workflow doc provides the progressive-disclosure target that root can link to.

Root replacement shape:

```markdown
## Work Routing

- Product intent change: `docs/00-meta/input-intent.md` -> `docs/10-prd/`.
- Technical constraint change: `docs/00-meta/input-constraint.md` -> `docs/20-product-tdd/` or `docs/30-unit-tdd/`.
- Runtime mismatch: `docs/00-meta/input-reality.md` -> task packet evidence first.
- Bounded artifact: `docs/00-meta/input-artifact.md` -> task-local artifact unless reuse is proven.
- Non-trivial work: keep a task packet under `tasks/`.
- Risky references, weak evidence, or non-local blast radius: `docs/15-alignment/README.md`.
- Subtree edits: nearest local `AGENTS.md` is additive and must be checked.
```

#### `Typed Input Guide`

Recommended action:

```text
remove from root as a separate section
```

Replacement:

```text
Bootstrap workflow step links to docs/00-meta/input-*.md.
```

Rationale:

- The four input route files already own the detailed meaning.
- Keeping a mini glossary in root risks drift.

#### `Mode Guide`

Recommended action:

```text
remove from root as a separate section
```

Replacement:

```text
root Work Routing links to docs/00-meta/bootstrap-workflow.md or docs/00-meta/mode-*.md when needed.
```

Rationale:

- The four mode SOPs already own the details.
- The important root rule is that mode does not override durable ownership.

#### `Task packet guidance`

Recommended action:

```text
keep only the trigger in root Work Routing; move lifecycle detail to docs/00-meta/bootstrap-workflow.md
```

Suggested wording:

```markdown
For non-trivial work, keep a compact task packet with Objective & Hypothesis, Guardrails Touched, and Verification.
```

Rationale:

- Root should preserve the minimum packet shape because agents need it immediately.
- Full lifecycle belongs in `docs/00-meta/` and task-local control files.

#### `Search guidance`

Recommended action:

```text
keep only a hard search-default sentence in root, or move entirely to docs/00-meta/bootstrap-workflow.md if root Work Routing links there
```

Suggested wording:

```markdown
When searching source or durable docs, exclude `tasks/`, generated output, dependencies, virtual environments, and caches unless the task explicitly targets them.
```

Rationale:

- This is an important immediate rule, but it is also part of bootstrap workflow.
- Detailed rationale belongs in `docs/00-meta/concepts.md`.

#### `Impact Handshake`

Recommended action:

```text
remove as a standalone root subsection; preserve as a Work Routing trigger that links to docs/15-alignment/README.md
```

Rationale:

- Batch 1 already moved detailed fields to `docs/15-alignment/README.md`.
- The root trigger remains valuable.

#### `Negotiation Triggers`

Recommended action:

```text
move details to docs/15-alignment/README.md; root keeps only the trigger to pause and enter alignment when conflict, unclear ownership, or weak evidence appears
```

Rationale:

- These are hard collaboration gates.
- They belong with risky coordination protocol.
- Root should expose the trigger, not the detailed policy.

## Proposed Final Root Shape

Target structure:

```text
# AGENTS.md of PartnerUp MVP Hypothesis-A
one-line mission

## Repository Layout
## Technical Overview
## Documentation Routing
## Work Routing
## Development Workflow
## Coding Guidelines
```

Expected size:

```text
about 60-80 lines
```

This would reduce explanation density without hiding immediate repo rules.

## Impact Handshake

### Address And Object

Durable mutation target:

```text
AGENTS.md
```

Supporting mutation:

```text
docs/00-meta/bootstrap-workflow.md
docs/15-alignment/README.md
```

Potential supporting mutation:

```text
docs/00-meta/concepts.md
```

Only needed if the new bootstrap workflow concept needs a short concept entry.

### State Diff

```text
From:
Root AGENTS.md contains bootstrap rules plus condensed meta/alignment explanations.

To:
Root AGENTS.md contains dispatch references and immediate hard rules, while bootstrap workflow detail moves to docs/00-meta/ and risky coordination detail stays in docs/15-alignment/.
```

### Blast Radius Forecast

Affected readers:

- future agents entering the repo
- humans inspecting repo-level workflow
- documentation cleanup process

Affected docs:

- `AGENTS.md`
- `docs/00-meta/bootstrap-workflow.md`
- `docs/15-alignment/README.md`
- possibly `docs/00-meta/concepts.md` if a missing concept needs a durable owner

Not affected:

- product intent
- technical contracts
- runtime/deployment truth
- local subtree rules
- commands and verification entrypoints

### Invariants

- Root `AGENTS.md` must remain immediately executable.
- Root must still tell agents to read nearest local `AGENTS.md` before subtree edits.
- Root must still require task packets for non-trivial work.
- Root must still route source-search defaults to `docs/00-meta/`.
- Root must still point risky mutation, unclear ownership, weak evidence, or conflict to alignment.
- No product, technical, or runtime meaning changes.

### Verification

After mutation:

```text
rg -n "input-\\*|mode-\\*|Task Packet|Source Search Defaults|Impact Handshake|local `AGENTS.md`|dev:ensure|check:static|test:unit" AGENTS.md docs/00-meta docs/15-alignment
```

Manual checks:

- root has a clear dispatch table
- no detailed input/mode glossary remains duplicated in root
- development workflow commands remain intact
- negotiation/pause conditions still exist in `docs/15-alignment/README.md`
- local `AGENTS.md` rule remains visible

## Recommendation

Proceed with a small meta-governance rewrite:

```text
Replace AGENTS.md lines 24-98 with:
- Documentation Routing
- Work Routing

Add:
- docs/00-meta/bootstrap-workflow.md

Extend:
- docs/15-alignment/README.md with pause/negotiation triggers currently in root
```

Do not change `Development Workflow` or `Coding Guidelines` in this batch.

## Open Decisions For Human

1. Should `Negotiation Triggers` remain in root as a hard gate, or move to `docs/00-meta/` with only a root pointer?

Recommendation: move details to `docs/15-alignment/README.md`; keep only the root trigger.

2. Should root keep one-line definitions of `Intent`, `Constraint`, `Reality`, and `Artifact`?

Recommendation: no. Link to `docs/00-meta/input-*.md` and avoid drift.

3. Should root keep one-line definitions of `Explore`, `Solidify`, `Execute`, and `Diagnose`?

Recommendation: no. Link to `docs/00-meta/mode-*.md` and keep only the rule that mode does not override durable ownership.

4. Should Bootstrap Workflow live inside root, Development Workflow, or `docs/00-meta/`?

Recommendation: move it to `docs/00-meta/bootstrap-workflow.md`. `Development Workflow` should remain focused on commands, services, checks, tests, and repo execution mechanics.

Decision:

```text
Use progressive disclosure.
Move Bootstrap Workflow to docs/00-meta/bootstrap-workflow.md.
Move negotiation/pause details to docs/15-alignment/README.md.
Keep root AGENTS.md as dispatch references plus hard execution rules.
```

## Execution Notes

- `AGENTS.md` now has `Documentation Routing` and `Work Routing` instead of expanded input, mode, task packet, search, Impact Handshake, and negotiation sections.
- `docs/00-meta/bootstrap-workflow.md` now owns the repo-entry workflow for non-trivial work.
- `docs/00-meta/concepts.md` now defines `Bootstrap Workflow`.
- `docs/15-alignment/README.md` now owns `Pause Conditions`.
- `Development Workflow` and `Coding Guidelines` in root `AGENTS.md` were left intact.

## Executed Verification

Commands:

```text
wc -l AGENTS.md docs/00-meta/bootstrap-workflow.md docs/00-meta/concepts.md docs/15-alignment/README.md
rg -n 'Typed Input Guide|Mode Guide|Task packet guidance|Search guidance|Negotiation Triggers' AGENTS.md || true
rg -n 'Bootstrap Workflow|Work Routing|Pause Conditions|Impact Handshake|Source Search Defaults|Promotion|nearest local `AGENTS.md`|dev:ensure|check:static|test:unit' AGENTS.md docs/00-meta docs/15-alignment
```

Results:

```text
AGENTS.md reduced from 122 lines to 68 lines.
No old expanded root sections remained for Typed Input Guide, Mode Guide, task packet guidance, search guidance, or Negotiation Triggers.
Work Routing remained visible in root AGENTS.md.
Bootstrap Workflow, Source Search Defaults, and Promotion remained available under docs/00-meta/.
Impact Handshake and Pause Conditions remained available under docs/15-alignment/README.md.
Development Workflow commands remained visible in root AGENTS.md.
```
