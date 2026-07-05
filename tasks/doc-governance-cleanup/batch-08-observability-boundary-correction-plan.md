# Batch 8: Observability Boundary Correction Plan

## Scope

This batch corrects a boundary issue introduced or exposed by Batch 7:

- `docs/40-deployment/observability.md` currently mixes program/runtime
  observability with Business Intelligence and user-behavior observability.
- User-behavior telemetry, analytics aggregates, funnel metrics, and BI routes
  are product-facing observability surfaces. Their product meaning belongs to
  PRD, and their cross-unit realization may belong to Product TDD.
- Deployment observability should primarily describe program behavior,
  deployment/runtime signals, operational failure signals, and alerting gaps.

User correction:

> 当前所谓的 o11y 更多是服务于 Business Intelligence，是用户行为的可观测性而不是程序行为的可观测性，然而 deployment/observability 可能更合适程序行为可观测性的说明，用户行为可观测性可以被视为产品需求。

## Objective

Separate observability into two owner families:

- deployment observability: program behavior and operational/runtime signals
- product / BI observability: user behavior, funnel metrics, analytics product
  surfaces, and BI semantics

This batch should make `docs/40-deployment/observability.md` a program/runtime
observability document while routing BI/user-behavior observability to the
correct durable owner.

## Proposed Segments

### Segment 1: Reframe Deployment Observability

Files likely touched:

- `docs/40-deployment/observability.md`

Durable changes:

- Rename or reframe the opening around program/runtime observability.
- Keep deployment-owned signals:
  - FC request metrics
  - FC instance metrics
  - Aliyun Log Service project/store
  - `/health`
  - `/internal/maintenance/tick`
  - migration/deploy failure signals
  - backend FC deploy and alias publication failure signals
  - frontend ESA deploy failure signals
  - job-runner trigger/tick failures and backlog symptoms
  - notification delivery failures as runtime/provider failure evidence
  - OAuth/config failures as runtime configuration evidence
  - provider callback edge failures
- Remove BI/user-behavior product semantics from deployment-owned sections:
  - `user_telemetry_events`
  - `user_telemetry_rejected_events`
  - `/api/telemetry/user/events`
  - `/api/analytics/*`
  - `/api/analytics/anchor-event-funnel`
  - `/admin/analytics`
  - `/bi?code=...`
  - Anchor Event -> PR conversion product funnel semantics
- Add a short adjacent-boundary note:
  - user-behavior telemetry and BI surfaces may help diagnose some runtime
    problems, but their product meaning and success metrics are not deployment
    observability truth.

State diff:

```text
deployment observability lists BI/user-behavior product surfaces as operational signals
  -> deployment observability owns program behavior signals and points BI semantics away
```

### Segment 2: Add Product / BI Owner Route

Files likely touched:

- `docs/10-prd/index.md` or a focused PRD behavior/product analytics doc
- possibly `docs/20-product-tdd/index.md` or a focused Product TDD analytics /
  telemetry contract doc if the current Product TDD layer has a matching owner

Preferred decision:

- Keep this segment minimal unless existing PRD/Product TDD files already have
  a clear analytics/telemetry owner.
- If no clear durable owner exists, add only a task-local follow-up note and do
  not force-create a broad analytics doctrine in this batch.

Candidate durable ownership:

- PRD owns:
  - why user behavior is observed
  - BI user stories
  - product metric semantics
  - funnel definitions and business interpretation
  - analytics/admin surfaces as user-visible capabilities
- Product TDD owns only when needed:
  - frontend event registry to backend ingest contract
  - backend validation / rejection contract
  - projection and analytics API authority
  - trace/journey correlation boundary when it crosses units
- Deployment owns:
  - whether the runtime is emitting, accepting, storing, and serving signals
    without operational failure
  - alerting and runtime diagnostic gaps

State diff:

```text
BI/user-behavior observability has no explicit durable owner route
  -> BI semantics route to PRD and cross-unit telemetry realization routes to Product TDD when needed
```

### Segment 3: Reclassify Observability Gaps

Files likely touched:

- `docs/40-deployment/observability.md`
- optional PRD/Product TDD owner route touched in Segment 2

Durable changes:

- Keep deployment gaps only when they concern runtime operations:
  - centralized alerting policy
  - cross-instance maintenance overlap
  - operational UI for logs only if framed as an operator surface, not a BI
    product surface
- Move or route product/test gaps:
  - source-attribution scenario coverage for `/e/:eventId?spm=...`
  - BI funnel release gates
  - analytics dashboard meaning

State diff:

```text
observability gaps mix deployment, product analytics, and test-platform follow-up
  -> deployment gaps stay in deployment; product/test gaps route to their durable owners
```

## Out Of Scope

