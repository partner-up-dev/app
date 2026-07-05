# Batch 6: Local AGENTS Critical Cleanup Plan And Execution Record

## Scope

This record covers local AGENTS findings from [Phase 4B](./phase-04-local-agents-audit.md):

- F4A-001: backend and frontend root AGENTS still repeat general documentation routing blocks
- F4A-002: Unit TDD path reference stale in app-level AGENTS
- F4A-003: Event UI AGENTS carries product / cross-unit Form Mode truth
- F4A-005: Shared UI AGENTS is a large primitive catalog with external package coupling
- F4A-006: Styles AGENTS is large and should be separated from package-specific design-web guidance

F4A-002 was already resolved in Batch 5 by changing app-level references to the current Unit TDD flat-file convention:

```text
docs/30-unit-tdd/<unit>/*.md
  -> docs/30-unit-tdd/<unit>.md
```

Batch 6 should preserve that result and not reopen Unit TDD topology.

## Objective

Slim local AGENTS so they return to their intended role:

- immediate edit-time constraints
- local hazard pointers
- routing to durable owners

Durable local design memory should now live in Unit TDD where Batch 5 created the missing owners. Product / cross-unit contracts should remain in Product TDD. Package-specific `@partner-up-dev/design-web` API guidance should stay with the design-web Intent skill or package docs.

## Proposed Segments

### Segment 1: App-Level AGENTS Slimming

Findings covered:

- F4A-001
- F4A-002 confirmation only

Files:

- `apps/backend/AGENTS.md`
- `apps/frontend/AGENTS.md`

Durable changes:

- Keep app-specific operational guidance: stack, architecture summary, local commands, local constraints, and package-local entrypoints.
- Remove or shorten repeated generic documentation routing now owned by root `AGENTS.md` and `docs/00-meta/bootstrap-workflow.md`.
- Keep the corrected Unit TDD pointer format from Batch 5: `docs/30-unit-tdd/<unit>.md`.
- Remove duplicated "Product And Runtime Truth Sources" blocks if they only repeat root routing.
- In frontend root AGENTS, remove the repeated shared UI primitive catalog and replace it with pointers:
  - `src/AGENTS.components.md`
  - `src/AGENTS.styles.md` or the chosen style location
  - `docs/30-unit-tdd/frontend-shared-ui-primitives.md`
  - `@partner-up-dev/design-web#design-web` when package component selection or API details matter

State diff:

```text
app AGENTS repeat general doc routing and shared primitive catalog
  -> app AGENTS point to root routing plus app-local durable owners
```

### Segment 2: Event UI AGENTS Contract Extraction

Finding covered:

- F4A-003

Files:

- `apps/frontend/src/domains/event/ui/AGENTS.md`
- `docs/30-unit-tdd/frontend-event-form-mode.md`
- `docs/20-product-tdd/event-context-contracts.md`

Durable changes:

- Slim Event UI AGENTS to local edit-time constraints only.
- Replace detailed Form Mode topology and recommendation semantics with pointers:
  - Product / cross-unit semantics: `docs/20-product-tdd/event-context-contracts.md`
  - frontend-local route-level choreography: `docs/30-unit-tdd/frontend-event-form-mode.md`
  - PR preview identity boundary: `apps/frontend/src/domains/pr/ui/AGENTS.md`
- Keep short local hazards:
  - event UI owns event-domain UI surfaces, controls, composites, and primitives
  - `AnchorEventFormModeSurface.vue` owns route-level Form Mode flow
  - controls emit committed values through narrow contracts
  - do not duplicate canonical PR facts in event UI

State diff:

```text
Event UI AGENTS carries full Form Mode durable truth
  -> Event UI AGENTS is a pointer-first local hazard file
```

### Segment 3: Shared UI AGENTS And Design-Web Boundary

Finding covered:

- F4A-005

Files:

- `apps/frontend/src/shared/ui/AGENTS.md`
- `apps/frontend/src/AGENTS.components.md`
- `docs/30-unit-tdd/frontend-shared-ui-primitives.md`

Durable changes:

- Keep `apps/frontend/src/shared/ui/AGENTS.md` as a concise local primitive pointer.
- Remove detailed package component catalog where it repeats `@partner-up-dev/design-web#design-web`.
- Keep app-local shared primitive criteria and extension hazard summary.
- Point to:
  - `docs/30-unit-tdd/frontend-shared-ui-primitives.md` for durable app-local primitive ownership
  - `@partner-up-dev/design-web#design-web` for package component selection, props, slots, events, imports, and caveats
  - `apps/frontend/src/AGENTS.components.md` for broader frontend component ownership
