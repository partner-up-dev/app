# Slice 01 — Current Baseline And Architecture Fitness

## Objective & Hypothesis

- Refresh only the high-value current topology needed to judge Phase 3 deltas.
- Promote the decided owner model into its durable owners before application mutation.
- Add report-first architecture evidence that prevents new boundary erosion without forcing immediate cleanup of
  historical edges.

Hypothesis: a small set of precise structural rules plus deterministic import-graph deltas can protect later
slices more cheaply than a broad one-shot architecture lint.

## Scope

- Task packet/evidence updates under this workstream.
- Durable owners: new `docs/20-product-tdd/architecture-objectives-and-decision-rules.md`, Product TDD index,
  `unit-topology.md`, `apps/backend/AGENTS.md`, and `apps/web/src/ARCHITECTURE.md`.
- New task-owned report tooling under `tools/architecture-fitness/`; the current Execute authorization covers it.
- Existing `package.json`, `sgconfig.yml` and `tools/ast-grep/rules/` are merge-sensitive quality-gate work and
  remain untouched by this slice.
- No business source, route, API, schema, migration or behavior change.

## Entry / Exit

- Entry: current HEAD/status captured; old snapshots marked historical; toolchain recovery evidence linked.
- Exit: owner matrix promoted, scans deterministic, false-positive policy explicit, current violations baselined,
  and only no-new-violation rules are eligible to block.

## Status

Complete on 2026-07-17. Durable truth is promoted; standalone report-first tooling, fixtures and reviewed baseline
are verified. No application behavior, package graph or active quality-gate wiring changed. See
`verification-log.md` and `scope-audit.md`.
