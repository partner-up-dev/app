# Slice 3-4 Entry Delta

## Entry

- `HEAD`: `ca6151cd` — committed `3-2`/`3-3` calibration and the Phase 3 control surface.
- `3-1` is committed; `3-2`/`3-3` now enter this slice as committed evidence rather than shared working-tree state.
- Current unrelated dirty paths are `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, plus untracked
  `tasks/oxc-toolchain-migration/`, `tasks/project-node-runtime/`, and
  `tasks/quality-gate-orchestration/`. They are protected and excluded.

## Consumer Baseline

- Structural import inventory finds 18 production domain imports of `PRTypeConfigRepository`: Admin PR management
  (2), Admin PR Type Config (5), Authoring (3), Discovery (2), and `pr-core` lifecycle (6).
- The repository exposes only persistence-shaped `create`, `findByType`, `listAll` and `updateByType`; it is not a
  valid cross-domain public surface.
- Existing current-versus-snapshot truth is durable: creation defaults materialize into a PR once; later config
  edits affect current discovery/authoring/lifecycle policy only where the caller explicitly reads current policy.
- No schema/migration/API route change is authorized. If any consumer requires one, stop rather than silently widen
  this slice.

## First-Batch Plan

1. Add a neutral `domains/pr-type-config` public surface with named, narrow policy projections.
2. Migrate Discovery first and prove catalog set-read cardinality is unchanged.
3. Migrate Authoring and lifecycle reads in named families; leave no non-owner repository import.
4. Keep Admin as the operator adapter; either delegate each config write to a named owner command or record a
   precise, temporary mutation exception with removal evidence.
