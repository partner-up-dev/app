# Phase 7 Corrected Durable Documentation Plan

Task packets own the negative inventory, deletion ledger and future
requirements until source/external proof exists.

| Durable owner | Candidate promotion | Required proof |
| --- | --- | --- |
| `docs/20-product-tdd/architecture-objectives-and-decision-rules.md` | do not formalize expedient diagnostics as a target architecture; remove a rejected mechanism before designing its long-lived replacement | `7-2` zero-reference/deployment proof and a clean future-task handoff |
| `docs/20-product-tdd/system-state-and-authority.md` | retirement of `operation_logs`; continued compatibility status of `notification_deliveries` | ratified retirement plus source/migration proof |
| `docs/20-product-tdd/notification-contracts.md` | replace the stale promise that Phase 7 supplies attempt observability with the actual future professional-O11y/retention gate | Phase 7 clean-baseline decision plus final absence proof |
| `docs/20-product-tdd/analytics-and-telemetry-contracts.md` | Registry SSoT/type projection and backend-confirmed failure isolation | `7-3` registry/collector/ingest/command proof |
| `docs/20-product-tdd/bi-domain-contracts.md` | PR Discovery typed fact projection, shared instant-range contract and only ratified metric formulas | `7-4B` real Postgres fact/API proof plus `7-4C` boundary tests and `7-4E` System proof |
| `docs/20-product-tdd/unit-topology.md` | removal of legacy program-observability surfaces and final Analytics owner | source/import/reference proof |
| `docs/40-deployment/observability.md` | truthful clean baseline: rejected SLS/structured-output path removed, professional observability absent, future requirements listed | repository deletion plus external state evidence or named blocker |
| `docs/40-deployment/backend-runtime.md` | removal of SLS-specific FC variables/config | deploy template, environment validator and workflow proof |
| `docs/10-prd/*` | consent or BI metric behavior only | explicit product intent |
| `apps/backend/AGENTS.md` | remove the operation-log dependency/example/file-tree/checklist guidance; retain Analytics as the infrastructure read/export owner | `7-2` zero references/migration plus `7-4` final source topology |
| `apps/web/src/ARCHITECTURE.md` | final telemetry ownership and `domains/analytics` query/model/UI ownership with route-only pages | `7-3`/`7-4D` Web source proof |

## Promotion Rules

- Do not replace SLS wording with OTel/vendor wording before a future
  architecture decision.
- Label the D7-04 operator confirmation/decision distinctly; do not turn it
  into a claim that Codex audited or deleted SLS state.
- Do not describe absence of logs as implemented observability.
- Do not call `operation_logs` retired until the ratified decision has source,
  forward-migration and zero-reference proof.
- Preserve user-telemetry behavior while structural ownership changes.
- A fact projection does not define a missing product metric formula.
- Do not promote the proposed 31-day interactive limit or SPM attribution
  semantics until their decisions are explicit.

## Promotion Result

All listed technical/deployment owners were reconciled on the locally complete
Phase revision. The 31-day limit is ratified and promoted; SPM/source is
documented only as typed-fact carry, not as an attribution formula.
`docs/40-deployment/observability.md` records the absence of professional
program observability. D7-04 is closed in the task evidence by Sir's
confirmation that no configured saved query/dashboard exists and his decision
that no further platform inventory is required; unstable operator state is not
promoted as a permanent architecture requirement. No PRD metric/consent change
and no successor implementation packet were created.
