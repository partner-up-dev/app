# Slice 3-1 Evidence Index

| ID | Kind | Claim | Evidence | Confidence |
| --- | --- | --- | --- | --- |
| S01-ENTRY-001 | Command | Entry HEAD remains `bda22b60`; worktree has extensive concurrent changes | `entry-delta.md`; focused `git status` | High |
| S01-DOC-001 | Durable/source review | Architecture objectives and owner rules are consistent with current Product TDD and live compatibility seams | architecture constitution, Unit Topology, Backend AGENTS, Web Architecture diffs | High |
| S01-FIT-001 | Tool test | All ten initial rules have positive fixtures; allowed edges have negative coverage | `node --test tools/architecture-fitness/architecture-fitness.test.mjs` | High |
| S01-FIT-002 | Determinism | Two JSON reports over the unchanged scope are byte-identical | two CLI runs + `cmp` | High |
| S01-FIT-003 | Current report | 869 files, 3,236 resolved edges, 125 findings, one unresolved placeholder import | CLI JSON; scope digest in baseline | High for recognized syntax |
| S01-FIT-004 | Classification | Reviewed baseline classifies 125 known, 0 new, 0 stale; three exact exceptions override rule-level compatibility governance | `architecture-fitness-baseline.json`; `--check-new` | High |
| S01-FIT-005 | Existing structural gate | Existing backend ast-grep structure scan exits 0 and remains owned by the concurrent quality-gate work | `pnpm lint:structure:backend` | High |

## Interpretation Limits

- The reporter resolves relative imports and Web `@/` aliases; external package imports remain outside this slice.
- Vue analysis covers script blocks. Template dependency semantics are not inferred.
- A deep-import finding means “review/migrate this edge”; it does not prove the target sub-barrel is behaviorally wrong.
- Whole-clause type-only imports are recorded, but mixed value/type specifier semantics are not used as a gate.
- SCC, runtime calls, SQL/query cardinality and framework dependency injection are outside this first reporter.
- `rg` inventories support review but do not define finding semantics.

All command evidence uses repository root `/home/yyh/development/Anana/mvp-HA`. No build, server, database or
scenario lifecycle is required to prove this documentation/tool-only slice.
