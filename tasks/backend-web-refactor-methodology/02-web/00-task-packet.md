# Web Workstream

> Historical snapshot: this Phase 1 inventory was collected around `a8cf2d7`. Preserve it as evidence;
> use `../06-phase3/entry-baseline.md` and the slice packets for current-HEAD planning.

## Objective & Hypothesis

- 冻结 Web 在重构期间必须保持的路由、RPC、缓存、浏览器连续性、交互与跨域流程边界。
- 以只读方式建立 Web 源码拓扑、依赖方向、状态机、兼容缝和热点基线。

## Owned Outputs

- `behavior-contracts.md`
- `authority-boundaries.md`
- `readonly-baseline.md`
- `evidence-index.md`

## Guardrails Touched

- 只写本目录；不修改应用、durable docs、测试、脚本、配置、依赖或生成源文件。
- 不执行 unit/build/system gate；只允许静态搜索、解析和轻量计数。
- 不把组件大小、reactive 数量或目录美观度单独当成重构结论。

## Verification

- 每个冻结项能回指 PRD/TDD/local AGENTS、路由或真实消费代码。
- 关键计数带可复跑命令和排除规则。
- 输出覆盖 app/pages/processes/domains/shared、TanStack Query、Hono RPC、legacy seams。

## Current Status

- Phase 1 完成：行为合同与 authority boundary 已冻结在 task-local 文档，明确区分 Fact / Inference / Open question。
- Phase 2 完成：已建立只读生产拓扑、规模、transport/query、dependency/SCC/hub、SFC/reactivity、route/test visibility 与测试分布基线。
- 未改动 `apps/`、`docs/`、`tests/`、`scripts/`、配置、依赖或其他 task 子目录；未运行 unit/system/build。

## Verification Evidence

- [`behavior-contracts.md`](./behavior-contracts.md)：route/page、AppType/Hono RPC、TanStack Query、OAuth handoff、share/replay、canonical reads、testid 合同。
- [`authority-boundaries.md`](./authority-boundaries.md)：owner map、前后端 authority、legacy seam 与双状态机/循环风险区分。
- [`readonly-baseline.md`](./readonly-baseline.md) 与 [`evidence-index.md`](./evidence-index.md)：`WEB-001` 至 `WEB-012`，包含 cwd、完整命令、排除项、结果和复核成本。
- 低成本自验已通过：prose markdown 引用路径存在；生产 files/LOC（437/85,932）、route/testid（47/323）与 import topology（707/94/1 SCC）均重复运行一致；`git diff --check -- tasks/backend-web-refactor-methodology/02-web` 无输出。
