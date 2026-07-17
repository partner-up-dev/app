# Phase 3 Evidence Index

`P3-S01-*` and `P3-S02-*` are stable historical evidence identifiers; they map to executable slices `3-1` and
`3-2` and are not Program Phase numbers.

| ID | Kind | Claim | Evidence / command | Confidence |
| --- | --- | --- | --- | --- |
| P3-BASE-001 | Command | Phase 3 planning entered at `bda22b60`; `3-1` exits on `c634d9b6` after the concurrent quality-gate commit | `3-1` `entry-delta.md`; `git log` | High |
| P3-BASE-002 | Command | Pre-Slice-01 planning scope was 466 Backend files / 51,506 LOC | `entry-baseline.md`; superseded for dirty-tree work by Slice 01 digest | High for that snapshot |
| P3-BASE-003 | Command | Pre-Slice-01 planning scope was 404 Web files / 76,220 LOC, 43 routes | `entry-baseline.md`; superseded for dirty-tree work by Slice 01 digest | High for that snapshot |
| P3-BASE-004 | Source | Anchor Event identity/routes are retired | `git show bda22b60`; current source absence; current PRD/TDD | High |
| P3-BASE-005 | Source | PR Type Config feeds lifecycle, authoring and discovery | `entities/pr-type-config.ts`; discovery/authoring/lifecycle consumers | High |
| P3-BASE-006 | Command | oxc bindings, Web build and System gate recovered | `../05-toolchain-recovery/verification-log.md` | High |
| P3-WEB-001 | Source | `/prd` Page and Panel duplicate catalog/type-detail query ownership | `PRDiscoveryPage.vue:153-181`; `PRDiscoveryPanel.vue:147-213` | High |
| P3-WEB-002 | Durable | `/prd` route page delegates one workflow owner | `docs/20-product-tdd/pr-discovery-and-authoring-contracts.md:71-72` | High |
| P3-BE-001 | Source | `domains/pr` is canonical while `pr-core` remains compatibility | `domains/pr/index.ts`; `domains/pr-core/index.ts` | High |
| P3-BE-002 | Source | PR Type Config repository is directly consumed by multiple domains | focused `rg PRTypeConfigRepository apps/backend/src/domains` | High |
| P3-XU-001 | Durable | `AppType` is compile-time only; runtime is validated HTTP | `docs/20-product-tdd/cross-unit-contracts.md` | High |
| P3-XU-002 | Durable | System proof is Browser → Vite → Backend HTTP → isolated Postgres | `docs/20-product-tdd/test-platform.md` | High |
| P3-S01-001 | Command | Current `3-1` digest covers 465 Backend + 404 Web production files, 3,236 edges and 125 known / 0 new findings | `01-baseline-and-fitness/evidence-index.md`; reviewed JSON baseline | High |
| P3-S01-002 | Verification | Architecture constitution/local rules/tool fixtures/type checks all pass their focused gates | `01-baseline-and-fitness/verification-log.md` | High |
| P3-S02-001 | Source | `/prd` has one route-scope workflow owner and Page/Panel no longer invoke duplicate read hooks | `02-pr-discovery-read-owner/entry-delta.md`; source probes | High |
| P3-S02-002 | Verification | `3-2` Web/static/targeted/full System gates pass with 0 new fitness findings | `02-pr-discovery-read-owner/verification-log.md` | High |
| P3-S03-001 | Source/test | Feedback command, form and PR integration now have distinct owners and retryable failure behavior | `03-feedback-submission-vertical/evidence-index.md` | High |
| P3-S03-002 | Verification | Browser→HTTP→canonical refetch→Postgres proof and all exit gates pass with 0 new fitness findings | `03-feedback-submission-vertical/verification-log.md` | High |

New evidence entries must include cwd, scope/exclusions, exit code and result summary. Proposals do not become
facts merely because they appear in a slice plan.
