# Phase 4B: Local AGENTS.md Audit

## Objective

Audit local `AGENTS.md` files together with the Unit TDD layer.

The local AGENTS question is:

- which files are useful edit-time guardrails?
- which files are duplicating durable Product TDD, Unit TDD, deployment, or frontend architecture docs?
- where should cleanup be split into later batches?

## Inventory

Local AGENTS files found:

```text
AGENTS.md
apps/backend/AGENTS.md
apps/backend/data-migrations/AGENTS.md
apps/backend/src/controllers/AGENTS.md
apps/backend/src/entities/AGENTS.md
apps/backend/src/repositories/AGENTS.md
apps/backend/src/services/AGENTS.md
apps/frontend/AGENTS.md
apps/frontend/src/app/AGENTS.md
apps/frontend/src/domains/AGENTS.md
apps/frontend/src/domains/event/ui/AGENTS.md
apps/frontend/src/domains/location/ui/AGENTS.md
apps/frontend/src/domains/pr/ui/AGENTS.md
apps/frontend/src/domains/route/ui/AGENTS.md
apps/frontend/src/domains/share/ui/AGENTS.md
apps/frontend/src/processes/wechat/AGENTS.md
apps/frontend/src/queries/AGENTS.md
apps/frontend/src/shared/ui/AGENTS.md
apps/frontend/src/shared/upload/AGENTS.md
apps/frontend/src/styles/AGENTS.md
.github/workflows/AGENTS.md
```

Length profile:

- smallest files: `apps/frontend/src/app/AGENTS.md`, `apps/frontend/src/domains/AGENTS.md`
- largest local files: `apps/backend/AGENTS.md`, `apps/frontend/AGENTS.md`, `apps/frontend/src/styles/AGENTS.md`, `apps/frontend/src/domains/event/ui/AGENTS.md`, `apps/frontend/src/shared/ui/AGENTS.md`

## Findings

### F4A-001: Backend And Frontend Root AGENTS Still Repeat Documentation Routing Blocks

Evidence:

- `apps/backend/AGENTS.md` and `apps/frontend/AGENTS.md` both contain "Documents" and "Product And Runtime Truth Sources" sections.
- Root `AGENTS.md` and `docs/00-meta/bootstrap-workflow.md` now own the general routing model after Batch 1 and Batch 2.

Why it matters:

- The repetition is smaller than the old root AGENTS problem, but it is still a drift surface.
- App-level AGENTS should stay operational and subtree-local.

Candidate cleanup:

- Keep only app-specific local doc pointers and commands.
- Replace generic product/runtime truth repetition with a short pointer to root `AGENTS.md` plus local additions.

### F4A-002: Unit TDD Path Reference Is Stale In App-Level AGENTS

Evidence:

- `apps/backend/AGENTS.md` and `apps/frontend/AGENTS.md` say `docs/30-unit-tdd/<unit>/*.md`.
- Current Unit TDD active file is `docs/30-unit-tdd/wechat-oauth-handoff.md`.

Why it matters:

- This overlaps F4U-001 and should be handled with that cleanup.

Candidate cleanup:

- Normalize the path reference once the Unit TDD layout decision is made.

### F4A-003: Event UI AGENTS Carries Product / Cross-Unit Form Mode Truth

Evidence:

- `apps/frontend/src/domains/event/ui/AGENTS.md` contains detailed Form Mode topology, recommendation semantics, auto-create rules, matched/no-match behavior, and event PR card action behavior.
- Batch 4 created `docs/20-product-tdd/event-context-contracts.md`, which now owns cross-unit Form Mode, dummy PR, event landing/search, POI application, and event-context telemetry contracts.

Why it matters:

- Some event UI guidance is local and useful, but durable product/contract semantics should not live primarily inside a UI subtree AGENTS file.
- Leaving both places active invites contradictions when Form Mode evolves.

Candidate cleanup:

- Move or confirm durable Form Mode contract truth in Product TDD.
- Slim `apps/frontend/src/domains/event/ui/AGENTS.md` to UI-local constraints:
  - which route-level surface owns local state
  - component boundaries
  - local interaction hazards
  - pointers to `event-context-contracts.md` for cross-unit semantics

### F4A-004: WeChat Process AGENTS Is Healthy But Should Stay Pointer-First

Evidence:

- `apps/frontend/src/processes/wechat/AGENTS.md` points to `docs/30-unit-tdd/wechat-oauth-handoff.md`.
- It carries concise local hazards: nonce-only, deferral, credentials include, URL cleanup for telemetry/share.

Why it matters:

- This is the intended AGENTS pattern: immediate edit-time hazards plus canonical Unit TDD owner.
- It should not grow into a second copy of the handoff sequence.

Candidate cleanup:

- No immediate durable cleanup required.
- Preserve as a model for other local AGENTS files.

### F4A-005: Shared UI AGENTS Is A Large Primitive Catalog With External Package Coupling

Evidence:

- `apps/frontend/src/shared/ui/AGENTS.md` lists many `@partner-up-dev/design-web` primitives and usage rules.
- `apps/frontend/AGENTS.md` repeats a shorter shared UI primitive list.
- The repository now has a local Intent skill for `@partner-up-dev/design-web`.

Why it matters:

