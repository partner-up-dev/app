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
4. Phase 4 — User/Auth: entry characterization and slice planning may proceed; implementation remains unauthorized
   until its own packet, entry evidence and explicit authorization exist. Commerce, Job/Notification,
   Observability, then global review/cleanup remain ordered after it; see `program-roadmap.md`.

Phase 2 后续恢复工作已在 `05-toolchain-recovery/` 完成：两套 oxc binding、Web build 与
System scenario 均恢复。Phase 3 entry `bda22b60` 已迁移 Anchor Event 能力，因此 `01`–`04`
中的旧 Event 与规模证据只作历史快照；当前事实和替代 owner 见 `06-phase3/entry-baseline.md`。

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
- [`program-roadmap.md`](./program-roadmap.md)
- [`06-phase3/01-baseline-and-fitness/00-task-packet.md`](./06-phase3/01-baseline-and-fitness/00-task-packet.md)
- [`06-phase3/01-baseline-and-fitness/verification-log.md`](./06-phase3/01-baseline-and-fitness/verification-log.md)
