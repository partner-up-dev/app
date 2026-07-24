# Backend / Web Refactor Program

## Purpose

本目录承载 Backend/Web 系统性重构的任务态证据、冻结合同与迁移基线。它不是新的 durable truth；
产品和技术真相仍由 `docs/10-prd`、`docs/20-product-tdd`、`docs/30-unit-tdd` 及最近的
`AGENTS.md` 拥有。

## Historical Workspaces

The numeric directory prefixes below are creation/workstream ordinals, not Program Phase numbers. Program Phases
are defined only by [`program-roadmap.md`](./program-roadmap.md); `06-phase3/` is the sixth workspace and owns
Program Phase 3.

| Directory | Owner | Scope |
| --- | --- | --- |
| `01-backend/` | Backend 子任务 | Backend 行为/权威冻结、结构与依赖只读基线 |
| `02-web/` | Web 子任务 | Web 行为/权威冻结、结构与依赖只读基线 |
| `03-cross-unit/` | Cross-unit 子任务 | 跨单元契约、产品不变量、测试与运行边界基线 |
| `04-integration/` | 根代理 | 冲突消解、冻结总表、评分卡与下一阶段入口条件 |
| `05-toolchain-recovery/` | Toolchain recovery 子任务 | 两套 oxc binding、Web build 与 System scenario 恢复证据 |
| `06-phase3/` | 根代理 + slice owners | Program Phase 3 的当前 HEAD 校准、目标状态、durable promotion 与 executable packets |
| `07-phase4/` | 根代理 + slice owners | Program Phase 4 User/Auth 的本地收口、外部证据分支与 completion review |
| `08-phase5/` | 根代理 + slice owners | Program Phase 5 Commerce 的 source convergence、proof、deferred risks 与 runtime-evidence branch |
| `09-phase6-job-notification/` | 根代理 + slice owners | Program Phase 6 Job/Notification 的 topology、runtime/owner 证据、目标设计与后续 source-slice gates |
| `10-phase7-observability-analytics/` | 根代理 + slice owners | Program Phase 7 的 legacy SLS/structured-output negative baseline 与 retirement、user telemetry/BI convergence、future professional-O11y handoff |
| `11-phase8-global-review-cleanup/` | 根代理 + slice owners | Program Phase 8 的全局重基线、评分卡、冲突 disposition、`8-1`–`8-6` execution proof 与 `8-7` durable handoff |

## Evidence Protocol

- 每个 workstream 保持自己的 `00-task-packet.md` 与 `evidence-index.md`。
- Evidence id 使用目录前缀：`BE-*`、`WEB-*`、`XU-*`。
- Source evidence 记录绝对或仓库相对路径及尽量窄的行号范围。
- Command evidence 记录完整命令、工作目录、搜索/测试范围、排除项、退出码和摘要。
- `Fact`、`Inference`、`Proposal` 必须显式区分；只有 `Fact` 可直接进入冻结或基线总表。
- 无法廉价复核的结论降级为 `Open question`，不得伪装成冻结合同。

## Current Phase

1. Phase 1 — behavior and authority freeze: historical snapshot complete at `a8cf2d7`.
2. Phase 2 — read-only baseline: historical snapshot complete; toolchain recovery separately complete.
3. Phase 3 — target execution: all stages 3A/3B/3C and slices `3-1`–`3-8` are Complete. The current exit proof is
   [`06-phase3/exit-evidence.md`](./06-phase3/exit-evidence.md).
4. Phase 4 — User/Auth: local implementation and completion review complete; rollout/provider/topology evidence stays
   externally gated.
5. Phase 5 — Commerce: local owner convergence committed as `171319de`; runtime/provider evidence and explicit
   deferred risks remain in its Phase packet.
6. Phase 6 — Job/Notification runtime: `6-0`, D6-N-01, D6-J-02 and D6-F-01 have closed the read-only design.
   The business-template/Job-task model, creation window, future-O11y boundary, PR-inbox retirement,
   state-placement rule and simplified RideHailing fee-confirmation Job boundary are ratified. `6-1` and `6-2` are
   locally proven; `6-3` completes all source handoffs, visible ACK and forward legacy state/decoder retirement.
   `6-4` completes the atomic RideHailing fee-confirmation Job handoff, and `6-5` closes runtime/recovery,
   scoped console cleanup and full local review. Phase 6 is locally complete;
   Phase 7 subsequently removed the carried Phase 5 debug stdout, while
   professional O11y and `notification_deliveries` retirement remain an
   independent future task.
