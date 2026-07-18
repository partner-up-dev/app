# Phase 3 Execution Map

## Ordered Dependency Graph

```text
Phase 3A foundation/calibration
  3-1 baseline-and-fitness
    -> 3-2 /prd read owner
Phase 3B mutation calibration and PR convergence
    -> 3-3 feedback submission vertical
  -> 3-4 PR Type Config boundary
  -> 3-5 pr-core retirement
  -> 3-6 contract surface narrowing
Phase 3C conflict closure
  -> 3-7 CF-01 anonymous PR creation
  -> 3-8 CF-02 waitlist auth contract
  -> Phase 3 exit
```

The order optimizes learning and rollback cost. A later slice may be split further but may not bypass its
predecessor's exit conditions without a new task decision.

| Slice | Primary learning | Behavior risk | Entry dependency | Status |
| --- | --- | --- | --- | --- |
| 3-1 | Can boundary rules be measured with low noise? | None/task tooling only | Current baseline | Complete |
| 3-2 | Can Web reach one route/read owner without touching commands? | Low–medium | `3-1` report stable | Complete |
| 3-3 | Can one mutation cross Browser→DB through the target seams? | Medium | `3-1`/`3-2` exited + System green | Complete |
| 3-4 | Can PR Type Config become a real deep owner? | Medium–high | `3-3` proves mutation protocol | Complete |
| 3-5 | Can compatibility aliases be retired incrementally? | High compile-time | `3-4` owner stable | Complete |
| 3-6 | Can Web type coupling narrow without duplicate DTOs? | Broad compile-time | `3-4`/`3-5` public surface stable | Complete |
| 3-7 | Can authenticated-only create/publish intent and runtime become one proven contract? | High product/auth | 3B stable + Sir decision | Complete |
| 3-8 | Can waitlist auth wording, transport and journey agree? | Medium cross-unit | `3-7` + stable auth seam | Complete |

## Cross-cutting Decision Lanes

- CF-01 create/publish product semantics remains excluded from `3-1`–`3-6` and is resolved explicitly in `3-7`.
- CF-02 waitlist auth payload wording remains excluded from `3-1`–`3-7` and is resolved explicitly in `3-8`.
- Security baseline and all-repo format baseline are separate governance tasks, not hidden acceptance criteria.
- Commerce/provider, OAuth/global RPC and Job/Notification bootstrap remain deferred until the migration protocol
  survives the pilots.

## Per-slice Packet Rule

Each slice must update its packet before execution with current HEAD, focused dirty paths, exact contract diff,
characterization plan, branch/stop decisions, rollback/forward-fix and verification matrix. A plan is stale as
soon as its entry paths or governing docs change.

All slices `3-1`–`3-8` are Complete. Their final cross-slice proof and protected working-tree exclusions are in
[`exit-evidence.md`](./exit-evidence.md). The unrelated root package/workspace and independent task-directory dirty
state remains outside Phase 3 ownership.
