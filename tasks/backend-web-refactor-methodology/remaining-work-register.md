# Program Remaining Work Register

## Status Vocabulary

- **External evidence** needs an operator-authorized observer or provider
  facility; source inference is not a substitute.
- **Deferred** is an explicit product/scope or future-owner handoff, not a
  hidden completion claim.
- **Not started** has no executable source authorization or packet yet.
- **Decision pending** has a read-only executable packet but no authorization
  for its source/deployment slices.
- **Independent** is outside this refactor program's Phase boundary and must
  be committed/reviewed separately.

## Recommended Order

| Order | Work | Status | Entry gate / needed authority |
| --- | --- | --- | --- |
| 1 | Phase 4 external evidence | External evidence | normal rollout CORS/header observation; provider-console/edge callback authority; an environment able to reproduce the canonical-host browser condition if that proof is needed |
| 2 | Phase 5 `5-7a` provider/runtime proof | External evidence | Internet-reachable staging observer plus an operator-approved signed CaoCao callback and safe WeChatPay notify smoke |
| 3 | Phase 6 entry: Job/Notification runtime inventory and design | Complete | topology, business-template/Job-task ownership, Job `UNTIL_ACKNOWLEDGED`, PR-inbox retirement, state placement, official fee-confirm contract and no-console O11y boundary are recorded |
| 4 | Phase 6 implementation and local review | Complete locally on 2026-07-23 | `6-1`–`6-5` source, migration, durable promotion and static/unit/backend/system proof are closed; `notification_deliveries` remains inert audit history |
| 5 | Phase 7 Legacy O11y retirement / Analytics | Complete on 2026-07-23 | clean baseline, Registry/failure convergence, typed facts/API, Web Analytics owner and canonical proof are closed; D7-04 is closed by Sir's confirmation that no configured SLS saved query/dashboard exists and no further platform inventory is required |
| 6 | Phase 8 global review/cleanup | Not started | Phases 3–7 have closed locally or explicitly recorded their remaining external/deferred boundaries |

Phase 4 and 5 external observation can be prepared in parallel with Phase 6
read-only entry work, but neither may be promoted to a deployed-fact claim
without the named operator evidence.

## Carried-Forward Work

| Item | Disposition | Required future boundary |
| --- | --- | --- |
| F-01 retained Rental Bill can still reach payment | Deferred by Sir; durable R0 is not rewritten | a separate product/risk decision before any Rental payment/schema work |
| F-02 post-settlement RideHailing fee confirmation | Completed locally in Phase 6 `6-4` | atomic qualifying-settlement → one generic Job handoff; RideHailing-internal `order_id`-only provider call; ordinary Job retry under accepted duplicate-effect risk; no intent/owner state/operator/backfill |
| D3 final-fare adjustment/refund | Deferred | product financial policy, allocation/refund semantics, user-visible projection and correction workflow |
| `5-6B` Admin read composition | Deferred beyond Phase 5 | canonical admin read contract before repository-composition cleanup |
| Viewer Bill list 1+N projection | Deferred | request-count baseline and a focused summary/batched-read contract decision |
| `dispatchBinding` source-versus-durable conflict | Open characterization/promotion item | characterize current persistence/read authority, then promote one durable statement; no wording-only edit |
| Rental schema/data reclamation | Deferred | separate data-retention/migration authorization; do not infer it from runtime retirement |
| Phase 4 canonical-host browser proof | Re-entry condition | a faithful host/cookie harness or explicit decision that lower-layer proof is sufficient |
| Historical micro-packet status prose | Documentation debt | some Phase 3/4 slice packets retain time-of-execution “commit pending” wording; root roadmap and this register are current, while any historical-log annotation must preserve the original evidence context |
| Existing Commerce/RideHailing debug stdout | Completed in Phase 7 | diagnostic protocol/output and the full-suite-discovered RideHailing listing structured writer are removed without a replacement logger or telemetry path |

## Independent Worktree Boundaries

| Work | Current state | Boundary |
| --- | --- | --- |
| Node runtime / pnpm 11 | verified task packet; root `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` remain modified | review and commit separately from domain phases |
| Oxc toolchain migration | verified task packet remains uncommitted as its own work item | keep formatter/linter scope separate; re-run its canonical gate at its own commit boundary |
| Quality-gate orchestration | verified task packet remains uncommitted as its own work item | keep Semgrep/Oxlint policy changes separate from product/domain commits |
| Local migration incident | `0088_create_order_attempts.sql` was applied by mistake to a locally reachable DB | do not reset/rollback without an explicit recovery decision; never treat it as deployment evidence |

## Current Program Position

Phase 3 is complete. Phase 4 is locally closed with external evidence branches.
Phase 5 local source convergence is committed as `171319de`; its local review
is complete, while 5-7a and the carried-forward items above remain explicit.
Phase 6 is locally complete. `6-1`–`6-5` prove the generic Job/Notification
owner, all producer handoffs, semantic PR-message acknowledgement, forward
retirement of opportunity/wave/inbox and concrete/no-cycle compatibility,
atomic RideHailing fee-confirmation Job handoff, and local runtime/recovery
seams. The scoped Job/CaoCao console diagnostics are removed. Existing Phase 5
debug stdout moves to Phase 7 clean-baseline cleanup. Real O11y and
`notification_deliveries` retirement remain a post-Phase-7 future task.
Phase 7 is locally complete under
[`10-phase7-observability-analytics/`](./10-phase7-observability-analytics/).
`7-0`/`7-1` own the corrected baseline and retirement decisions; `7-2`
removes repository coupling, runtime diagnostics, and `operation_logs`; `7-3`
converges Registry/telemetry failure behavior; `7-4` closes typed facts,
Analytics API/Web ownership, and the real cross-unit proof; `7-5` reconciles
durable truth and canonical gates. D7-04 is closed by explicitly labelled
operator evidence/decision, without claiming an SLS audit or deletion by
Codex. Professional program O11y and `notification_deliveries` replacement
proof are future-task handoffs, not hidden Phase 7 implementation. No generic-outbox
implementation is implied. The controlling roadmap is
[`program-roadmap.md`](./program-roadmap.md).