- Keep app-owned primitives that are not design-web package API, such as product-local date calendar or page footer, only if the local AGENTS file remains concise.

State diff:

```text
Shared UI AGENTS is a package-coupled primitive catalog
  -> Shared UI AGENTS is app-local ownership and hazard routing
```

### Segment 4: Styles AGENTS Relocation And Compression

Finding covered:

- F4A-006

Files:

- `apps/frontend/src/styles/AGENTS.md`
- proposed `apps/frontend/src/AGENTS.styles.md`
- `apps/frontend/src/AGENTS.components.md`
- `apps/frontend/AGENTS.md`

User direction:

- delete content that duplicates `@partner-up-dev/design-web`
- move durable frontend styling guidance to `apps/frontend/src/AGENTS.styles.md`
- if the remaining content is sufficiently compact, consider merging it into `apps/frontend/src/AGENTS.components.md`

Recommended decision for Batch 6:

- Create `apps/frontend/src/AGENTS.styles.md` as the style guidance entrypoint.
- Delete `apps/frontend/src/styles/AGENTS.md` or reduce it to a one-line pointer only if subtree-local discovery still needs a nearest `AGENTS.md` under `src/styles/`.
- Do not merge into `AGENTS.components.md` in the same batch unless the compressed style guidance becomes small enough to fit as a short section without weakening component guidance.

Reason:

- Style governance is related to components but not identical to component ownership.
- The current style guidance includes token layers, escalation rules, local exceptions, and lint guardrails. That is still a coherent style owner after removing design-web overlap.
- A separate `AGENTS.styles.md` keeps frontend root pointers explicit and avoids making `AGENTS.components.md` a mixed component/style manual.

Content to remove or route away:

- design-web component examples such as `PuButton`, `PuCard`, form primitives, and package component treatment details
- package shape, tone, variant, or component API guidance that belongs to `@partner-up-dev/design-web#design-web`

Content to keep in style guidance:

- `ref` / `sys` / `dcs` ownership model
- `sys`-first default rule
- when `dcs` is allowed
- local landing and splash exceptions
- component-private CSS custom property boundary
- token lint commands and baseline rule
- pointer to design-web skill for package visual foundation / variant / shape decisions

Possible state diff:

```text
apps/frontend/src/styles/AGENTS.md
  -> apps/frontend/src/AGENTS.styles.md

or, if kept for nearest-folder discovery:

apps/frontend/src/styles/AGENTS.md
  -> one-line pointer to ../AGENTS.styles.md
```

Merge threshold:

- Merge style guidance into `apps/frontend/src/AGENTS.components.md` only if the compressed content is around 20 lines or less and contains no standalone style-governance sections.
- If it still needs headings for ownership model, exceptions, and guardrails, keep `AGENTS.styles.md` separate.

## Out Of Scope

- Changing root `AGENTS.md`.
- Changing Unit TDD topology.
- Rewriting Product TDD event-context contracts.
- Changing source code, component implementations, tokens, or design-web package files.
- Cleaning backend layer AGENTS not covered by F4A-001.
- Touching `.github/workflows/AGENTS.md`, which Phase 4B found healthy.

## Impact Handshake

Address and Object:

- app-level local guidance:
  - `apps/backend/AGENTS.md`
  - `apps/frontend/AGENTS.md`
- frontend local UI guidance:
  - `apps/frontend/src/domains/event/ui/AGENTS.md`
  - `apps/frontend/src/shared/ui/AGENTS.md`
  - `apps/frontend/src/AGENTS.components.md`
  - `apps/frontend/src/styles/AGENTS.md`
  - optional `apps/frontend/src/AGENTS.styles.md`
- durable owners used as anchors:
  - `docs/30-unit-tdd/frontend-event-form-mode.md`
  - `docs/30-unit-tdd/frontend-shared-ui-primitives.md`
  - `docs/20-product-tdd/event-context-contracts.md`

State Diff:

```text
local AGENTS contain repeated routing, durable local design memory, and package-specific guidance
  -> local AGENTS become concise edit-time routing and hazard files

style guidance mixed with design-web examples in src/styles/AGENTS.md
  -> app-local style governance lives in src/AGENTS.styles.md or is compactly merged into components guidance
```

Blast Radius Forecast:

- Medium documentation blast radius.
- No runtime behavior or source code behavior changes.
- Main risk is removing too much local guardrail text and making edit-time discovery worse.

Invariants:

