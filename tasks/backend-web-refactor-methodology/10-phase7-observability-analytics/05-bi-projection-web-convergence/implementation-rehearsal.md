# `7-4` Implementation Rehearsal

## Inputs Already Obtained

- The Backend Registry owns six strict PR Discovery v1 events and their
  `pr_discovery_funnel` BI usage.
- PR Discovery is the only production BI reader that still selects raw
  telemetry payload.
- Create, Join and Retention already read fact views, but several readers load
  all matching rows and aggregate with JavaScript `Set`/`Map`.
- Existing fact views establish deterministic nearest-prior route/auth
  context using `(occurred_at, event_id)` ordering.
- Web SPM is session-persisted and emitted in `route.entered` attributes; it is
  intentionally absent from PR Discovery payload.
- Three Analytics routes share one 1,206-line page; query hooks currently live
  under the Admin domain.
- System coverage currently proves access only.

No production-data or external-runtime evidence is required for the
behavior-preserving cut-over.

## Expected Sequence

1. Freeze response DTOs, formulas, default/window behavior, event dictionary,
   route names, role gates, query keys, test IDs and `/bi` code scrubbing.
2. Build one controlled event fixture containing duplicate events, missing
   context/dimensions, same-time context tie-breaks, half-open range
   boundaries and a conversion-above-100% case.
3. Generate the next migration prefix and add one forward Discovery fact
   view. Do not edit historical fact migrations.
4. Add its Drizzle view entity and Registry reference declaration.
5. In tests, compare raw-input compatibility output with the typed fact output;
   do not add a production dual-read switch.
6. Switch the reader only after parity, then delete raw payload parsing from
   the production query/model path.
7. Add a real-Postgres route/auth/event fixture and prove typed fact columns,
   unknown context, API filters and response parity.
8. Introduce one controller-owned instant-range schema for all endpoints.
   Apply a maximum only after its decision is ratified.
9. Correct the lifecycle timestamp boundary using the existing timezone-aware
   durable contract and freeze its visible output.
10. Move aggregation to SQL only per query, after an equivalence fixture and a
    query-plan/complexity check show that the change is worthwhile.
11. Create the Web Analytics domain and move one route surface at a time:
    overview, PR funnels, then Discovery.
12. Keep the current route page working until each replacement surface passes
    focused tests; delete the monolith only after all three routes are cut
    over.
13. Run the cross-unit journey from actual Web telemetry emission through
    ingest, fact, API and dashboard.
14. Assert SPM at the fact boundary. Do not assert an SPM dashboard panel
    unless its source-attribution semantics are separately ratified.

## Mental Simulation And Branches

| Situation encountered | Planned response |
| --- | --- |
| historical JSON is malformed or a numeric field cannot cast | guarded SQL extraction yields `NULL`; the fact query never aborts and the dashboard does not parse the payload |
| route/auth context is absent | expose `context_unknown`; never guess or borrow a future event |
| route/auth event has the same timestamp | preserve existing `event_id DESC` tie-break behavior |
| an event name/version drifts from the Registry | Registry fact-reference test fails before dashboard behavior changes |
| a metric needs `pr_id`, rank, action, outcome or handoff reason | project the Registry-governed typed field; do not turn `journey_id` into a command/entity identifier |
| repeated route/auth lateral SQL appears costly | first use the fact-local SQL; extract a narrow helper only after `EXPLAIN` and parity proof |
| SQL aggregation makes the query harder to understand or changes an edge case | retain the typed fact reader and current pure response model; optimization is not a cut-over gate |
| split routes accidentally fetch all dashboards | preserve per-route `enabled` conditions and assert endpoint call counts |
| shared filter state becomes duplicated | one Analytics-owned filter model/composable owns draft, applied, validation and reset state |
| `/bi` route decomposition retains the code query | fail compatibility verification; explicitly assert successful `router.replace` scrubs it |
| `/prd?spm` reaches the fact but no panel can define “source” | keep the fact proof and defer the panel; do not invent first-/last-touch semantics |
| a disputed formula surfaces during characterization | record it as semantic backlog; continue independent structural work |

## Low-Cost Validation Pairing

- Registry/model mutation: two focused Backend unit files.
- Migration/view mutation: migration lint/check plus one real-Postgres
  Analytics scenario.
- API date mutation: one controller/API boundary matrix.
- Each Web route cut-over: one focused component/page test before the full Web
  unit suite.
- Final integration: reuse the existing Analytics access scenario, then add
  one PR Discovery System journey.

This pairing keeps delegated discovery valuable: each implementation batch
has a narrow falsification check before wider canonical gates.

## Stop Conditions

- A production dashboard still reads raw payload.
- A historical migration would need editing.
- Invalid historical payload can make the fact view fail.
- A production dual-read/feature flag is proposed only to make the cut-over
  feel safer.
- Route/auth context semantics differ from the existing fact views without a
  separate decision.
- UI decomposition silently changes formulas, filters, role gates, request
  count or query caching.
- Query optimization lacks parity evidence or makes the owner boundary more
  obscure.
- Source attribution, retention identity or funnel population is guessed.
- A test can pass only by treating raw telemetry as business authority.
