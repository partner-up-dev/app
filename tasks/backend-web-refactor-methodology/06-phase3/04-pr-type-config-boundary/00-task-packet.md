# Slice 3-4 — PR Type Configuration Boundary

## Objective & Hypothesis

Create one PR Type Configuration owner for current policy reads and operator writes. Discovery, Authoring and PR
Lifecycle consume a public read contract instead of reaching directly into `PRTypeConfigRepository`. Creation-time
values that materialize into PR remain snapshots; later config changes do not rewrite existing PRs.

## Scope

- PR Type Config domain contract/adapter and repository ownership.
- Discovery, Authoring, Lifecycle and Admin consumers migrated in bounded batches.
- Focused Unit/Backend scenarios and existing PR Discovery/System journeys.
- No schema/migration/API path change unless separately authorized.

## Entry / Exit

- Entry: `3-2`/`3-3` completed; target owner promoted to Unit Topology/system authority; direct consumer inventory current.
- Exit: runtime consumers use one read contract or documented exception, Admin remains only mutation owner,
  snapshot/current semantics proven and request cardinality non-regressed.

## Status

Planned after pilots. No mutation started.
