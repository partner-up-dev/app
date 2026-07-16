# Implementation Verification — 2026-07-16

> Amended after frontend product review: the initial `/prd` implementation had
> replaced, rather than migrated, the former Landing behavior. The correction
> and its browser-level evidence are recorded in
> [`2026-07-16-frontend-product-regression.md`](./2026-07-16-frontend-product-regression.md).

## Status

The corrected AnchorEvent removal implementation is locally code-complete and
release-gated.
Canonical runtime behavior is owned by PR lifecycle capabilities, current
configuration is selected directly by `PR.type`, and no configuration identity
or version mechanism was introduced.

This evidence is not staging or production cutover approval.

## Implemented Owner Model

| Owner | Implemented authority |
|---|---|
| PR Authoring | Type-selected place/time/default suggestions, creation eligibility, preference submission, ordinary structured-create handoff, and notes fallback materialization. |
| PR Discovery | `/prd` catalog, FORM/CARD/LIST view policy, joinable candidates, LIST browse/history records, card grouping, recommendation, and no-match ordinary-create selection. All-zero ratios resolve to LIST. |
| PR Participation | Confirmation/join-lock snapshots, PR-owned join gates, current frequency policy, capacity expansion decision, and participant release effects. |
| PR Coordination | Effective meeting-point resolution by PR/type/location/POI and notification scheduling when current type guidance changes. |
| PR Completion | Questionnaire template validation and create-time questionnaire-instance materialization. |
| Admin/support | Create-once PR Type Configuration plus owner-specific Authoring, Discovery, Participation, Coordination, and Completion mutations; preference moderation and PR management remain separate. |
| Telemetry/BI | Qualified PR Discovery journey events and funnel; raw historical telemetry retained while Event-specific fact views are retired. |

Creation reads current type configuration once and delegates snapshots to the
physical owner modules. The coordinator does not expose a general-purpose
"materialize defaults" API.

## Structural Deletion Proof

AST and text scans covered `apps/backend/src`, `apps/web/src`, backend/system
tests, and durable PRD/TDD/deployment docs.

- No runtime `AnchorEvent`, `anchor_event`, Event business route, `/api/events`,
  `/e/:eventId`, `fromEvent`, `EVENT_ASSISTED`, or `assignmentRevision` remains.
- No runtime `scenarioKey`, `configVersion`, `effectiveAt`, type identity alias,
  or PR-side configuration reference was added.
- `PR.type` remains the direct value and lookup key. `kind` is limited to real
  discriminated unions such as location/route, start rule, join gate, and
  pending action.
- Place input is consistently `{ kind: "location", location }`; the sole
  `locationId` match is a negative test proving that the old shape is rejected.
- Remaining `eventId`/`event_id` uses are generic telemetry/BI event identity.
  Remaining `revision` uses are PR share-content cache revisions. Historical
  Anchor Event identifiers remain only in applied migrations/schema snapshots
  and the forward migration that consumes or drops them.
- Canonical routes are `/prd`, `/pr/:id`, `/api/pr/authoring`, and
  `/api/pr/discovery`.

## Verification Results

