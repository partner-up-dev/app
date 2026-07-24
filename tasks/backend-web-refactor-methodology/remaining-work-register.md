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
| 1 | Phase 4 external evidence | External evidence, parallel | normal rollout CORS/header observation; provider-console/edge callback authority; a faithful canonical-host browser environment if that proof is required |
| 2 | Phase 5 `5-7a` provider/runtime proof | External evidence, parallel | operator edge/network evidence plus signed Backend callback receipt and safe provider smokes; do not depend on retired console/structured logs |
| 3 | Professional program O11y / delivery retention | Independent future program | proven operator/recovery questions, privacy/cardinality/retention requirements and replacement proof before `notification_deliveries` retirement |

Phase 4/5 external observation can proceed independently of Phase 8. Neither
may be promoted to a deployed-fact claim without the named operator evidence.

## Carried-Forward Work

| Item | Disposition | Required future boundary |
| --- | --- | --- |
| F-01 retained Rental Bill can still reach payment | Deferred by Sir; durable R0 is not rewritten | a separate product/risk decision before any Rental payment/schema work |
| F-02 post-settlement RideHailing fee confirmation | Completed locally in Phase 6 `6-4` | atomic qualifying-settlement → one generic Job handoff; RideHailing-internal `order_id`-only provider call; ordinary Job retry under accepted duplicate-effect risk; no intent/owner state/operator/backfill |
| D3 final-fare adjustment/refund | Deferred | product financial policy, allocation/refund semantics, user-visible projection and correction workflow |
| `5-6B` Admin read composition | Deferred beyond Phase 5 | canonical admin read contract before repository-composition cleanup |
| Viewer Bill list 1+N projection | Deferred | request-count baseline and a focused summary/batched-read contract decision |
| `dispatchBinding` source-versus-durable conflict | Closed by the `8-5` source/read/write audit | commit `171319de` already placed provider binding on `ride_hailing_orders.dispatch_binding` and promoted the same durable truth; Trade choice-set resolution records only the final vehicle/quote |
| Backend package contract owner gap | Completed in Phase 8 `8-2` | stable package subpath and 21 public names preserved; definitions now come from semantic owner contracts and a recursive facade guard enforces the boundary |
| residual Commerce dependency SCC | Completed in Phase 8 `8-5` | Trade/Bill and revealed RideHailing type-return cycles removed; Backend static/dynamic-inclusive graphs both have zero SCCs while deliberate provider isolation remains |
| Rental schema/data reclamation | Deferred | separate data-retention/migration authorization; do not infer it from runtime retirement |
| Phase 4 canonical-host browser proof | Re-entry condition | a faithful host/cookie harness or explicit decision that lower-layer proof is sufficient |
| Historical micro-packet status prose | Reconciled in `8-6` | event-time prose is preserved with dated current-state annotations; current roadmap/register remain authoritative |
| Phase 5 `5-7a` proof procedure | External evidence | procedure now uses operator network/edge capture, provider-signed request and captured Backend receipt instead of retired pseudo-O11y; execution remains external |
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
seams. The scoped Job/CaoCao console diagnostics and the carried Phase 5 debug
stdout were removed by Phase 7. Professional O11y and
`notification_deliveries` retirement remain an independent future task.
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

Phase 8 `8-0`–`8-7` is complete locally under
[`11-phase8-global-review-cleanup/`](./11-phase8-global-review-cleanup/).
The original 21-finding baseline now converges to one known terminal WeChat
OAuth callback exception with `0 new / 0 unresolved`; package-contract
ownership, Web direction, Backend controller seams, Commerce SCCs and the
proven endpoint/compatibility/control residue are closed with local proof.
The final architecture/sequence/canonical/durable handoff also passed. The
working tree remains uncommitted at `cf6cd736`; the recommended order above
lists only work that remains.
