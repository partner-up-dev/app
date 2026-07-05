# Batch 5: Unit TDD Content Recovery Plan And Execution Record

## Scope

This record supersedes both earlier Batch 5 drafts.

Corrected premise:

- the current flat Unit TDD layout is not the core problem
- the core problem is that several hard local units likely lack Unit TDD docs
- topology should be decided after content is recovered, not before
- flat layout can remain the working layout until evidence shows it no longer scales

This record covers the key Unit TDD findings from [Phase 4A](./phase-04-unit-tdd-audit.md) and uses local AGENTS evidence from [Phase 4B](./phase-04-local-agents-audit.md).

## Objective

Recover missing Unit TDD content first.

This batch should:

- add explicit Unit TDD creation triggers and non-triggers
- create the first high-signal missing Unit TDD docs
- keep existing WeChat OAuth handoff as a valid Unit TDD doc
- align app-level AGENTS references with the currently active flat file layout
- defer tree layout until there is enough Unit TDD content to justify it
- avoid broad backend/frontend package manuals

## Working Topology

Keep the current flat layout for this batch:

```text
docs/30-unit-tdd/
|-- index.md
|-- wechat-oauth-handoff.md
|-- frontend-event-form-mode.md
|-- frontend-shared-ui-primitives.md
`-- backend-migration-ledger.md
```

This is a working topology, not a permanent architecture decision.

Tree layout should be reconsidered when at least one of these becomes true:

- a unit needs multiple files or supporting assets
- several Unit TDD files grow large enough that index navigation becomes weak
- unit families emerge and flat names become awkward or ambiguous
- local AGENTS pointers become harder to keep precise with flat filenames

## Proposed Segments

### Segment 1: Unit TDD Creation Rules

Findings covered:

- F4U-003
- F4U-004

Durable changes:

- Add `When To Create A Unit TDD Doc` to `docs/30-unit-tdd/index.md`.
- Add explicit non-triggers to prevent broad backend/frontend manuals.
- Add a candidate backlog table so missing hard units are visible without requiring immediate promotion.
- Add a topology note: start flat, reconsider tree when the recovered content proves it needs more structure.

Creation triggers:

- a local unit has multi-file choreography with failure semantics
- sequencing constraints are hard to rediscover from code
- state authority is local but too detailed for Product TDD
- the same local hazard is starting to repeat across nearby AGENTS files
- verification expectations are costly or non-obvious enough to preserve
- local AGENTS content is becoming durable design memory rather than edit-time warning

Non-triggers:

- broad backend or frontend package guidance
- ordinary folder conventions already covered by local AGENTS
- product behavior that belongs in PRD
- cross-unit contracts that belong in Product TDD
- runtime and rollout truth that belongs in deployment docs
- package API usage that is better owned by package docs or an Intent skill

### Segment 2: Recover First Missing Unit TDD Owners

Recommended first set:

| Candidate Unit | Proposed Path | Why Unit TDD, Not Product TDD Or AGENTS |
| --- | --- | --- |
| Frontend Event Form Mode | `docs/30-unit-tdd/frontend-event-form-mode.md` | Product TDD owns Form Mode cross-unit contract; the frontend route-level selection/recommendation/handoff state machine, local component state boundaries, and no-match interaction choreography are hard local implementation memory currently overloaded into `apps/frontend/src/domains/event/ui/AGENTS.md`. |
| Frontend Shared UI Primitives | `docs/30-unit-tdd/frontend-shared-ui-primitives.md` | `apps/frontend/src/shared/ui/AGENTS.md` is acting as a large durable primitive catalog. Unit TDD can own app-specific primitive-selection policy and extension rules, while package-specific API details stay with `@partner-up-dev/design-web` docs / skill. |
| Backend Migration Ledger | `docs/30-unit-tdd/backend-migration-ledger.md` | Backend migration behavior has local ledger, prefix, transaction, environment, seed, and reset semantics spread across backend AGENTS and migration docs. This is local technical truth with costly failure modes, but not a Product TDD cross-unit contract. |

Candidate docs should be concise and structured like:

```text
# <Unit> Unit TDD

