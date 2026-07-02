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

## Documentation Routing

- `docs/00-meta/`: bootstrap workflow, typed input routes, mode SOPs, task packets, search defaults, and promotion rules.
- `docs/10-prd/`: product what/why, user-visible workflows, rules, scope, and business vocabulary.
- `docs/15-alignment/`: opt-in coordination substrate for risky or reference-sensitive mutation.
- `docs/20-product-tdd/`: cross-unit technical realization and authority boundaries.
- `docs/30-unit-tdd/`: optional hard-unit technical truth; open only when a named hard-unit doc exists and is relevant.
- `docs/40-deployment/`: runtime, rollout, observability, and recovery truth.
- `tasks/`: volatile task packets, evidence, drafts, and promotion candidates.
- nearest `AGENTS.md`: additive local constraints before edits in that subtree.

## Work Routing

- For non-trivial work, follow `docs/00-meta/bootstrap-workflow.md` and keep a task packet under `tasks/`.
- Product intent change: `docs/00-meta/input-intent.md` -> `docs/10-prd/`.
- Technical constraint change: `docs/00-meta/input-constraint.md` -> `docs/20-product-tdd/` or `docs/30-unit-tdd/`.
- Runtime mismatch: `docs/00-meta/input-reality.md` -> task packet evidence first.
- Bounded artifact: `docs/00-meta/input-artifact.md` -> task-local artifact unless reuse is proven.
- Risky references, weak evidence, conflict, or non-local blast radius: `docs/15-alignment/README.md`.
- Source and durable-doc searches should exclude `tasks/`, generated output, dependencies, virtual environments, and caches unless explicitly targeted.
- Before subtree edits, read the nearest local `AGENTS.md`.

## Development Workflow

- Use GitHub CLI (`gh`) for GitHub operations and issue workflows.
- When local frontend/backend services must be available for browser or manual validation, run `pnpm dev:ensure` from the repository root first. It reuses existing `portless` routes and starts only missing dev servers.
- Use `pnpm dev:portless` as the underlying full-stack local development entry. `portless.json` owns the stable app names for the frontend (`partner-up`) and backend (`api.partner-up`). Do not start ad hoc duplicate dev servers with raw `pnpm dev`, `pnpm dev:frontend`, or `pnpm dev:backend` when the goal is only to ensure services are running.
- When updating `@partner-up-dev/design-web`, use `node scripts/sync-design-web-package.mjs <version>`. 
- Do not add an `intent-skills` managed block unless explicitly requested.
- Keep tests and guardrails aligned with behavior changes; do not ship by build-only confidence.
- Use the root `pnpm check:*` scripts as canonical static-validation entrypoints. Run `pnpm check:static` for the full local gate, or a narrower layer: `check:format`, `check:lint`, `check:type`, `check:config`, `check:dead-code`, `check:security`, or `check:build`.
- Biome default checks are changed-file scoped; use `pnpm format:check:all` and `pnpm lint:biome:all` only when intentionally working on all-repo baselines.
- `pnpm check:dead-code` and `pnpm check:security` are report-first layers. Promote findings into blocking gates only after baseline and ownership are explicit.
- Run test suites from the repository root through Vitest projects: `pnpm test:unit:backend`, `pnpm test:unit:frontend`, `pnpm test:scenario:backend`, `pnpm test:scenario:system`, or `pnpm test:scenario:all`. Scenario Vitest project setup loads `apps/frontend/.env` and `apps/backend/.env`, then owns temporary database and server lifecycle.
- Cross-unit user journey scenario tests belong under `tests/scenario/` and should run through the real frontend, real backend HTTP, and an isolated database when the behavior crosses both app units.
- Frontend route workflow changes that may be covered by scenario tests should expose stable `data-testid` semantic nodes for primary actions, modal actions, and result-state affordances.
- Prefer the smallest reviewable mutation that moves the repo toward the declared owner model.
- Follow `./CONTRIBUTING.md` for commit message format and release policy.
- Do not revert formatter's change.

## Coding Guidelines

- No `any`.
- Prefer `async` / `await` over raw Promise chains.
- Enforce data correctness at system boundaries.