7. Phase 7 — Legacy observability retirement / Analytics: `7-0` corrected
   read-only negative-baseline entry complete at `537a9b4f`; SLS-first and
   structured output are withdrawn as targets. `7-1` exact deletion decisions,
   including `operation_logs` retirement, are complete; Sir started the
   remaining Phase on 2026-07-23. `7-2`–`7-5` are complete with canonical
   proof. Sir confirms no configured SLS saved query/dashboard exists and
   closes further platform inventory, so D7-04 is closed without claiming a
   platform-side audit or deletion by Codex.
8. Phase 8 — global review and cleanup: `8-0`–`8-7` complete locally. Current
   architecture fitness has one known terminal WeChat OAuth callback exception
   and `0 new / 0 unresolved`; Backend/Web static and dynamic-inclusive import
   graphs are acyclic. The final authority/sequence/canonical/durable review
   passed under Sir's 2026-07-24 authorization. The working tree is
   uncommitted at `cf6cd736`.

Phase 2 后续恢复工作已在 `05-toolchain-recovery/` 完成：两套 oxc binding、Web build 与
System scenario 均恢复。Phase 3 entry `bda22b60` 已迁移 Anchor Event 能力，因此 `01`–`04`
中的旧 Event 与规模证据只作历史快照；当前事实和替代 owner 见 `06-phase3/entry-baseline.md`。
当前未完成阶段、外部证据和独立工作见
[`remaining-work-register.md`](./remaining-work-register.md)。

## Integrated Entry Points

- [`04-integration/frozen-boundaries.md`](./04-integration/frozen-boundaries.md)
- [`04-integration/baseline-scorecard.md`](./04-integration/baseline-scorecard.md)
- [`04-integration/conflicts-and-open-questions.md`](./04-integration/conflicts-and-open-questions.md)
- [`04-integration/next-slice-readiness.md`](./04-integration/next-slice-readiness.md)
- [`04-integration/verification-log.md`](./04-integration/verification-log.md)
- [`05-toolchain-recovery/00-task-packet.md`](./05-toolchain-recovery/00-task-packet.md)
- [`06-phase3/00-task-packet.md`](./06-phase3/00-task-packet.md)
- [`06-phase3/slice-map.md`](./06-phase3/slice-map.md)
- [`06-phase3/durable-docs-plan.md`](./06-phase3/durable-docs-plan.md)
- [`06-phase3/verification-log.md`](./06-phase3/verification-log.md)
- [`06-phase3/scope-audit.md`](./06-phase3/scope-audit.md)
- [`07-phase4/00-task-packet.md`](./07-phase4/00-task-packet.md)
- [`08-phase5/00-task-packet.md`](./08-phase5/00-task-packet.md)
- [`09-phase6-job-notification/00-task-packet.md`](./09-phase6-job-notification/00-task-packet.md)
- [`09-phase6-job-notification/01-runtime-topology-inventory/00-task-packet.md`](./09-phase6-job-notification/01-runtime-topology-inventory/00-task-packet.md)
- [`10-phase7-observability-analytics/00-task-packet.md`](./10-phase7-observability-analytics/00-task-packet.md)
- [`10-phase7-observability-analytics/slice-map.md`](./10-phase7-observability-analytics/slice-map.md)
- [`10-phase7-observability-analytics/current-and-target-topology.md`](./10-phase7-observability-analytics/current-and-target-topology.md)
- [`11-phase8-global-review-cleanup/00-task-packet.md`](./11-phase8-global-review-cleanup/00-task-packet.md)
- [`11-phase8-global-review-cleanup/slice-map.md`](./11-phase8-global-review-cleanup/slice-map.md)
- [`11-phase8-global-review-cleanup/01-global-rebase-and-baseline/current-and-target-scorecard.md`](./11-phase8-global-review-cleanup/01-global-rebase-and-baseline/current-and-target-scorecard.md)
- [`program-roadmap.md`](./program-roadmap.md)
- [`remaining-work-register.md`](./remaining-work-register.md)
- [`06-phase3/01-baseline-and-fitness/00-task-packet.md`](./06-phase3/01-baseline-and-fitness/00-task-packet.md)
- [`06-phase3/01-baseline-and-fitness/verification-log.md`](./06-phase3/01-baseline-and-fitness/verification-log.md)
