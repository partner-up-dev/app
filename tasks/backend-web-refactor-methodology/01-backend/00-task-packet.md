# Backend Workstream

> Historical snapshot: this Phase 1 inventory was collected around `a8cf2d7`. Preserve it as evidence;
> use `../06-phase3/entry-baseline.md` and the slice packets for current-HEAD planning.

## Objective & Hypothesis

- 冻结 Backend 在重构期间必须保持的 HTTP、状态权威、持久化、异步副作用和集成边界。
- 以只读方式建立 Backend 源码拓扑、依赖方向、兼容缝和热点基线。

## Owned Outputs

- `behavior-contracts.md`
- `authority-boundaries.md`
- `readonly-baseline.md`
- `evidence-index.md`

## Guardrails Touched

- 只写本目录；不修改应用、durable docs、测试、脚本、配置、依赖或迁移。
- 不执行数据库/scenario/build gate；只允许静态搜索、解析和轻量计数。
- 不把目标架构建议写成当前事实。

## Verification

- 每个冻结项能回指 PRD/TDD/local AGENTS 或真实源代码边界。
- 关键计数带可复跑命令和排除规则。
- 输出覆盖 controllers、domains、entities/repositories、infra/jobs、integrations、legacy seams。

## Current Status

已完成 Backend 只读冻结产物：`behavior-contracts.md`、`authority-boundaries.md`、
`readonly-baseline.md`、`evidence-index.md`。本 workstream 未修改 `apps/`、`docs/`、
`tests/`、`scripts/`、配置、依赖、migration 或其他 task 目录。

## Verification Evidence

- 已复跑最高影响 baseline：BE-BL-001（481 个生产文件 / 57,298 LOC）、BE-BL-002
  （194/192 个 Hono method-chain declaration、28 mounts、3 个顶层 health/verification
  route）与 BE-BL-005（481 nodes、2,177 条可解析边、3 个 cyclic SCC、最大 38 nodes），
  与文档结果一致。
- 已复跑 BE-BL-003/004/006/007/008/009：分别得到 validator 188、direct JSON 0、
  direct error 25、relative import 2,178 / deep import 909、module-level `new` 449 /
  DI-like 379、`setInterval(` 0、生产大文件 16/4、source tests 68/8,514 LOC、scenario
  26/10、migration 72/12/84 且缺口 0063/0066；结果均与 `evidence-index.md` 对齐。
- 已执行源代码/文档行号路径检查（186 个行号引用，无越界；`YourService.ts` 不存在这一
  点按 Open question 保留），并通过 trailing-whitespace 与 `git diff --check` 等价检查。
- 未执行 unit、scenario、build 或 database command；后续变更必须先重跑
  `evidence-index.md` 的 BE-BL-001、BE-BL-002、BE-BL-005，再重新审阅冻结项。
