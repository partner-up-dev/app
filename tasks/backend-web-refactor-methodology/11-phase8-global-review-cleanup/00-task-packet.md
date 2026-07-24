# Phase 8 — Global Review And Cleanup

## Status

**Phase 8 `8-0`–`8-7` is complete locally on 2026-07-24.** Sir explicitly
authorized `8-6` and `8-7`; all source, review, durable and canonical gates
are closed on the working tree. The Phase remains uncommitted at `HEAD`
`cf6cd736`.

## Objective And Hypothesis

Rebase the completed Phase 3–7 program onto current `HEAD`, measure the system
against the durable ordered objective function, and distinguish:

1. active architecture defects that still increase owner span, exposed
   dependency or obscurity;
2. expired compatibility and documentation/control-plane drift;
3. evidence-backed performance or verification gaps;
4. external observations and product/data decisions that are not local cleanup;
5. independent tooling work that must not enter the refactor commit graph.

Hypothesis: a current topology/authority/verification rebase can reduce the
final cleanup to a few evidence-backed vertical slices. Starting from stale
Phase 2 counts or broad dead-code/line-count cleanup would recreate the
complexity this program is meant to remove.

## Current Control Point

[`01-global-rebase-and-baseline/`](./01-global-rebase-and-baseline/) owns
completed Program slice `8-0`.

The evidence-backed `8-1`–`8-7` packets are numbered and organized by one
sub-folder per executable slice. All are complete locally.

`8-0` classified each finding as:

- local structural cleanup candidate;
- compatibility-window closure candidate;
- documentation/control-plane reconciliation;
- measured optimization candidate;
- external evidence;
- product/data decision;
- future independent program; or
- no action.

## `8-0` Outputs

- [Backend structural baseline](./01-global-rebase-and-baseline/backend-structural-baseline.md)
- [Web structural baseline](./01-global-rebase-and-baseline/web-structural-baseline.md)
- [Cross-unit/control-plane audit](./01-global-rebase-and-baseline/cross-unit-control-plane-audit.md)
- [Current/target scorecard](./01-global-rebase-and-baseline/current-and-target-scorecard.md)
- [Conflict/disposition register](./01-global-rebase-and-baseline/conflict-and-disposition-register.md)
- [Candidate slice map](./01-global-rebase-and-baseline/candidate-slice-map.md)
- [Verification log](./01-global-rebase-and-baseline/verification-log.md)
- [Reproducible commands and graph helper](./01-global-rebase-and-baseline/reproducible-commands.md)

The main rebase result is not “clean everything”: Phase 3's 125 reviewed
fitness findings have become 21 current findings, but four are new Backend
private edges. The highest-value remaining gaps are those four edges, the
package-contract owner violation, seven Web model/query reversals, seven
controller/repository edges, and the residual Commerce dependency cycle.

## Completion Delta Through `8-6`

- `8-1` removed the four new Backend private edges, replaced the fake
  canonical-controller signal with executable fitness fixtures and restored a
  deterministic `0 new / 0 unresolved` boundary.
- `8-2` preserved the package contracts subpath and all 21 exported names while
  moving definitions to Feedback, PR, Storage and Telemetry owner contracts.
- `8-3` removed all seven Web model-to-query reversals and the PR Discovery
  type cycle.
- `8-4` removed all seven controller-to-repository edges and established
  stable User/Notification/PR seams for the WeChat vertical.
- `8-5` removed the Trade/Bill SCC and the nested RideHailing type-return
  cycle. Backend and Web static/dynamic-inclusive graphs are now acyclic, and
  `dispatchBinding` source/storage/durable authority agrees.
- `8-6` converged Admin login, PR preview and Share endpoint owners; retired
  the proven zero-consumer Web/Job/env compatibility set; forward-dropped only
  the two obsolete Job millisecond columns; and reconciled historical/external
  proof procedures.
- The current fitness report is
  `970 files / 3,679 edges / 0 unresolved / 1 known / 0 new`. The sole finding
  is the explicitly retained terminal WeChat OAuth callback.

## Guardrails Touched

- The durable objective function and four-category rule in
  `docs/20-product-tdd/architecture-objectives-and-decision-rules.md` are the
  evaluation constitution.
- `docs/20-product-tdd/unit-topology.md`, Backend `AGENTS.md`, and Web
  `ARCHITECTURE.md` own current dependency directions.
- Historical task packets remain evidence. Stale status prose is annotated or
  reconciled later; it is not silently rewritten into a false history.
- File size, raw edge counts, dead-code findings and cycle counts are
  diagnostic inputs, never cleanup authorization by themselves.
- Phase 4/5 external evidence does not become a source repair.
- Professional program observability and `notification_deliveries` retirement
  remain a separate future task unless Sir explicitly changes that boundary.
- Product-policy work such as Rental payment/data reclamation and final-fare
  correction is not global cleanup.

## Protected Worktree Boundary

The following independent work is outside Phase 8:

- modified `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`;
- untracked `tasks/project-node-runtime/`;
- untracked `tasks/oxc-toolchain-migration/`; and
- untracked `tasks/quality-gate-orchestration/`.

The local `0088_create_order_attempts.sql` application incident remains an
independent environment/recovery decision. No reset, rollback, staging or
reinterpretation is authorized by `8-0`.

## Verification

- all counts name source scope, exclusions and a reproducible command;
- Backend, Web and cross-unit audits use disjoint read-only questions;
- root integration samples key counts and verifies every cited path;
- the architecture-fitness report is deterministic and compared with its
  reviewed Phase 3 baseline without automatically treating baseline drift as a
  violation;
- report-first dead-code/security output remains report-first;
- task/durable links resolve;
- `git diff --check` passes for task-packet changes; and
- final `git status` proves protected paths remain unstaged and independently
  dirty/untracked. No byte-history claim is inferred without an entry hash.

## Exit

`8-0` exited with an evidence-backed current/target scorecard, global topology,
conflict and compatibility inventory, control-plane drift, external/future
boundaries, and proposed Phase 8 slice order. `8-1`–`8-6` then exited with
packet-local and integrated proof. `8-7` has recomputed architecture authority,
replayed classic sequences and canonical gates, promoted stable current truth,
and preserved external/future/independent handoffs. Phase 8 is locally
complete and uncommitted.
