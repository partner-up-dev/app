# Migration And Verification Plan

This execution skeleton records the implemented sequence and remaining release gates.

## Phase 0 - Resolve Product Ambiguity

1. Record the accepted FORM/CARD/LIST PR-owned view model and revisionless ratios.
2. Retain title/cover, community entry, time-editor profile, preference submissions, route applications, and discovery analytics under precise PR owners; retire their Event identity and names.
3. Choose legacy Event-link retirement policy and compatibility owner.
4. Record `LIST` as the canonical characterized fallback when all landing ratios are zero; correct durable truth during Solidify.
5. Decide the one-time treatment of legacy non-ACTIVE rows from live-data evidence. Do not design replacement ACTIVE/PAUSED/ARCHIVED semantics.

Exit: no unresolved decision changes the target contract or capability inventory.

## Phase 1 - Characterize Current Behavior And Data

- verify live `anchor_events.type` uniqueness constraint and audit duplicate normalized values;
- inventory legacy rows by status and every PR/config/read dependency they still influence;
- capture behavior tests for every capability that will survive;
- classify each old Event occurrence as business domain, telemetry/DOM/provider term, historical migration, or compatibility;
- record current snapshot-versus-live behavior per field without adding a propagation/version taxonomy;
- prove dead/stub candidates before deleting them, including retired Batch paths.

Exit: behavior reduction is explicit; migration does not depend on `findOneByType` choosing an arbitrary row.

## Phase 2 - Establish PR-owned Backend Contracts

- define PR Discovery reads selected by `PR.type` and discovery criteria;
- define PR Authoring commands for assisted creation and creation suggestions;
- move Participation, Coordination, and Completion policies to their consumers;
- split persistence repositories from resolvers/projections/policies;
- make one discovery qualification/ranking policy authoritative;
- remove Anchor Event status checks instead of migrating them into another lifecycle;
- keep old `/api/events` only as a temporary adapter if compatibility is required.

Exit: canonical contracts contain no Event identity and no new config revision/version.

## Phase 3 - Migrate Frontend To `/prd`

- create the thin `PRDiscoveryPage` route owner;
- move surviving models/controls/surfaces into PR Discovery, PR Authoring, or precise support domains;
- switch queries and commands to PR-owned backend contracts;
- remove Event state from handoff, PR detail/join/waitlist, auth replay, home/about, location/route application flows;
- migrate telemetry, i18n, testids, CSS, fixtures, and admin controls with their semantic owner;
- delete frontend Event pages/domain/query keys, then remove legacy redirects at the chosen sunset boundary.

Exit: canonical web source has no Anchor Event business concept; `/prd` and `/pr/:id` carry the journey.

## Phase 4 - Migrate Runtime Configuration And Admin Ownership

- move current type-keyed data into consumer-owned configuration slices or a shallow persistence shape;
- retain `PR.type` as the direct key and enforce one current configuration per type;
- split the current all-concern admin mutation into qualified controls;
- preserve PR-owned materialized facts;
- do not add config history, version, revision, effective time, or PR-side config reference.

Exit: there is no replacement god object and no overlapping `pr-core` / `pr` / `anchor-event` behavior authority in the affected graph.

## Phase 5 - Remove Compatibility And Historical Runtime Paths

- delete AnchorEvent runtime entity/repositories/controllers/use cases after all canonical consumers move;
- retire or isolate old API routes and Problem codes;
- preserve applied migrations and raw historical telemetry rows; retire Event-specific fact views as live domain authority;
- remove aliases, dead code, stale Batch vocabulary, and no-longer-used experiment revision fields;
- update durable PRD/TDD/deployment truth and migration/runbook evidence.

Exit: only explicitly allowlisted historical/telemetry/provider uses of `event` remain.

## Verification Matrix

| Concern | Evidence |
|---|---|
| PR identity/classification | Regression tests prove `PR.type` values and matching behavior are unchanged. |
| No configuration version | Schema/API/type scan shows no new revision/version/effective-time field or resolver input. |
| Discovery | Scenario tests cover `/prd` catalog/criteria, matched candidate, no-match, assisted create, and `/pr/:id` handoff. |
| Participation/Coordination/Completion | Existing policy behavior tests move with the real owner and cover config-present/missing cases. |
| Route semantics | Router AST has one canonical `/prd` discovery entry; no canonical route reads `eventId`. |
| Frontend dependency | AST import graph has no `domains/event` or admin Anchor Event UI dependency. |
| Naming | Semantic-cluster checks cover `type/kind/mode/status/state/source/context`, not a raw global replacement. |
| Compatibility | Each surviving old URL/API/Problem code has one adapter owner and deletion condition. |
| Telemetry/BI | Raw historical telemetry remains retained, Event-specific fact views are retired, and new PR Discovery telemetry uses qualified fields with no Event identity. |
| Complexity | One query/command owner per workflow; pages are route-only; repository interfaces are persistence-only; dead aliases/stubs are removed. |

## Structural Deletion Proof

Use AST/import/route/type scans as the primary proof, then residual text search with an allowlist. A raw `rg event` result is not a failure by itself because DOM events, telemetry events, provider callbacks, and applied migrations are legitimate.

Required final assertions:

1. no import path or exported frontend type owned by `domains/event`;
2. no canonical route/query key/DTO/process state contains `AnchorEvent`, `eventId`, `fromEvent`, `assignmentRevision`, `EVENT_ASSISTED`, or Event-prefixed testids;
3. no runtime backend resolver depends on AnchorEvent identity after type-keyed capabilities move;
4. no new scenario/config identity or version field exists;
5. every allowlisted residual has a classified owner: historical migration, BI fact, telemetry/DOM event, provider protocol, or time-bounded compatibility.
