# Cross-unit Workstream

> Historical snapshot: this packet records Phase 1/2 evidence at `a8cf2d7`. Its Anchor Event assumptions and
> toolchain blocker are superseded by `../06-phase3/entry-baseline.md` and `../05-toolchain-recovery/`.

## Objective & Hypothesis

- 冻结跨 Backend/Web 的产品不变量、状态权威、API/auth/error/route 协作和运行副作用边界。
- 独占执行 canonical diagnostic gates，建立 Phase 2 的验证平台只读基线。

## Owned Outputs

- `product-invariants.md`
- `contract-surfaces.md`
- `verification-runtime-baseline.md`
- `evidence-index.md`

## Guardrails Touched

- 只写本目录；不修改应用、durable docs、测试、脚本、配置、依赖或数据库迁移。
- 可运行 canonical check/test 命令及隔离 scenario；不得安装依赖、修复失败或运行持久化开发数据库操作。
- 诊断失败记录为 baseline fact，不自行扩展成修复任务。

## Verification

- 冻结项区分 durable owner、runtime evidence 和 task-local inference。
- 每个 gate 记录命令、退出码、时长、测试数或失败原因。
- 跨单元契约覆盖 `AppType`、Problem Details、auth/handoff、route coordination、DB/jobs/notifications。

## Current Status

- Phase 1 跨单元冻结已完成任务态初稿：
  - `product-invariants.md` 按 identity/PR/event/messaging/commerce/notification/share/revisit 冻结最小产品承诺；
  - `contract-surfaces.md` 映射 Browser/Web/RPC/Backend/Postgres/jobs/providers 的 authority、transport、canonical reads、forward-only 与 side-effect 边界；
  - 所有内容保留 durable owner，未修改 PRD/Product TDD/Unit TDD/Deployment docs。
- Phase 2 canonical diagnostic matrix 已逐项执行并记录在 `verification-runtime-baseline.md`。
- 当前不是全绿基线：dead-code、Web build、system scenario 失败；security 明确 skip；format 为 0-file NO-SIGNAL。
- 两项 durable contract 张力保持 `Open`，未在 task-local 文档强行消解：
  1. 匿名 create DRAFT（PRD）与 authenticated inline create/publish（Product TDD）；
  2. domain response 禁止 session payload 与 waitlist response `auth payload` 描述。

## Verification Evidence

- Runtime snapshot: `develop@a8cf2d7c1beb6f8c285a1265440b278c6668a55b`，共享脏工作树；shell Node `v22.22.3`，pnpm project Node `v22.23.1`，pnpm `11.13.0`。
- PASS：backend lint/type/config/build/unit/scenario；web type/unit。
- PASS-WITH-FINDINGS：web lint（2 个 report-only medium naming findings；Biome changed lane 0 files）。
- FAIL：
  - `pnpm check:dead-code` exit 1：缺 `oxc-parser@0.135.0` Linux native binding；
  - `pnpm check:build:web` exit 1：`vue-tsc` 后 Vite/UnoCSS 缺 `oxc-parser@0.124.0` Linux native binding；
  - `pnpm test:scenario:system` exit 1：首次端口碰撞，重跑稳定失败于上述 `0.124.0` binding，未开始测试断言。
- SKIPPED：`pnpm check:security` exit 0 但 semgrep 未安装。
- NO-SIGNAL：`pnpm check:format` exit 0 但 checked 0 files。
- Test counts：backend unit 68 files / 314 tests；web unit 38 / 162；backend scenario 26 / 82。
- 逐项 command、exit、duration、摘要与 recheck cost 见 `verification-runtime-baseline.md` 和 `evidence-index.md`。

## Self Verification

- Durable refs：扫描 135 个 `docs/**/*.md` 引用，0 missing path，0 line-range overflow。
- Gate correspondence：14 个 requested canonical gates 对应 matrix 14 行；`PASS`、`FAIL`、`SKIPPED`、`NO-SIGNAL` 无混写。
- Invariant spot-check：抽查 identity、PR status、place mode、canonical read、event auto-create、messaging visibility、commerce quote、notification wave 等 8 项，均有 PRD/Product TDD 直接 owner 支持；两处冲突保留为 `Open`。
- `git diff --check -- tasks/backend-web-refactor-methodology/03-cross-unit` exit 0。因目录当前 untracked，另对每个 Markdown 文件运行 `git diff --no-index --check -- /dev/null <file>`，0 个 whitespace diagnostics。
