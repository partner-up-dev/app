# Slice 3-2 Entry Delta

## Execution Baseline

- HEAD: `b674f5ca38584c7e8089d4d4182e72f836982383`.
- Owned Web source/test paths were clean before mutation.
- Preserved unrelated dirty state: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and untracked
  `tasks/oxc-toolchain-migration/`, `tasks/project-node-runtime/`, `tasks/quality-gate-orchestration/`.
- `3-1` architecture baseline: 869 production files, 3,236 import edges, 125 known / 0 new findings.

## Current Ownership

```text
PRDiscoveryPage
  -> parses type and owns catalog + type-detail queries for header/drawer
  -> reads Panel state/actions through a broad component ref

PRDiscoveryPanel
  -> parses type/date/view again
  -> owns catalog + type-detail again, plus directory/authoring/view reads
  -> owns recommendation/create/auth replay commands and telemetry
```

TanStack keys usually deduplicate the duplicate catalog/type-detail HTTP requests, but do not remove the two
independent owners, loading/error projections or child-ref coordination.

## Frozen Behavior

- Query precedence: explicit `view` > per-type local preference > server resolution > `LIST`.
- Server view resolution falls back to `LIST` only after the 500 ms timeout; other failures remain visible and
  must offer an escape to unscoped `/prd`.
- Repeated `date` query values retain their current pass-through semantics; view replacement preserves the other
  query fields.
- Loading and error precedence, catalog shuffle timing, back/history behavior, semantic `prd.*` nodes and telemetry
  vocabulary remain unchanged.
- Recommendation, create, OAuth/session bootstrap and pending-action replay stay in the Panel and outside this read
  workflow mutation.

## Intended Delta

- Add one route-scope `usePRDiscoveryReadWorkflow` under `domains/pr/use-cases`.
- Page parses canonical route input, instantiates the workflow once and consumes its plain computed state/actions.
- Panel receives the same workflow, removes duplicate read hooks/route parsing and retains command/auth logic.
- Raw TanStack query objects do not cross the workflow boundary; endpoint invocation remains in query adapters.
