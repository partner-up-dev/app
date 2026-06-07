# Concepts

Keep this file short. Load it only when framework terminology or durable ownership language becomes ambiguous.

## Input Type

- owned by layer: `docs/00-meta/`
- one-line definition: the classification of an incoming request as `Intent`, `Constraint`, `Reality`, or `Artifact`
- why it exists: input type decides durable owner and blast radius before work starts
- common confusion with: active mode
- when to load: when a request could fit more than one owner

## Mode

- owned by layer: `docs/00-meta/`
- one-line definition: the current working posture, such as `Explore`, `Solidify`, `Execute`, or `Diagnose`
- why it exists: mode controls how to work, not where truth belongs
- common confusion with: task stage or durable owner
- when to load: when the next step feels blocked by uncertainty or evidence quality

## Unit

- owned by layer: `docs/00-meta/`
- one-line definition: a logical technical boundary that may span more than one folder
- why it exists: Product TDD and Unit TDD reason about responsibilities, not just directories
- common confusion with: package or subtree
- when to load: when deciding between Product TDD and Unit TDD

## MVT

- owned by layer: `docs/00-meta/`
- one-line definition: Minimal Viable Task anchors: `Objective & Hypothesis`, `Guardrails Touched`, and `Verification`
- why it exists: keeps each task-local workspace compact, recoverable, and grounded
- common confusion with: full design doc or alignment-complete request
- when to load: whenever non-trivial work starts in `tasks/`

## Task Packet

- owned by layer: `docs/00-meta/`
- one-line definition: an agent-owned, task-local workspace for volatile reasoning, evidence, artifacts, collaboration state, and verification
- why it exists: keeps unstable work inspectable without promoting it into durable docs or losing it in conversation history
- common confusion with: durable architecture docs or uninspectable scratch work
- when to load: whenever a task grows beyond a trivial command or answer

## Source Search Defaults

- owned by layer: `docs/00-meta/`
- one-line definition: ordinary source and durable-doc searches exclude volatile workspaces, generated output, dependencies, virtual environments, and tool caches by default
- why it exists: prevents historical task evidence and generated files from distorting active truth discovery
- common confusion with: never searching `tasks/`
- when to load: before broad repository searches or when deciding whether task evidence is in scope

## Alignment Substrate

- owned by layer: `docs/15-alignment/`
- one-line definition: the coordination grammar used when MVT alone cannot constrain risky mutation safely
- why it exists: reduces drift around references, boundaries, state, evidence, and mutation verbs
- common confusion with: PRD, TDD, or a generic naming glossary
- when to load: when references are unstable, blast radius is unclear, or a change is not obviously local

## Impact Handshake

- owned by layer: root `AGENTS.md` plus `docs/15-alignment/`
- one-line definition: the pre-execution restatement of address, state diff, blast radius, invariants, and verification
- why it exists: prevents non-local mutations from proceeding on vague assumptions
- common confusion with: a full implementation plan
- when to load: before durable truth changes when blast radius is not obviously local

## Local Context

- owned by layer: nearest `AGENTS.md` in or above the target subtree
- one-line definition: tactical hazards, placement rules, and recurrence tripwires closest to code
- why it exists: keeps fast-changing local knowledge near the target instead of bloating durable global docs
- common confusion with: Unit TDD
- when to load: before changing code in a subtree that has local guidance

## Promotion

- owned by layer: root `AGENTS.md` plus the owning durable doc layer
- one-line definition: moving stable knowledge out of `tasks/` into PRD, TDD, Deployment, or local `AGENTS.md`
- why it exists: keeps durable memory small and high-signal
- common confusion with: copying packet content verbatim into durable docs
- when to load: after verification, when deciding what should survive the task
