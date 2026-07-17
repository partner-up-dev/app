# Next-slice Readiness

> **Historical candidate ranking.** 本表形成于 Anchor Event 迁移和 toolchain recovery 之前。
> 当前 slice 顺序、依赖与退出门见 `../06-phase3/slice-map.md`；旧 Event Form Mode 候选不得
> 解释为恢复 Event identity。

## Status

Phase 3 is now active and controlled by `../06-phase3/`. This file records only the historical entry conditions
and candidate evidence that informed the superseding order; it does not authorize or sequence current work.

## Entry Conditions

- Phase 1 frozen boundaries have no unresolved owner conflict for the candidate slice.
- Phase 2 has a repeatable source/dependency baseline and an explicit gate baseline.
- The candidate slice has observable behavior, a bounded blast radius, and a rollback/forward-fix strategy.
- Characterization, Backend scenario, and System scenario gaps are explicit.
- The user gives a later explicit start for application mutation.
- `oxc-parser` blockers are owner-approved and Web build/System scenario produce real results.
- A candidate touching PR creation or waitlist has satisfied `CF-01`/`CF-02` respectively.

## Candidate Comparison

| Candidate | Learning value | Existing evidence | Blast radius | Missing safety net | Readiness |
| --- | --- | --- | --- | --- | --- |
| Feedback questionnaire vertical slice | Exercises controller/use-case/repository, typed Web mutation and persisted answers without OAuth/provider transactions | Backend feedback scenario exists; focused domain/query surfaces are present | Low–medium | No dedicated root system journey identified; toolchain blocks adding/running one | Best calibration candidate after baseline repair; still a proposal. |
| Event Form Mode state-machine slice | High Web duplication/ownership learning; explicit Unit TDD and semantic anchors | Event contracts, Web Unit TDD, three anchor-event system scenario files | High: event + PR creation + OAuth replay | `CF-01` for user-owned create; System scenario currently blocked | Strong second candidate or narrow UI-only extraction; not safe as unrestricted first slice. |
| PR canonical read-only slice | Tests canonical projection, query/cache and page assembly without changing commands | Strong PR contracts, unit tests and existing PR system journeys | Medium | Must measure per-card request behavior; avoid create/waitlist subpaths | Potentially ready after toolchain repair if strictly read-only. |
| Admin analytics/panel slice | Tests page decomposition and query ownership with little user-domain mutation | Existing admin architecture and one root admin scenario file | Medium | Sparse journey evidence; naming findings already exist | Candidate for Web-local refactor after selecting one route/panel. |
| Commerce/Payment/RideHailing | Exercises hardest transaction/provider/compensation boundaries | Backend commerce/payment/ride scenarios and two root commerce scenario files | Very high | Provider idempotency/compensation matrix and green System scenario | Not a calibration slice. |
| OAuth/RPC/global process | Could eliminate the Web SCC and split the largest Backend controller | Strong durable handoff contract, but compatibility errors and direct callback RPC remain open | Very high/security-sensitive | Focused callback/handoff system matrix; OQ-01/OQ-03; green System scenario | Defer until migration protocol is proven. |

## Not A Design Decision

Candidate ranking does not freeze a target architecture or authorize code changes.

The earlier “feedback first” and Web workstream “Form Mode first” suggestions are
not contradictory facts: the former optimizes calibration risk, the latter
optimizes immediate Web learning value. The table keeps both hypotheses and the
evidence that would select between them.
