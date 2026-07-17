# Slice 02 Execution Plan

## Required Information Before Editing

1. Current Page/Panel/query/model line-level flow and nearest Web/UI AGENTS.
2. `/prd` durable contract for `type`, repeated `date`, `view`, 500 ms LIST fallback and catalog escape.
3. Existing unit and System coverage for catalog, modes, all-zero ratios, no-match and error escape.
4. Baseline browser request count/order for catalog and type detail; measure but do not predeclare a performance gate.
5. Current `defineExpose`, router back/history and follow-prompt dependencies.

## Subtasks

### 02A — Characterize The Read State Machine

- Record precedence: explicit route view, local preference, server resolution, LIST fallback.
- Cover type selection, repeated dates, loading, timeout, abort/stale response, error and unscoped escape.
- Freeze stable `prd.*` semantic anchors and URL update behavior.

### 02B — Introduce One Narrow Read Workflow

- Instantiate it once at route scope.
- Keep endpoint invocation inside query adapters.
- Expose plain computed view state and explicit actions rather than raw TanStack Query objects.
- Pass one cohesive read model/action surface to Page shell and Panel; avoid provide/inject for a one-level
  relationship and avoid coupling through expanded child refs.

### 02C — Remove Duplicate Ownership

- Page stops calling catalog/type-detail hooks independently.
- Panel consumes the workflow read model and retains its existing command/create/auth logic unchanged.
- Keep catalog shuffle timing, drawer selection, page header, failed-state escape and view-mode controls stable.

### 02D — Verify And Measure

- Add workflow precedence/state tests and a narrow component contract test.
- Run Web lint/type/unit/build, targeted PR Discovery System file, then full System.
- Compare request count/latency and import graph; investigate regressions without changing the canonical-read contract.

## Acceptance Checks

- `usePRDiscoveryCatalog` and `usePRDiscoveryTypeDetail` each have one route-workflow owner for `/prd`.
- No `.vue` in the slice invokes `client.api`.
- Query keys remain from the current central registry.
- `type`, repeated `date`, `view`, LIST fallback, back/history, telemetry and `data-testid` remain stable.
- No new SCC/cross-owner edge; create/auth owned paths show no diff.
