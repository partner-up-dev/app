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

Verified complete in the controlled Phase 3 worktree on 2026-07-17. The owner is `domains/pr-type-config`;
all production domain imports of `PRTypeConfigRepository` now reside only in its internal persistence adapter.
Admin is an operator adapter, not a second config owner. No schema, migration or HTTP path changed. Entry and exit
evidence are frozen in `entry-delta.md` and `exit-evidence.md`; the slice remains uncommitted pending Sir's next
dedicated exit commit.