- Local AGENTS remain additive local constraints.
- Root `AGENTS.md` remains the global routing entrypoint.
- Product TDD remains owner for cross-unit contracts.
- Unit TDD remains owner for hard local design memory created in Batch 5.
- design-web skill remains owner for package component API and caveats.
- Backend and frontend root AGENTS remain operationally useful.

Verification:

```bash
find apps .github -name AGENTS.md -not -path '*/node_modules/*' -print0 | xargs -0 wc -l | sort -n
rg -n 'docs/30-unit-tdd/<unit>/*\\.md|docs/30-unit-tdd/<unit>/\\*\\.md' apps -g 'AGENTS*.md'
rg -n 'Form Mode|matchedRecommendation|orderedCandidates|auto-create|route-pool|PuButton|PuCard|PuForm|PuModal|PuDrawer|design-web' apps/frontend -g 'AGENTS*.md'
rg -n 'frontend-event-form-mode|frontend-shared-ui-primitives|AGENTS.styles|design-web#design-web|event-context-contracts' apps/frontend docs/30-unit-tdd tasks/doc-governance-cleanup -g '*.md'
git diff --check -- apps/backend/AGENTS.md apps/frontend tasks/doc-governance-cleanup
```

Manual review:

- confirm Event UI AGENTS still has enough immediate local hazards after slimming
- confirm shared UI AGENTS no longer acts as a design-web component manual
- confirm style guidance does not duplicate design-web package rules
- confirm frontend root AGENTS points to the new style guidance location
- confirm Batch 5 Unit TDD docs are used as durable owner links

## Proposed Execution Order

1. Slim app-level backend/frontend AGENTS repeated routing blocks while preserving app-specific commands and local entrypoints.
2. Slim Event UI AGENTS to pointers plus immediate local hazards.
3. Slim Shared UI AGENTS to app-local primitive criteria and Unit TDD / design-web skill pointers.
4. Move and compress style guidance into `apps/frontend/src/AGENTS.styles.md`; decide whether `src/styles/AGENTS.md` should be deleted or kept as a one-line pointer.
5. Update frontend root and component guidance references to the chosen style location.
6. Run verification and update Phase 4B / Batch 6 execution records.

## Executed Decisions

1. Batch 6 executed all four segments together.
2. `apps/frontend/src/AGENTS.styles.md` was created as the style guidance entrypoint.
3. `apps/frontend/src/styles/AGENTS.md` was kept as a one-line pointer to preserve nearest-folder discovery.
4. Style guidance was not merged into `apps/frontend/src/AGENTS.components.md` because the compressed content still has standalone ownership, exception, and guardrail sections.

## Execution Record

Durable docs changed:

- `apps/backend/AGENTS.md`
- `apps/frontend/AGENTS.md`
- `apps/frontend/src/AGENTS.components.md`
- `apps/frontend/src/AGENTS.styles.md`
- `apps/frontend/src/styles/AGENTS.md`
- `apps/frontend/src/domains/event/ui/AGENTS.md`
- `apps/frontend/src/shared/ui/AGENTS.md`

Task-local docs changed:

- `tasks/doc-governance-cleanup/README.md`
- `tasks/doc-governance-cleanup/batch-06-local-agents-critical-cleanup-plan.md`
- `tasks/doc-governance-cleanup/phase-04-local-agents-audit.md`

Notes:

- `@partner-up-dev/design-web#design-web` was loaded before executing the shared UI and style-guidance changes.
- F4A-002 remained closed from Batch 5 and was not reopened.
- `apps/frontend/src/styles/AGENTS.md` now points to `../AGENTS.styles.md`; app-local style governance moved to `apps/frontend/src/AGENTS.styles.md`.

Verification run:

```bash
find apps .github -name AGENTS.md -not -path '*/node_modules/*' -print0 | xargs -0 wc -l | sort -n
rg -n 'docs/30-unit-tdd/<unit>/*\\.md|docs/30-unit-tdd/<unit>/\\*\\.md' apps -g 'AGENTS*.md'
rg -n 'Form Mode|matchedRecommendation|orderedCandidates|auto-create|route-pool|PuButton|PuCard|PuForm|PuModal|PuDrawer|design-web' apps/frontend -g 'AGENTS*.md'
rg -n 'frontend-event-form-mode|frontend-shared-ui-primitives|AGENTS.styles|design-web#design-web|event-context-contracts' apps/frontend docs/30-unit-tdd tasks/doc-governance-cleanup -g '*.md'
git diff --check -- apps/backend/AGENTS.md apps/frontend tasks/doc-governance-cleanup
```
