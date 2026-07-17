# Backend / Web Refactor Program Roadmap

## Numbering Contract

This roadmap is the only owner of **Program Phase** numbers. The directories `01-backend/` through
`06-phase3/` are historical workstream ordinals, not Program Phases; in particular, `06-phase3/` means the sixth
task workspace created for this program and contains Program Phase 3.

Inside Phase 3, `3A`–`3C` are stage groups and `3-1`–`3-8` are executable slices. This keeps “phase”, “stage” and
“slice” from competing for the same number.

## Confirmed Sequence

```text
Phase 1: behavior and authority freeze                         Complete (historical)
Phase 2: read-only baseline and toolchain recovery             Complete (historical)

Phase 3: architecture and PR migration protocol               Active
  Phase 3A: foundation and calibration
    3-1 baseline and fitness                                  Complete
    3-2 PR Discovery read owner                               Verified; exit commit pending
  Phase 3B: mutation calibration and PR owner convergence
    3-3 Feedback mutation vertical                            Verified; exit commit pending
    3-4 PR Type Config boundary                               Planned
    3-5 pr-core retirement                                    Planned
    3-6 contract surface narrowing                            Planned
  Phase 3C: conflict closure
    3-7 CF-01 authenticated-only PR persistence               Decided; execution pending
    3-8 CF-02 waitlist header-only auth contract              Decided; execution pending
  -> Phase 3 exit

Phase 4: User/Auth
Phase 5: Commerce
Phase 6: Job/Notification runtime
Phase 7: Observability/Analytics
Phase 8: global review and cleanup
```

Phase 3A establishes the measurable/read-owner foundation through `3-1`/`3-2`. Phase 3B starts with the
browser-to-Postgres mutation calibration in `3-3` and continues through PR owner convergence in `3-4`–`3-6`.
`3-2`/`3-3` have complete verification evidence in the working tree with exit commits pending; `3-4`–`3-6`
remain unexecuted. Phase 3C is the later conflict-closure stage at `3-7`/`3-8`.

Phase numbers after Phase 3 express order, not a frozen sub-slice design. Each later phase is split only after its
entry evidence, authority graph, contract conflicts and low-cost verification plan are refreshed.

## Program Phase Boundaries

| Phase | Intended owner problem | Required entry evidence | Exit shape |
| --- | --- | --- | --- |
| 1 | Freeze observable behavior and authority claims | Repository and durable truth at historical entry | Product invariants, authority paths and conflicts recorded |
| 2 | Establish a read-only structural/runtime baseline and recover trustworthy gates | Phase 1 freeze | Reproducible baseline; Web build and System scenario restored |
| 3 | Prove the target architecture on PR/read/mutation/contracts and close CF-01/CF-02 | `3-1` fitness baseline | `3-1`–`3-8` green; conflicts resolved in durable truth and System journeys |
| 4 User/Auth | Session, OAuth, pending actions, auth transport and user ownership | Phase 3 auth seams stable; current auth SCC/continuity inventory | One explicit session/workflow owner per journey; no duplicate auth truth |
| 5 Commerce | Order/payment/bill/fulfillment/provider authority and compensation | User/Auth contract stable; provider/idempotency matrix | Deep Commerce owners with proven callback, settlement and recovery paths |
| 6 Job/Notification | JobRunner, scheduling, delivery and retry/bootstrap ownership | Commerce side effects stable; runtime topology and retry evidence | Explicit runtime owner, idempotency/retry policy and lifecycle proof |
| 7 Observability | Telemetry, analytics, operational signals and authority boundaries | Prior domain events/surfaces stable | Signals follow domain semantics without becoming product truth |
| 8 Global review | Cross-phase consistency, expired compatibility and report-first findings | Phases 3–7 exited | Global fitness review, targeted cleanup, durable-doc/link/gate reconciliation |

## Program Guardrails

- Later-phase scope must not leak into an earlier phase merely because a dependency is nearby.
- Every executable slice uses poly-file/per-sub-folder task packets, explicit entry delta, rehearsal, evidence index
  and verification log.
- Compatibility is removed only after its replacement has both focused and cross-unit proof.
- Global cleanup is evidence-driven: no broad formatting, directory churn or dead-code deletion disguised as
  architecture progress.
