# Phase 8 Evidence Index

Baseline: `cf6cd736`.

| ID | Kind | Finding | Evidence |
| --- | --- | --- | --- |
| P8-E001 | Git/control | Phase 8 begins at `cf6cd736`; root Node/pnpm files and three independent task-packet directories are protected dirty state | `git status --short`; `git rev-parse HEAD` |
| P8-E002 | Program | at `8-0` entry, Phase 8 was the only unstarted executable Program Phase; Phase 4/5 retain external/deferred boundaries rather than local source slices | `../program-roadmap.md`; `../remaining-work-register.md` |
| P8-E003 | Durable target | Owner span, exposed dependency, module depth/locality, obscurity, verification cost and measured performance form the ordered objective function | `docs/20-product-tdd/architecture-objectives-and-decision-rules.md` |
| P8-E004 | Fitness | the `8-0` entry report is deterministic at 944 files / 3,564 edges / 1 unresolved / 21 findings; Phase 3 comparison is 17 known, 4 new, 108 stale-known | architecture-fitness CLI and unit tests; `01-global-rebase-and-baseline/verification-log.md` |
| P8-E005 | Backend | at `8-0` entry, Phase 3's 110 Backend findings became 7 unchanged controller/repository findings plus 4 new private cross-domain edges | `01-global-rebase-and-baseline/backend-structural-baseline.md` |
| P8-E006 | Backend topology | at `8-0` entry, one eager four-node Trade/Bill SCC expanded to a nine-node full graph when the deliberate RideHailing dynamic import was included | same Backend baseline; exact AST/static edge anchors |
| P8-E007 | Web | at `8-0` entry, Web had 7 model/query reversals, two page raw-RPC findings, one primitive/query finding and one type-only SCC; no new Web fitness finding | `01-global-rebase-and-baseline/web-structural-baseline.md` |
| P8-E008 | Contract SSoT | at `8-0` entry, package contracts used explicit type exports but sourced five groups from entity/service/infra implementation files; 44 Web/System files consumed the stable subpath | `apps/backend/src/contracts.ts`; durable contract rule; cross-unit audit |
| P8-E009 | External/control | Phase 5's edge-log proof is no longer executable after Phase 7 clean-baseline retirement | current callback router; `01-global-rebase-and-baseline/cross-unit-control-plane-audit.md` |
| P8-E010 | Migration provenance | SQL reaches `0096`, Drizzle journal retains only `0000`/`0008`, and CI regenerates then checks drift | `apps/backend/drizzle/meta/_journal.json`; `.github/workflows/backend-db-validate.yml` |
| P8-E011 | Report-first | at `8-0` entry, dead-code exited zero with 37 unused files and additional categories; security exited zero with no Semgrep finding | canonical report commands; `01-global-rebase-and-baseline/verification-log.md` |
| P8-E012 | Disposition | external provider truth, future professional O11y, `notification_deliveries`, product work, unmeasured performance and independent tooling are not Phase 8 cleanup | conflict/disposition register and candidate slice map |
| P8-E013 | Boundary integrity | `8-1` closes all new Backend private edges and replaces the fake canonical signal with deterministic executable fixtures | `02-active-boundary-regressions/verification-log.md` |
| P8-E014 | Contract SSoT | `8-2` preserves 21 package export names while moving all definitions behind Feedback, PR, Storage and Telemetry owner contracts | `03-contract-owner-convergence/verification-log.md` |
| P8-E015 | Web topology | `8-3` removes seven model-to-query reversals and the PR Discovery type SCC; both Web graph modes are acyclic | `04-web-dependency-direction/verification-log.md` |
| P8-E016 | Backend seams | `8-4` removes every controller-to-repository finding and proves User/Notification/PR ownership for the WeChat vertical | `05-backend-controller-seams/verification-log.md` |
| P8-E017 | Commerce topology | `8-5` removes the Trade/Bill and nested RideHailing SCCs while preserving the two deliberate dynamic provider-composition imports | `06-commerce-residual-topology/verification-log.md` |
| P8-E018 | `8-5` exit fitness | report is `971 files / 3,680 edges / 0 unresolved / 3 known / 0 new`; all three findings were proposed `8-6` Web residue | architecture-fitness CLI; `06-commerce-residual-topology/verification-log.md` |
| P8-E019 | Integrated proof | full Backend/Web unit, Backend/System scenarios and `pnpm check:static` pass through `8-5` | `06-commerce-residual-topology/verification-log.md` |
| P8-E020 | Endpoint owners | Admin login is session-workflow owned, PR preview query ownership is at composite depth, and Share remote commands are adapter-owned | `07-proven-residue-closure/01-admin-session-entry/verification-log.md`; `07-proven-residue-closure/02-pr-share-web-owners/verification-log.md` |
| P8-E021 | Compatibility | exact zero-consumer Web bridges, legacy Job adapter/API/alias, two obsolete Job millisecond columns and the unused env alias are retired; retained/external/future rows have explicit exits | `07-proven-residue-closure/03-compatibility-ledger/compatibility-ledger.md` |
| P8-E022 | Control plane | historical evidence is annotated rather than rewritten and Phase 5 external proof no longer depends on retired pseudo-observability | `07-proven-residue-closure/04-control-plane-reconciliation/verification-log.md` |
| P8-E023 | Current fitness | after `8-6`, report is `970 files / 3,679 edges / 0 unresolved / 1 known / 0 new`; the sole finding is the retained terminal WeChat OAuth callback | architecture-fitness CLI; `07-proven-residue-closure/verification-log.md` |
| P8-E024 | `8-6` integration | type/lint/fitness and focused Backend/Web/Backend-scenario/System proof pass on the integrated source tree | `07-proven-residue-closure/verification-log.md` |
| P8-E025 | Final authority | deterministic fitness, zero Backend/Web SCCs, zero controller/repository and model/query residue, owner-backed package contracts and exact compatibility dispositions pass review | `08-global-exit-review/01-architecture-authority-review/final-scorecard.md` |
| P8-E026 | Final behavior | six classic owner/SSoT/transaction/async sequences pass review; canonical static, unit and scenario projects pass | `08-global-exit-review/02-behavior-verification-review/` |
| P8-E027 | Durable handoff | current generative rules are promoted, stale control statements are reconciled and external/future/independent work remains explicit | `08-global-exit-review/03-durable-control-handoff/` |
| P8-E028 | Local completion | final links/diffs/staging pass; Phase 8 is uncommitted at `cf6cd736`, and protected/generated state remains outside the Program | `08-global-exit-review/verification-log.md` |

Reproduction commands and the task-local SCC helper are indexed in
[`01-global-rebase-and-baseline/reproducible-commands.md`](./01-global-rebase-and-baseline/reproducible-commands.md).

## Calibration

- `P8-E004` is a source-graph report, not a runtime trace.
- `P8-E006` records both graph semantics; the nine-node SCC is not described as
  an eager runtime cycle.
- `P8-E008` resolves an auditor disagreement by applying the stronger durable
  owner rule.
- `P8-E011` does not authorize broad deletion.
- `P8-E004`–`P8-E012` are the `8-0` baseline. `P8-E013`–`P8-E019`
  record the executed delta through `8-5`; `P8-E020`–`P8-E024` record `8-6`.
  `P8-E025`–`P8-E028` record the `8-7` final review. Later counts do not
  rewrite any historical baseline.
