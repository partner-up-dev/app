# Bootstrap Workflow

## Role

Use this as the repo-entry workflow for non-trivial work. It tells agents how to route work before loading deeper product, technical, runtime, alignment, or local context.

Keep this file procedural. Framework terminology belongs in `concepts.md`; detailed route and mode behavior belongs in the specific `input-*.md` and `mode-*.md` files.

## Workflow

1. Classify the incoming request using the relevant `input-*.md` route.
2. Identify the durable owner and likely blast radius before mutation.
3. Choose the active mode using the relevant `mode-*.md` SOP.
4. For non-trivial work, open or update a task packet under `tasks/`.
5. Load only the route doc, mode SOP, durable owner, and nearest local `AGENTS.md` needed for the current slice.
6. Search source and durable docs with volatile workspaces, generated output, dependencies, virtual environments, and caches excluded by default.
7. Use `docs/15-alignment/README.md` only when MVT plus local guidance cannot constrain risky mutation cheaply.
8. Execute with explicit verification.
9. Re-enter another mode if evidence or clarity changes.
10. Promote only stable truths after verification.

## Input Routes

- `Intent`: use `input-intent.md`; primary durable owner is `docs/10-prd/`.
- `Constraint`: use `input-constraint.md`; primary durable owner is `docs/20-product-tdd/` or hard-local `docs/30-unit-tdd/`.
- `Reality`: use `input-reality.md`; gather task-local evidence before modifying.
- `Artifact`: use `input-artifact.md`; keep one-off work task-local unless reuse is proven.

## Modes

- `Explore`: map unknowns before solidification or execution.
- `Solidify`: restate findings into stable claims, contracts, decisions, or promotion candidates.
- `Execute`: implement or edit once the slice is clear enough.
- `Diagnose`: collect evidence when observed reality diverges from expectation.

Mode does not override durable ownership. Switch mode when evidence or clarity changes.

## Task Packets

Use a task packet when work is non-trivial, spans discussion, needs evidence, or may produce promotion candidates.

Keep the control surface compact:

- `Objective & Hypothesis`
- `Guardrails Touched`
- `Verification`

Task packets are agent-owned and may be reorganized inside the task boundary. Keep volatile packet content out of durable docs until it passes promotion criteria.

## Search Defaults

When searching source or durable docs, exclude by default:

- `tasks/`
- `temp/`
- generated output such as `build/` and `dist/`
- dependency folders such as `node_modules/`
- virtual environments
- tool caches

Search excluded locations only when the task explicitly targets them or when recovering/reviewing task evidence.

## Promotion

Promote only stable truths after verification.

Promotion targets:

- product behavior -> `docs/10-prd/`
- cross-unit technical truth -> `docs/20-product-tdd/`
- hard local technical truth -> `docs/30-unit-tdd/` or nearest local `AGENTS.md`
- runtime truth -> `docs/40-deployment/`
- work-system rule -> `docs/00-meta/`
- task-local evidence and drafts -> remain in `tasks/`

Do not copy task logs wholesale into durable docs. Promote compact truths with clear owners.

## Exit Criteria

- Durable owner is explicit.
- Loaded context is sufficient and not excessive.
- Verification is explicit.
- Any promotion candidate is identified.
