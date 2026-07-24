# `8-0` Current And Target Scorecard

The scorecard follows the durable ordered objective function. It deliberately
does not collapse unlike evidence into a synthetic numeric score.

| Objective | Current evidence | Target / disposition | Priority |
| --- | --- | --- | --- |
| Preserve behavior and one semantic owner | Phases 3–7 have canonical local proof; `8-0` made no behavior changes | every source slice freezes its HTTP/state/atomicity invariant first | invariant |
| Reduce owner span | 7 Backend controller/repository edges; 4 new private cross-domain edges; Commerce Trade/Bill/Ride SCC | public semantic seams first, then behavior-specific controller verticals; no generic service or transaction helper | P0/P1 |
| Reduce exposed dependency | 7 Web model/query reversals; Backend package contract derives from entity/service/infra files | owner-backed contract/value modules and adapter mapping, without handwritten duplicate wire DTOs | P0/P1 |
| Increase module depth/locality | Phase 2 large SCCs and PR dual owner are gone; one Web type SCC and one Commerce SCC remain | remove accidental cycles while preserving intentional delayed provider isolation | P1 |
| Reduce obscurity | one unresolved fake canonical import; historical packet status/proof procedures drift from `HEAD` | real canonical exemplar, current control-plane indexes and explicit external/future boundaries | P1 |
| Control verification/migration cost | fitness report is deterministic; report-first gates execute; Drizzle journal/generator provenance is unclear | keep fitness cheap; verify artifact provenance independently; do not mutate DB from inference | P1/independent |
| Improve measured performance | Viewer Bill 1+N and Admin read composition are known hypotheses without current request/query-plan measurements | no Phase 8 mutation until a focused baseline proves material cost | deferred |

## Phase 3 To Current Fitness Delta

```text
Phase 3 reviewed findings: 125
  Backend pr -> pr-core:                 50
  Backend controller -> repository:       7
  Backend cross-domain private:           53
  Web model -> query:                       9
  Web model -> transport:                   3
  Web page raw RPC:                         2
  Web UI primitive -> query:                1

Phase 8 current findings:                 21
  known:                                   17
  new:                                      4
  stale-known:                            108
```

The improvement is material, but the four new findings show why a historical
baseline cannot become permanent permission. The final target is:

- no new private cross-owner edge;
- no unresolved production import;
- no model-to-query reverse dependency;
- no controller-to-repository edge;
- package contracts sourced from owner-backed contracts rather than
  entity/service/infra implementations;
- no eager Commerce import cycle;
- the direct WeChat OAuth callback retained only as the explicit named
  compatibility exception; and
- any other remaining exception documented with owner, reason and exit
  condition.

## Non-score Signals

LOC, file count, large-file count, raw edge count, unused export count and full
dynamic SCC size remain diagnostics. They are not success criteria unless a
slice connects them to owner span, exposed dependency, obscurity or measured
runtime cost.