- Some primitive selection guidance belongs close to `shared/ui`.
- Detailed package usage can drift if the package skill is canonical for component-specific caveats.

Candidate cleanup:

- Keep `shared/ui/AGENTS.md` as the local primitive index and app-specific reuse policy.
- Remove repeated primitive catalog detail from `apps/frontend/AGENTS.md`.
- For package-specific behavior, prefer the design-web skill or package docs rather than expanding AGENTS into a component manual.

### F4A-006: Styles AGENTS Is Large But Has A Clear Durable Local Owner

Evidence:

- `apps/frontend/src/styles/AGENTS.md` owns token governance, escalation rules, exceptions, and lint guardrails.
- It is referenced from frontend root AGENTS and component guidance.

Why it matters:

- This file is long, but it is not obviously misplaced.
- It is a local governance owner for styling decisions, not a duplicate of PRD/Product TDD.

Candidate cleanup:

- Leave it intact in the first local AGENTS cleanup batch.
- Consider a later styling-specific cleanup only if token governance starts duplicating package component docs.

### F4A-007: Backend Layer AGENTS Are Mostly Healthy Local Guardrails

Evidence:

- `src/controllers/AGENTS.md`, `src/entities/AGENTS.md`, `src/repositories/AGENTS.md`, and `src/services/AGENTS.md` are short and layer-specific.
- `src/controllers/AGENTS.md` correctly points WeChat OAuth changes to Unit TDD.
- `data-migrations/AGENTS.md` owns local migration hazards that are too tactical for Product TDD.

Why it matters:

- These files are close to the work surface and mostly do not duplicate durable docs.

Candidate cleanup:

- No broad backend layer AGENTS cleanup needed.
- Possible small cleanup: align Unit TDD path convention and avoid expanding examples into a backend style guide.

### F4A-008: `.github/workflows/AGENTS.md` Correctly Routes Runtime Truth To Deployment Docs

Evidence:

- Workflow AGENTS keeps YAML thin, scripts under `scripts/ci/**`, and runtime/rollout changes in `docs/40-deployment/`.

Why it matters:

- This is the desired local AGENTS role for CI surfaces.

Candidate cleanup:

- No immediate cleanup.

## Recommended Batch Shape

Recommended later cleanup can be split:

1. Batch 5A: App-level AGENTS slimming
   - `apps/backend/AGENTS.md`
   - `apps/frontend/AGENTS.md`
   - normalize Unit TDD path references
   - remove repeated generic doc routing and repeated shared UI primitive catalog

2. Batch 5B: Event UI AGENTS contract extraction
   - `apps/frontend/src/domains/event/ui/AGENTS.md`
   - confirm durable Form Mode semantics already live in `docs/20-product-tdd/event-context-contracts.md`
   - keep only UI-local state/component hazards in the local AGENTS file

3. Optional later batch: shared UI / design-web guidance boundary
   - `apps/frontend/src/shared/ui/AGENTS.md`
   - `apps/frontend/src/AGENTS.components.md`
   - local `@partner-up-dev/design-web` Intent skill guidance

## Verification Performed

Commands run:

```bash
find . -name AGENTS.md -not -path './node_modules/*' -not -path './.git/*' -not -path './dist/*' -not -path './build/*' | sort
find . -name AGENTS.md -not -path './node_modules/*' -not -path './.git/*' -not -path './dist/*' -not -path './build/*' -print0 | xargs -0 wc -l | sort -n
rg -n '^#|^##|^###' AGENTS.md apps .github -g 'AGENTS.md'
rg -n 'docs/30-unit-tdd|wechat-oauth-handoff|Unit TDD|hard-unit|AGENTS.components|AGENTS.naming|src/ARCHITECTURE|design-web|PuButton|PuCard|Form Mode|Anchor Event|portless|dev:ensure|db:reset|db:migrate' AGENTS.md apps .github docs/30-unit-tdd docs/20-product-tdd docs/10-prd -g '*.md'
```

Audit-only outcome:

- No local AGENTS files were modified during this audit.
- Findings are task-local and should become cleanup batches only after user approval.

## Post-Audit Execution Notes

Batch 5 resolved F4A-002 by aligning `apps/backend/AGENTS.md` and
`apps/frontend/AGENTS.md` with the current flat Unit TDD file convention:

```text
docs/30-unit-tdd/<unit>/*.md
  -> docs/30-unit-tdd/<unit>.md
```

Other local AGENTS cleanup findings remain open for a later batch, especially
app-level AGENTS slimming and Event UI AGENTS contract extraction after the new
Unit TDD docs are reviewed.

Batch 6 resolved the critical remaining local AGENTS findings:

- F4A-001 resolved by slimming backend/frontend root AGENTS and routing general durable ownership back to root `AGENTS.md`.
- F4A-003 resolved by slimming Event UI AGENTS to local hazards and pointers to Product TDD / Unit TDD.
- F4A-005 resolved by slimming Shared UI AGENTS to app-local primitive hazards and routing design-web package API guidance to `@partner-up-dev/design-web#design-web`.
- F4A-006 resolved by moving compressed app-local style governance to `apps/frontend/src/AGENTS.styles.md` and keeping `apps/frontend/src/styles/AGENTS.md` as a one-line nearest-folder pointer.