- Changing telemetry runtime code.
- Changing analytics APIs or dashboard behavior.
- Adding alerting infrastructure.
- Adding scenario tests.
- Reworking the full PRD analytics topology unless existing docs clearly support
  a small owner route.
- Reopening Batch 7 runtime topology split.

## Impact Handshake

Address and Object:

- primary:
  - `docs/40-deployment/observability.md`
- possible owner route updates:
  - `docs/10-prd/index.md`
  - existing PRD behavior/capability docs if they already own analytics or BI
  - `docs/20-product-tdd/index.md`
  - existing Product TDD telemetry/analytics contract docs if present
- task-local record:
  - this batch file
  - `tasks/doc-governance-cleanup/README.md`

State Diff:

```text
deployment observability includes user-behavior/BI observability as first-class operational signals
  -> deployment observability focuses on program/runtime behavior and routes BI/user-behavior semantics to PRD/Product TDD
```

Blast Radius Forecast:

- Medium documentation ownership blast radius.
- Low runtime blast radius: documentation-only.
- The main risk is losing useful runtime diagnostic references to analytics
  tables. Keep a small adjacent-boundary note instead of deleting all mention
  of those surfaces.

Invariants:

- `docs/40-deployment/` remains owner for runtime, rollout, observability, and
  recovery truth.
- User-behavior observability is not treated as deployment truth just because it
  uses telemetry infrastructure.
- PRD owns product meaning and user-visible BI value.
- Product TDD owns cross-unit telemetry/analytics realization only when the
  technical contract crosses units.
- No runtime behavior changes.

Verification:

```bash
rg -n 'user_telemetry|/api/analytics|anchor-event-funnel|/admin/analytics|/bi\\?code|BI|Business Intelligence|source-attribution|spm' docs/40-deployment docs/10-prd docs/20-product-tdd tasks/doc-governance-cleanup -g '*.md'
rg -n 'FC request metrics|FC instance metrics|Log Service|/health|/internal/maintenance/tick|alert|job runner|callback edge|notification_deliveries' docs/40-deployment/observability.md
git diff --check -- docs/40-deployment docs/10-prd docs/20-product-tdd tasks/doc-governance-cleanup
```

Manual review:

- confirm deployment observability reads as program/runtime observability
- confirm BI/user-behavior semantics are not silently deleted
- confirm any PRD/Product TDD route is narrow and owner-correct
- confirm deployment still mentions analytics/telemetry only as adjacent
  diagnostic evidence, not as the owner of product metric meaning

## Proposed Execution Order

1. Reframe `docs/40-deployment/observability.md`.
2. Search PRD/Product TDD for existing analytics/telemetry owner docs.
3. Add the smallest owner route needed; if no owner exists, record a follow-up
   instead of creating a large new product analytics document.
4. Reclassify gaps and verify references.

## Execution Record

Executed after explicit user start.

Segment 1 completed:

- `docs/40-deployment/observability.md` now opens with deployment and
  program-runtime observability as its owner boundary.
- Runtime-owned signals were kept:
  - FC request / instance metrics
  - Aliyun Log Service project/store
  - `/health`
  - `/internal/maintenance/tick`
  - `operation_logs`
  - `jobs`
  - `notification_deliveries`
  - migration/deploy, job-runner, notification, OAuth/config, and provider
    callback edge failure symptoms
- BI and user-behavior surfaces are now listed only under an adjacent product
  observability boundary.

Segment 2 completed:

- Existing Product TDD owners were found and reused:
  - `docs/20-product-tdd/analytics-and-telemetry-contracts.md`
  - `docs/20-product-tdd/bi-domain-contracts.md`
- `docs/20-product-tdd/analytics-and-telemetry-contracts.md` now clarifies:
  - Product/BI metric meaning belongs upstream in PRD when promoted as a product
    requirement.
  - Program-runtime procedures, operational signals, and alerting belong in
    deployment observability.
- `docs/10-prd/behavior/capabilities.md` now includes a minimal BI product
  capability under Support And Operations.

Segment 3 completed:

- `docs/40-deployment/observability.md` keeps deployment gaps for centralized
  alerting and cross-instance maintenance overlap.
- Operation-log UI is framed as a product/admin surface follow-up if needed.
- BI source-attribution scenario coverage is explicitly routed to Product TDD /
  test-platform follow-up.

Verification performed:

```bash
rg -n 'user_telemetry|/api/analytics|anchor-event-funnel|/admin/analytics|/bi\?code|BI|Business Intelligence|source-attribution|spm' docs/40-deployment docs/10-prd docs/20-product-tdd tasks/doc-governance-cleanup -g '*.md'
rg -n 'FC request metrics|FC instance metrics|Log Service|/health|/internal/maintenance/tick|alert|job runner|callback edge|notification_deliveries' docs/40-deployment/observability.md
git diff --check -- docs/40-deployment docs/10-prd docs/20-product-tdd tasks/doc-governance-cleanup
```
