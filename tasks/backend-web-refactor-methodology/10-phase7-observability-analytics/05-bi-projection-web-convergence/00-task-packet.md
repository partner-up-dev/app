# `7-4` — BI Projection And Web Convergence

## Status

**Locally complete on 2026-07-23.** Sir authorized execution through Phase 7
completion and ratified the 31-day range. `7-4A`–`7-4E` now have source,
focused test, real-Postgres, and browser-to-dashboard proof. The canonical
whole-repository gates remain owned by `7-5`.

This slice does not redesign BI formulas under cover of a structural
refactor. It first makes the current formulas testable and gives each
responsibility one owner.

## Objective

Make every production Analytics question read a fact-specific projection or
authoritative business fact, give Backend queries a typed fact boundary, and
give Analytics one coherent Web domain owner.

The target is not merely a smaller Vue file. It is this ownership chain:

```text
Event Registry / business tables
  -> fact-specific PostgreSQL projection
  -> Backend Analytics query + response contract
  -> Web domains/analytics query/model/UI
  -> route-only page assembly
```

Raw telemetry remains the append-only ledger. It is not a dashboard read
model.

## Subtasks And Order

| Subtask | State | Responsibility | Exit proof |
| --- | --- | --- | --- |
| [`7-4A`](./01-contract-and-parity-freeze/00-task-packet.md) | Complete | freeze current routes, response shapes, formulas, filters, date behavior, query keys, test IDs and BI-entry behavior | characterization matrix and parity fixtures |
| [`7-4B`](./02-pr-discovery-fact-cutover/00-task-packet.md) | Complete | add the forward-only PR Discovery fact view, typed Drizzle entity and Registry reference guard; retire the raw-payload reader | migration lint + unit parity + real-Postgres fact/API scenario |
| [`7-4C`](./03-api-query-convergence/00-task-packet.md) | Complete | unify instant-range validation, correct timezone boundary handling and move only proven aggregation to SQL | controller/API boundary matrix + output parity |
| [`7-4D`](./04-web-analytics-owner-decomposition/00-task-packet.md) | Complete | create `domains/analytics`, split the 1,206-line route page into owner surfaces and leave pages as assembly | focused query/model/component tests + access scenario |
| [`7-4E`](./05-cross-unit-proof/00-task-packet.md) | Complete | prove Web emission through ingest/fact/API/dashboard and review the slice for semantic drift | real Web + Backend + Postgres System journey |

The batches are deliberately serial at their cut-over points. Web
decomposition may be prepared after `7-4A`, but the final System proof waits
for the fact/API contract.

## Fixed Scope

1. Add the next forward migration, currently expected to be
   `0096_pr_discovery_funnel_fact_view.sql`; `0095` now retires
   `operation_logs`. Never edit `0067` or `0087`.
2. Project the six Registry-owned PR Discovery v1 events into typed columns.
   The dashboard-facing view exposes no arbitrary `payload`.
3. Preserve existing PR Discovery journey/event counts, dimensions, half-open
   interval and compatibility response fields during cut-over.
4. Carry deterministic nearest-prior route/auth context, including `spm` and
   `source_qr`, with explicit complete/unknown status.
5. Add Discovery to the Registry-to-fact reference guard.
6. Use one shared offset-aware instant-range boundary for all four Analytics
   endpoints; invalid/reversed ranges become 4xx rather than internal errors.
7. Keep Backend Analytics under the repository-declared
   `src/infra/analytics` owner. This is an established infrastructure read
   boundary, so moving it to a new Backend domain would be path churn.
8. Move Web BI semantics out of `domains/admin` into a new
   `domains/analytics`; `admin` retains only access shell/navigation.
9. Replace the shared route-switching page with three thin route entrypoints
   and Analytics-owned overview, PR-funnel and Discovery surfaces.
10. Preserve route names, `analytics` role guards, query keys, query enabling,
    loading/error/refresh behavior, filter semantics and stable test IDs.
11. Preserve `/bi?code=...` login and successful query-code scrubbing.

## Behavior Gates

The structural core does **not** change:

- Create/Join populations, grain, denominators or conversion formulas;
- Retention activity events, identity stitching, cohort or seven-day
  lookahead;
- lifecycle metric meaning;
- PR Discovery six-step ordering or its current possibility of conversion
  above 100% when later-step journeys exceed an earlier step;
- SPM first-touch/last-touch/source attribution semantics; or
- event consent/collection behavior.

The new fact may carry governed fields needed by a future metric without
making that metric part of a response or panel.

Undefined PR-type transition, view-other-PR-types conversion, source/failure
panels and disputed Join/Retention formulas are semantic backlog, not hidden
`7-4` acceptance criteria. See [`decision-log.md`](./decision-log.md).

## Settled Range Decision

The interactive API uses a **31-day maximum**. The Backend-owned default is
the preceding seven days, while the Web explicitly supplies its selected
window. Wider historical analysis requires a separately owned export/read
model rather than an unbounded interactive request.

## Source Map And Verification

- [`spec.md`](./spec.md): target contracts and non-goals.
- [`current-and-target-topology.md`](./current-and-target-topology.md):
  responsibility/dependency change.
- [`source-change-map.md`](./source-change-map.md): exact production/test/doc
  surfaces by batch.
- [`sequences.md`](./sequences.md): classic fact and route sequences.
- [`verification-plan.md`](./verification-plan.md): claim-to-proof matrix and
  widening order.
- [`verification-log.md`](./verification-log.md): read-only evidence sampling
  and packet-consistency result.
- [`implementation-rehearsal.md`](./implementation-rehearsal.md): branches,
  hazards and stop conditions.

## Exit Criteria

- no production Analytics query reads `user_telemetry_events.payload`;
- the Discovery fact projection is Registry-checked, typed and exercised
  against real Postgres;
- all Analytics endpoints share one valid instant-range contract;
- any SQL aggregation introduced is output-equivalent to frozen fixtures;
- Web Analytics owns its queries, models and surfaces;
- Analytics pages are route assembly rather than a second domain owner;
- current access, BI-entry, filters, query keys, states and test IDs remain
  compatible;
- the cross-unit journey proves current behavior without pretending that SPM
  is already a dashboard metric; and
- metric-semantic backlog remains explicit rather than guessed.
