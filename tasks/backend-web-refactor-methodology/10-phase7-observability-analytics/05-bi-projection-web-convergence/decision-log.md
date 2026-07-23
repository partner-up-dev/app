# `7-4` Decision Log

| ID | State | Decision / recommendation | Consequence |
| --- | --- | --- | --- |
| D7-4-01 | Fixed by durable authority | lifecycle/state questions read business facts; behavior funnels read fact-specific telemetry projections | raw telemetry cannot become business truth |
| D7-4-02 | Architecture decision | keep Backend Analytics in `src/infra/analytics` | honors the Backend-local owner map and avoids non-semantic directory churn |
| D7-4-03 | Architecture decision | create Web `src/domains/analytics`; Admin owns only access shell/navigation | BI queries, models and surfaces gain one semantic owner |
| D7-4-04 | Architecture decision | use a behavior-equivalent fact cut-over with test-only parity; no production dual read | fewer runtime branches and no temporary architecture to retire |
| D7-4-05 | Architecture decision | the new Discovery view carries typed Registry fields and nearest-prior route/auth context, but no arbitrary payload | dashboard query/model code stops parsing JSON |
| D7-4-06 | **Ratified by Sir on Phase start** | cap interactive Analytics ranges at **31 days** | one shared API boundary rejects costly ranges predictably |
| D7-4-07 | **Ratified scope boundary on Phase start** | project and verify `spm`/`source_qr`, but do not add a source panel until attribution grain/formula is defined | cross-unit proof remains truthful without inventing first-/last-touch semantics |
| D7-4-08 | Fixed compatibility | preserve current funnel/retention formulas and response shapes during structural work | semantic defects remain visible follow-up work rather than accidental changes |
| D7-4-09 | Conditional | push aggregation into SQL only after fixture equivalence and query-plan/complexity evidence | optimization cannot block raw-reader retirement or create obscure SQL |
| D7-4-10 | Fixed compatibility | preserve `/bi` login and successful query-code scrubbing | page decomposition cannot leak the seed PIN in URL/history |
| D7-4-11 | Deferred semantic backlog | PR-type transition, view-other conversion, source/failure panels, disputed Join denominator and Retention identity/population | each needs a named formula and separate acceptance tests |

## Decision Interpretation

D7-4-02 through D7-4-05 are architecture choices within the delegation Sir
already gave for target-structure decisions. Sir's explicit authorization to
execute through Phase 7 completion accepted the presented 31-day range and
source-panel deferral. No open decision remains before `7-4A`–`7-4E`.
