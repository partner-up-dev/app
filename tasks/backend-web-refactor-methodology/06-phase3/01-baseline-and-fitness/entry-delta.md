# Slice 01 Entry Delta

## Identity

| Item | Entry fact |
| --- | --- |
| Date | 2026-07-17, Asia/Shanghai |
| HEAD | `bda22b609e651f0daf6b36559d3fcdc283ac1fa1` |
| Exit HEAD | `c634d9b6b36c0c751af934543014ef9afd437ce0` (`ref(tooling): migrate static quality gates to oxc`) |
| Mode | Execute |
| Authorization | Sir explicitly started Slice 01 |
| Worktree | 622 porcelain entries: 613 modified/other, 3 deleted, 6 untracked |

The large dirty set appeared after Phase 3 planning and belongs to concurrent/user work. Slice 01 must not use a
clean-tree assumption or run broad formatting. Runtime/source counts are informational only until the shared work
settles; fitness output is tied to the exact entry HEAD plus current working-tree state.

The concurrent quality-gate work committed before the Slice 01 commit was assembled. Its source content was
already present during the reviewed scan: after HEAD advanced to `c634d9b6`, the scope digest and 125/0/0
classification remained byte-for-byte unchanged. The baseline therefore records the exit HEAD while retaining
the entry HEAD above as execution history.

## Owned And Protected Paths

| Path | Entry state | Slice treatment |
| --- | --- | --- |
| `docs/20-product-tdd/architecture-objectives-and-decision-rules.md` | absent | create |
| `docs/20-product-tdd/index.md` | clean | narrow link/order edit |
| `docs/20-product-tdd/unit-topology.md` | clean | narrow topology edit |
| `apps/backend/AGENTS.md` | modified, 1-line quality-gate change | preserve existing diff; add separate architecture section |
| `apps/web/src/ARCHITECTURE.md` | clean | narrow ownership/decision edit |
| `tools/architecture-fitness/` | absent | create isolated report tool, fixtures and baseline |
| `package.json` | modified, 21 additions/26 deletions | protected; do not edit |
| `sgconfig.yml` | clean but governed by concurrent lint migration | protected; do not edit |
| `tools/ast-grep/rules/no-hono-http-exception-import.yml` | deleted by concurrent work | protected; do not restore |
| `docs/20-product-tdd/cross-unit-contracts.md` | modified by concurrent work | read for consistency only; do not edit |

## Impact Handshake

- **Address/Object:** the five durable owner files above plus a standalone report-only fitness tool.
- **From → To:** scattered descriptive guidance → one generative architecture doctrine, explicit live/target
  topology, local operational rules and repeatable boundary evidence.
- **Blast radius:** future placement/import decisions and static reporting only; no runtime/package/API/schema effect.
- **Invariants:** current compatibility seams remain legal and named; product behavior and authority remain unchanged;
  concurrent changes are preserved; target rules are not described as completed migrations.
- **Verification:** claim/source review, link and whitespace checks, fixture tests, two byte-identical normalized
  reports, baseline classification and focused status/scope audit.

## Stop Conditions

- Concurrent edits land on an owned durable line or on the new tool path.
- A proposed rule cannot distinguish current compatibility from prohibited new direction cheaply.
- A durable claim changes product semantics or contradicts current authority contracts.
- Verification would require broad formatting or mutation of the active quality-gate/package migration.

## Working-tree Architecture Snapshot

The report snapshot is bound to scope digest
`991949747b64b352f69b9e7708364c87542977df5734842e0dd055b86fd03564`:

| Measure | Result |
| --- | ---: |
| Backend production TS | 465 files |
| Web production TS/TSX/Vue | 404 files / 74,000 LOC |
| Parsed production import/export edges | 3,236 |
| Architecture findings | 125 known / 0 new after baseline |
| Unresolved in-scope imports | 1 (`canonical.controller.ts` placeholder `../services/YourService`) |

The Phase 3 root baseline's earlier LOC numbers are historical for its prior working-tree state. This slice uses
the content digest and exact fingerprints rather than pretending concurrent source changes did not occur.
