# AGENTS.md of PartnerUp MVP Hypothesis-A

PartnerUp helps users find a partner (搭子) effectively and safely.

## Repository Layout

```text
/
|-- apps/
|   |-- backend/
|   `-- frontend/
|-- docs/                 # Durable product and technical truth
|-- tests/                # Cross-unit and root-owned verification
|-- tasks/                # Agent-owned task-local workspaces for volatile work
`-- scripts/
```

## Technical Overview

- Monorepo: pnpm workspace
- Backend: Hono + Drizzle ORM + Postgres-oriented schema / migration workflow
- Frontend: Vue 3 + Vite + TanStack Vue Query + Hono RPC client

## Documentation

Read following documents for the current work when needed and keep them current.

- `docs/00-meta/`: typed input routes, mode SOPs, and framework concepts.
- `docs/00-meta/concepts.md`: load only when boundary language or owner terminology is unclear.
- `docs/10-prd/`: product what/why, user-visible workflows, rules, scope, and business vocabulary.
- `docs/15-alignment/`: load only when MVT is not enough to constrain mutation safely.
- `docs/20-product-tdd/`: cross-unit technical realization and authority boundaries.
- `docs/30-unit-tdd/`: open only when a named hard-unit doc exists and is relevant.
- `docs/40-deployment/`: runtime, rollout, observability, and recovery truth.
- `tasks/`: agent-owned, task-local workspace for volatile planning, investigation, diagnostics, artifacts, evidence, and collaboration state. Every non-trivial task packet should keep a compact control surface with `Objective & Hypothesis`, `Guardrails Touched`, and `Verification`.
- `apps/backend/AGENTS.md`, `apps/frontend/AGENTS.md`, and nearer `**/AGENTS.md`: local constraints are additive and should be checked before edits in that subtree.

## Operating Model

1. Classify the incoming request as `Intent`, `Constraint`, `Reality`, or `Artifact`.
2. Identify the durable owner and blast radius before choosing how to work.
3. For non-trivial work, open or update a task packet under `tasks/`.
4. Keep the task packet current when discussion, exploration, implementation friction, or verification changes the working state.
5. Choose the active mode for the current slice: `Explore`, `Solidify`, `Execute`, or `Diagnose`.
6. Load only the route doc, mode SOP, and governing anchors needed for that slice.
7. Search source and durable docs with volatile workspaces, generated output, dependencies, caches, and virtual environments excluded by default.
8. Expand into alignment substrate fields only when references, boundaries, state, evidence, or blast radius are still ambiguous.
9. Execute with explicit verification.
10. Re-enter a different mode if evidence or clarity changes.
11. Promote only stable truths after verification.

### Typed Input Guide

- `Intent`: the business wants new behavior, scope, or policy. Update PRD first.
- `Constraint`: product behavior stays the same, but technical, dependency, or environment boundaries changed. Update Product TDD or Unit TDD.
- `Reality`: observed runtime behavior diverges from expectation. Gather evidence first, then fix and add recurrence guards if needed.
- `Artifact`: the requested deliverable is a bounded script, analysis, migration helper, or one-off output. Keep it tactical unless reuse is proven.

### Mode Guide

- `Explore`: map unknowns, alternatives, and assumptions.
- `Solidify`: restate findings into explicit claims, contracts, or decisions.
- `Execute`: implement a clear, verified change.
- `Diagnose`: investigate mismatches between expected and observed reality.

Mode guidance:

- do not assume one task equals one mode
- switch modes when evidence or clarity changes
- mode selection never overrides durable ownership

Task packet guidance:

- task packets are agent-owned and may be updated, split, and reorganized by the agent inside the task boundary
- keep each packet readable, inspectable, and steerable by the human
- preserve a compact control surface with objective, guardrails, verification, current understanding, confirmed constraints, and next step
- split a packet by collaboration pressure rather than by a fixed folder scheme
- keep volatile packet content out of durable docs until it passes the promotion test

Search guidance:

- when searching source or durable docs, exclude `tasks/`, `temp/`, generated output such as `build/` and `dist/`, dependency folders such as `node_modules/`, virtual environments, and tool caches by default
- search those locations only when the task explicitly targets them or when recovering/reviewing task evidence

### Impact Handshake

Before mutating durable truth after alignment expansion, or when blast radius is not obviously local, pause and restate:

- Address and Object: what exact files, anchors, or symbols will change
- State Diff: `From -> To`
- Blast Radius Forecast: what downstream files, modules, or surfaces could be affected
- Invariants Check: what must remain unchanged
- Verification: what concrete proof will bound side effects

If evidence is missing or the durable owner is still unclear, return to `Explore` or `Diagnose` instead of guessing.

### Negotiation Triggers

Pause and ask for human confirmation when:

- the requested change conflicts with an existing product claim or technical contract
- blast radius crosses multiple durable owners and the correct owner is unclear
- a shortcut would damage maintainability, readability, simplicity, or an explicit guardrail
- evidence is insufficient for a bug fix or architectural decision

## Development Workflow

- Use GitHub CLI (`gh`) for GitHub operations and issue workflows.
- When local frontend/backend services must be available for browser or manual validation, run `pnpm dev:ensure` from the repository root first. It reuses existing `portless` routes and starts only missing dev servers.
- Use `pnpm dev:portless` as the underlying full-stack local development entry. `portless.json` owns the stable app names for the frontend (`partner-up`) and backend (`api.partner-up`). Do not start ad hoc duplicate dev servers with raw `pnpm dev`, `pnpm dev:frontend`, or `pnpm dev:backend` when the goal is only to ensure services are running.
- When updating `@partner-up-dev/design-web`, do not hand-edit local agent skill copies. After installing the new package version, verify the package-shipped TanStack Intent skill with `pnpm dlx @tanstack/intent@latest list --json`, `pnpm dlx @tanstack/intent@latest load @partner-up-dev/design-web#design-web`, and `pnpm dlx @tanstack/intent@latest validate apps/frontend/node_modules/@partner-up-dev/design-web/skills/design-web`. Do not add an `intent-skills` managed block unless explicitly requested.
- Keep tests and guardrails aligned with behavior changes; do not ship by build-only confidence.
- Use the root `pnpm check:*` scripts as canonical static-validation entrypoints. Run `pnpm check:static` for the full local gate, or a narrower layer: `check:format`, `check:lint`, `check:type`, `check:config`, `check:dead-code`, `check:security`, or `check:build`.
- Biome default checks are changed-file scoped; use `pnpm format:check:all` and `pnpm lint:biome:all` only when intentionally working on all-repo baselines.
- `pnpm check:dead-code` and `pnpm check:security` are report-first layers. Promote findings into blocking gates only after baseline and ownership are explicit.
- Run test suites from the repository root through Vitest projects: `pnpm test:unit:backend`, `pnpm test:unit:frontend`, `pnpm test:scenario:backend`, `pnpm test:scenario:system`, or `pnpm test:scenario:all`. Scenario Vitest project setup loads `apps/frontend/.env` and `apps/backend/.env`, then owns temporary database and server lifecycle.
- Cross-unit user journey scenario tests belong under `tests/scenario/` and should run through the real frontend, real backend HTTP, and an isolated database when the behavior crosses both app units.
- Frontend route workflow changes that may be covered by scenario tests should expose stable `data-testid` semantic nodes for primary actions, modal actions, and result-state affordances.
- Prefer the smallest reviewable mutation that moves the repo toward the declared owner model.
- Follow `./CONTRIBUTING.md` for commit message format and release policy.

## Coding Guidelines

- No `any`.
- Prefer `async` / `await` over raw Promise chains.
- Enforce data correctness at system boundaries.