| Layer | Command/evidence | Result |
|---|---|---|
| Owner materialization focused | Four focused backend files | PASS — 4 files, 9 tests. |
| Admin owner slices focused | `update-slices.test.ts` | PASS — 1 file, 5 tests, including Coordination notification dispatch and missing Completion template rejection. |
| Backend unit | `pnpm test:unit:backend` | PASS — 78 files, 337 tests. |
| Backend scenario | `pnpm test:scenario:backend` | PASS — 21 files, 71 tests. |
| Web unit | `pnpm test:unit:web` | PASS — 39 files, 130 tests. |
| Web owner models focused | Discovery, Authoring, Admin config editor | PASS — 3 files, 18 tests. |
| All-zero view behavior | Discovery unit plus HTTP scenario | PASS — missing/all-zero configuration returns LIST; HTTP response retains `{ FORM: 0, CARD: 0, LIST: 0 }`. |
| Type checking | `pnpm check:type` | PASS — backend, Web, fake WeChat Pay, and fake Caocao. |
| Lint/policy | `pnpm check:lint` | PASS — AST structure, Problem Details, token strict, payment supply chain, and migrated PR time guardrail. The report-only naming audit has two pre-existing commerce `*Content` findings outside this task. |
| Canonical format gate | `pnpm check:format` | PASS. |
| DB static | `pnpm db:lint`, `pnpm db:check` | PASS. |
| Backend build | `pnpm check:build:backend` | PASS — runtime bundle and FC DB-migrate bundle. |
| Web build | `pnpm check:build:web` through `pnpm check:static` | PASS — Vue type check and Vite production build. |
| PR Discovery browser scenario | `vitest run --project system-scenario tests/scenario/pr-discovery/pr-discovery.scenario.test.ts` | PASS — 1 file, 10 tests using the real Web client, backend HTTP, and isolated database. |
| Frontend visual evidence | 390 x 844 RIDE_HAILING FORM, LIST, and CARD captures | PASS — the migrated Landing shell and type-specific interactions are present. |
| Dead-code report | `pnpm check:dead-code` | PASS as report-first — three unused alternatives introduced during the correction were deleted; remaining findings are repository-wide report items. |
| Patch integrity | `git diff --check` | PASS; index remains empty. |
| Security report | `pnpm check:security` | REPORT SKIPPED — Semgrep is not installed locally; CI owns installation. |

The root PR-time guardrail initially failed because it still read deleted Event
files. It now verifies the PR Discovery boundary and Authoring handoff instant
contract, and the full root lint gate passes.

## Isolated Database Cutover Rehearsal

The current migration set was executed against an isolated temporary database.

- 84 production migrations applied; 2 development-only migrations skipped.
- Both seed files ran twice successfully, proving the current seed path is
  idempotent for this rehearsal.
- `pr_type_configs` existed after cutover.
- `anchor_events`, `anchor_event_preference_tags`, and
  `anchor_event_route_applications` did not exist after cutover.
- Temporary databases were dropped; no `codex_cutover_%` or `codex_guard_%`
  databases remained.

`0087_drop_anchor_events.sql` drops without `CASCADE` and now fails closed for:

- whitespace or duplicate normalized ACTIVE types;
- ACTIVE rows not migrated to PR Type Configuration;
- non-terminal PRs that still depend on non-ACTIVE types;
- pending preference tags under non-ACTIVE types;
- pending route applications.

A negative rehearsal inserted a pending route application into a separate
isolated pre-0087 database. `0087` stopped with
`Anchor Event cleanup blocked: pending route applications require resolution`,
and its migration-ledger count remained zero.

## Frontend Behavior-Equivalence Correction

The first `/prd` implementation passed contract-oriented checks but replaced
the old Landing UI with generic LIST/CARD/FORM projections. That was a product
regression, not an acceptable consequence of removing Event identity.

The corrected frontend ports the established shell and interactions into PR
Discovery/Authoring owners. The browser scenario now exercises the shell and
three modes, all-zero-to-LIST fallback, RIDE_HAILING route selection/reversal
and route application, complete LIST cards and creation suggestions, CARD
deck/skip/detail/empty-create, matched join handoff, no-match candidate flow,
direct ordinary creation, and FORM-state reset across view changes. It also
protects LIST's OPEN/READY/ACTIVE current records and bounded CLOSED history,
hides EXPIRED records, and verifies the explicit catalog escape for a genuine
view-resolution failure.

The system scenario exposed a real pointer-routing defect that component tests
had missed: the outer carousel captured the pointer on `pointerdown`, preventing
the nested route card from receiving an ordinary click. Pointer capture now
starts only after a horizontal drag axis is established. A focused component
test protects both the click and drag cases. The final browser pass additionally
found that the error notice could collapse to zero width; the PR Discovery panel
now owns full available width, keeping the failure and its catalog escape
visible. A 500 ms view-resolution timeout remains a non-persisted LIST fallback,
while non-timeout errors remain explicit.

## Remaining Release Gates

Before applying the destructive migration outside an isolated database:

1. take and restore-test a backup;
2. run the production data/dependency/traffic audit and resolve every migration
   guard rather than bypassing it;
3. confirm old API and URL traffic is zero or handled by an approved edge-only,
   time-bounded redirect;
4. run CI security/dead-code reports and a `/prd` manual smoke test in the
   release environment.
