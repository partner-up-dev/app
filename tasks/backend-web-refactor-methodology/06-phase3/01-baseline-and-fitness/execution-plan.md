# Slice 01 Execution Plan

## Required Information Before Editing

1. `git rev-parse HEAD` and focused status for all proposed paths.
2. Existing `sgconfig.yml`, ast-grep rules and `lint:structure:backend` output.
3. Current Backend/Web import graph using the same parser/exclusions as the chosen baseline.
4. Current direct seams: controller→repository/legacy service, cross-domain deep imports, Web page/component
   raw RPC, shared→domain, model→query/RPC and canonical→compat imports.
5. Governing docs: Unit Topology, Cross-unit Contracts, Web Architecture and nearest AGENTS.

## Subtasks

### 01A — Promote Stable Architecture Truth

- Add Product TDD architecture objectives/decision rules: hard constraints, ordered objective function, four
  public-surface categories, growth algorithm and compatibility/exception protocol.
- Link that constitution from the Product TDD index.
- Update Unit Topology with PR Lifecycle, PR Type Config, Authoring, Discovery and retired Event identity.
- Update Backend AGENTS with curated public-surface and cross-domain import rules.
- Update Web Architecture with page/workflow/query-command/process/state ownership.
- Keep migration inventories and counts task-local.

### 01B — Define The Allowed-dependency Matrix

- Backend: controller→public domain; domain internal→owner persistence/infra; cross-domain→public contract only;
  canonical PR must not import compatibility PR.
- Web: app/pages/processes→domains→shared; raw RPC only in adapters/explicit compatibility allowlist;
  shared must not import domain; model must not import query/page/SFC.
- Cross-unit: `AppType` remains typed origin; no handwritten response DTO truth.

### 01C — Choose The Cheapest Precise Mechanism

- Use ast-grep only for structural syntax with positive/negative fixtures, such as forbidden imports or direct
  repository construction in controller scope.
- Use a deterministic TypeScript-AST import parser for owner graph and selected high-value boundary checks; keep
  it independent of the concurrently changing package/lint wiring.
- Use `rg` for supporting inventory, never as the sole semantic proof for a complex rule.

### 01D — Baseline Before Blocking

- Run each scan twice and compare structured output.
- Classify every existing violation as planned slice, explicit compatibility allowlist or real defect.
- Give allowlist entries an owner, reason and expiry/removal condition.
- Wire report output first. Only a proven no-new-violation delta may become blocking.

## Verification

- Positive and negative fixture for every AST rule; relational rules traverse fully where needed.
- Two identical scan runs produce the same normalized result.
- `pnpm lint:structure:backend`, Backend/Web type checks and changed-file lint pass after tooling/doc edits.
- Link/whitespace check for durable and task docs.
- Focused status proves no business source or package graph was changed unintentionally.
