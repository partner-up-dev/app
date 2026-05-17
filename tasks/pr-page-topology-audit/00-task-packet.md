# PR Page Topology Audit

## Objective & Hypothesis

Map the current PR detail page UI and data topology before any refactor proposal or implementation.

Hypothesis:

- The current maintainability pressure is caused by boundary erosion across route entrypoint assembly, PR-domain feature components, process-level WeChat replay, telemetry, and backend cache mutation.
- A split topology packet will make the discussion easier to revise than a single long audit file.
- The older `tasks/issue-182-pr-page-ux/` packet is useful history, but this packet should describe the current code state.

## Guardrails Touched

- Typed input: `Artifact`.
- Active mode: `Explore`.
- Durable owner candidates:
  - frontend route entrypoint: `apps/frontend/src/pages/PRPage.vue`
  - PR domain UI / query / use-case modules: `apps/frontend/src/domains/pr/**`
  - process-level WeChat action replay: `apps/frontend/src/processes/wechat/**`
  - shared UI primitives: `apps/frontend/src/shared/ui/**`
  - app routing: `apps/frontend/src/app/router.ts`
- Historical packet:
  - `tasks/issue-182-pr-page-ux/00-task-packet.md`
  - `tasks/issue-182-pr-page-ux/03-boundary-topology.md`

## Verification

- Build no product-code mutation in this slice.
- Inspect current route entrypoint and direct dependencies.
- Use sub-agent review for UI topology and data / side-effect topology.
- Record file anchors for all topology claims.
- Keep unresolved questions explicit for user discussion.

## Packet Index

- Scope and questions: `10-scope-and-questions.md`
- Current UI topology: `20-current-ui-topology.md`
- Current data topology: `30-current-data-topology.md`
- Boundary pressure map: `40-boundary-pressure-map.md`
- Target topology draft: `50-target-topology.md`
- Creator actions first slice: `60-creator-actions-first-slice.md`
- Discussion log: `90-discussion-log.md`