## Role
## Durable Inputs
## Local Invariants
## Failure / Drift Semantics
## Verification Expectations
## Local AGENTS Pointers To Keep
```

Important boundary:

- Do not copy full PRD/Product TDD claims into these docs.
- Each Unit TDD doc should name its upstream Product TDD owner where one exists, then focus on local design memory.
- If a candidate turns out to be mostly cross-unit truth, stop and route it back to Product TDD instead of forcing it into Unit TDD.

### Segment 3: Align References Without Broader AGENTS Slimming

Findings covered:

- F4U-001
- F4U-002
- F4A-002

Durable changes:

- Update app-level references:
  - `apps/backend/AGENTS.md`
  - `apps/frontend/AGENTS.md`

State diff:

```text
docs/30-unit-tdd/<unit>/*.md
  -> docs/30-unit-tdd/<unit>.md
```

Likely no durable change needed:

- `apps/backend/src/controllers/AGENTS.md`
- `apps/frontend/src/processes/wechat/AGENTS.md`

Reason:

- They already point to `docs/30-unit-tdd/wechat-oauth-handoff.md`.
- They are pointer-first and hazard-focused.

### Segment 4: Defer Local AGENTS Slimming Until Owners Exist

Likely later files:

- `apps/frontend/src/domains/event/ui/AGENTS.md`
- `apps/frontend/src/shared/ui/AGENTS.md`
- `apps/backend/data-migrations/AGENTS.md`
- `apps/backend/AGENTS.md`
- `apps/frontend/AGENTS.md`

Rule:

- local AGENTS should keep edit-time triggers, immediate hazards, and pointers.
- durable local topology, state-machine, and failure semantics should move to Unit TDD only after the corresponding Unit TDD owner exists.

## Out Of Scope

- Moving Unit TDD files into folders in this batch.
- Rewriting Product TDD contracts.
- Moving cross-unit Form Mode truth out of `docs/20-product-tdd/event-context-contracts.md`.
- Creating broad `backend/` or `frontend/` Unit TDD manuals.
- Expanding Unit TDD into a package API manual for `@partner-up-dev/design-web`.
- Cleaning every local AGENTS file in the same batch.

## Impact Handshake

Address and Object:

- `docs/30-unit-tdd/index.md`: Unit TDD creation rules, active docs, candidate backlog, topology re-evaluation note.
- optional new Unit TDD docs:
  - `docs/30-unit-tdd/frontend-event-form-mode.md`
  - `docs/30-unit-tdd/frontend-shared-ui-primitives.md`
  - `docs/30-unit-tdd/backend-migration-ledger.md`
- `apps/backend/AGENTS.md`: Unit TDD route pointer only.
- `apps/frontend/AGENTS.md`: Unit TDD route pointer only.

State Diff:

```text
Unit TDD sparse layer with one active file and no creation trigger list
  -> Unit TDD layer with explicit creation rules and first recovered hard-unit docs

app-level AGENTS imply folder-based Unit TDD references
  -> app-level AGENTS point to the current flat Unit TDD file convention

topology decision made before content recovery
  -> topology decision deferred until recovered content proves its shape
```

Blast Radius Forecast:

- Medium for documentation ownership.
- Low for runtime behavior: no product behavior, source code, or runtime command changes.
- Later local AGENTS slimming will have a separate review surface.

Invariants:

- Unit TDD remains optional and hard-unit-only.
- Unit TDD does not redefine PRD or Product TDD.
- Product TDD remains owner for cross-unit contracts.
- local AGENTS remain additive local constraints.
- no broad backend/frontend manual is created.
- WeChat OAuth handoff remains valid in its current path.

Verification:

```bash
rg -n 'docs/30-unit-tdd/<unit>/\\*\\.md|docs/30-unit-tdd/.+/index\\.md' AGENTS.md apps docs tasks/doc-governance-cleanup -g '*.md'
rg -n 'docs/30-unit-tdd/.+\\.md|frontend-event-form-mode|frontend-shared-ui-primitives|backend-migration-ledger|wechat-oauth-handoff' AGENTS.md apps docs/30-unit-tdd tasks/doc-governance-cleanup -g '*.md'
git diff --check -- docs/30-unit-tdd apps/backend/AGENTS.md apps/frontend/AGENTS.md tasks/doc-governance-cleanup
```

Manual review:

- confirm each new Unit TDD doc has a concrete local owner and verification expectation
- confirm no Product TDD cross-unit contract was duplicated into Unit TDD
- confirm local AGENTS slimming is not attempted before canonical Unit TDD owners exist
- confirm topology re-evaluation criteria are explicit but not prematurely executed

## Proposed Execution Order

1. Update `docs/30-unit-tdd/index.md` with creation triggers, non-triggers, candidate backlog, and topology re-evaluation criteria.
2. Create `frontend-event-form-mode.md` first because it is the clearest AGENTS-overload case.
3. Create `frontend-shared-ui-primitives.md` and `backend-migration-ledger.md` if the first doc confirms the pattern.
4. Update app-level AGENTS Unit TDD path references to the current flat convention.
5. Verify references and line ownership.
6. Defer local AGENTS slimming to the next batch after reviewing the recovered Unit TDD docs.

## Executed Decisions

1. Batch 5 recovered content first and deferred tree layout.
2. Segment 2 created all three recommended candidates:
   - `docs/30-unit-tdd/frontend-event-form-mode.md`
   - `docs/30-unit-tdd/frontend-shared-ui-primitives.md`
   - `docs/30-unit-tdd/backend-migration-ledger.md`
3. App-level AGENTS path alignment was included in Batch 5.
4. Local AGENTS slimming was deferred until after the recovered Unit TDD docs can be reviewed.

## Execution Record

Durable docs changed:

- `docs/30-unit-tdd/index.md`
- `docs/30-unit-tdd/frontend-event-form-mode.md`
- `docs/30-unit-tdd/frontend-shared-ui-primitives.md`
- `docs/30-unit-tdd/backend-migration-ledger.md`
- `apps/backend/AGENTS.md`
- `apps/frontend/AGENTS.md`

Task-local docs changed:

- `tasks/doc-governance-cleanup/README.md`
- `tasks/doc-governance-cleanup/batch-05-unit-tdd-critical-cleanup-plan.md`
- `tasks/doc-governance-cleanup/phase-04-unit-tdd-audit.md`
- `tasks/doc-governance-cleanup/phase-04-local-agents-audit.md`

Notes:

- The `@partner-up-dev/design-web#design-web` Intent skill was loaded before writing the shared UI primitives Unit TDD. The durable Unit TDD doc records app-local primitive ownership and points package API detail back to the skill instead of copying package-specific API material.
- `apps/backend/src/controllers/AGENTS.md` and `apps/frontend/src/processes/wechat/AGENTS.md` were inspected but not changed because they already point to `docs/30-unit-tdd/wechat-oauth-handoff.md`.

Verification run:

```bash
rg -n 'docs/30-unit-tdd/<unit>/\\*\\.md|docs/30-unit-tdd/.+/index\\.md' AGENTS.md apps docs tasks/doc-governance-cleanup -g '*.md'
rg -n 'docs/30-unit-tdd/.+\\.md|frontend-event-form-mode|frontend-shared-ui-primitives|backend-migration-ledger|wechat-oauth-handoff' AGENTS.md apps docs/30-unit-tdd tasks/doc-governance-cleanup -g '*.md'
wc -l docs/30-unit-tdd/*.md | sort -n
git diff --check -- docs/30-unit-tdd apps/backend/AGENTS.md apps/frontend/AGENTS.md tasks/doc-governance-cleanup
```
