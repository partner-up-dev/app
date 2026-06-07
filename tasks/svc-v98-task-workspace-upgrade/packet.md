# Task Packet - SVC v9.8 Task Workspace Upgrade

## MVT Core

- Objective & Hypothesis: Upgrade the repo's SVC operating guidance from the current v9.7 baseline toward the v9.8 task-workspace semantics without installing Codex agent definitions. Hypothesis: this is a narrow documentation and collaboration-protocol change touching root/local AGENTS and `docs/00-meta/` only.
- Guardrails Touched: do not change product truth, business workflows, production code, deployment contracts, or Codex agent configuration; keep existing user worktree changes intact.
- Verification: diff is limited to this task packet plus SVC operating guidance, old task-note wording is removed from active docs, and no `.codex/agents` or business-code files are changed.

## Current State

- Current Understanding: `F:/CODING/svc` has an unreleased v9.8-style task-workspace update and a separate Codex agents installer commit; the user explicitly excluded Codex agents from this upgrade.
- User-Confirmed Constraints: start the upgrade now; Codex agents are not included.
- Active Mode or Transition Note: Execute after the read-only Explore/Solidify pass.
- Next Step: complete final handoff to the user.

## Exploration Scaffold

- Perturbation: `F:/CODING/svc` has updates and the repo should prepare/perform the SVC upgrade.
- Input Type: Constraint.
- Governing Anchors: root `AGENTS.md`, `docs/00-meta/*`, `apps/backend/AGENTS.md`, `apps/frontend/AGENTS.md`, and `F:/CODING/svc/src/sections/tasks.md`.
- Impact Hypothesis: the durable operating protocol changes, while product/runtime/code behavior remains unchanged.
- Negotiation Triggers: stop if the upgrade requires writing `.codex/agents`, changing product/TDD/deployment claims, or migrating historical task packets wholesale.
- Promotion Candidates: task-workspace semantics and source-search isolation rules in active SVC guidance.

## Execution Notes

- Started after explicit user confirmation: "开始升级（Codex agents 不包含）".
- Updated root/local AGENTS and `docs/00-meta/` to use task-local workspace semantics and source-search isolation defaults.
- Updated `docs/40-deployment/index.md` only to replace stale `task notes` wording with task-local packet wording; no deployment contract changed.
- Verification:
  - focused diff covers SVC operating guidance only: root/local AGENTS, `docs/00-meta/*`, `docs/40-deployment/index.md`, and this task packet
  - old active-doc wording scan for `entropy buffer`, `task notes`, `lightweight but grounded`, `private scratchpad`, and `active task packets and temporary reasoning` returned no matches
  - `.codex` and `.agents` have no diff
