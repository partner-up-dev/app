# Phase 3 Slice Map

## Ordered Dependency Graph

```text
01 baseline-and-fitness
  -> 02 /prd read owner
  -> 03 feedback submission vertical
  -> 04 PR Type Config boundary
  -> 05 pr-core retirement
  -> 06 contract surface narrowing
```

The order optimizes learning and rollback cost. A later slice may be split further but may not bypass its
predecessor's exit conditions without a new task decision.

| Slice | Primary learning | Behavior risk | Entry dependency | Status |
| --- | --- | --- | --- | --- |
| 01 | Can boundary rules be measured with low noise? | None/task tooling only | Current baseline | Complete |
| 02 | Can Web reach one route/read owner without touching commands? | Low–medium | 01 report stable | Planned |
| 03 | Can one mutation cross Browser→DB through the target seams? | Medium | 01 + System green | Planned |
| 04 | Can PR Type Config become a real deep owner? | Medium–high | 02/03 prove protocol | Planned |
| 05 | Can compatibility aliases be retired incrementally? | High compile-time | 04 owner stable | Planned |
| 06 | Can Web type coupling narrow without duplicate DTOs? | Broad compile-time | 04/05 public surface stable | Planned |

## Cross-cutting Decision Lanes

- CF-01 create/publish product semantics: blocked on product-owner decision; excluded from slices 01–03.
- CF-02 waitlist auth payload wording: durable correction required before waitlist mutation; excluded here.
- Security baseline and all-repo format baseline are separate governance tasks, not hidden acceptance criteria.
- Commerce/provider, OAuth/global RPC and Job/Notification bootstrap remain deferred until the migration protocol
  survives the pilots.

## Per-slice Packet Rule

Each slice must update its packet before execution with current HEAD, focused dirty paths, exact contract diff,
characterization plan, branch/stop decisions, rollback/forward-fix and verification matrix. A plan is stale as
soon as its entry paths or governing docs change.

Slice 01 completed without application mutation. Slice 02 remains Planned and must re-baseline because its owned
Web paths are currently part of a large concurrent dirty worktree.
