# Phase 3 — Target State And Executable Slices

## Objective & Hypothesis

- 将 Backend/Web 的目标状态转化为可执行、可验证、可回退的渐进切片，而不是一次目录搬迁。
- 以当前 HEAD `bda22b609e651f0daf6b36559d3fcdc283ac1fa1` 为事实起点，显式隔离
  `a8cf2d7` 历史基线和已经退役的 Anchor Event 假设。
- 假设：先用 report-first fitness rules 和两个低风险 pilot 证明 owner 模型，再迁移 PR Type
  Config 与 `pr-core`，能够降低整合成本和行为回归风险。

## Current Mode And Authorization

- 当前模式：`Solidify`。
- 本轮授权：更新 task packet、计划、证据索引和 promotion candidates。
- 未授权：应用代码、测试、durable docs、schema/migration、配置、依赖或生成物修改。
- 每个 application/durable-doc slice 在 Execute 前仍需 Sir 明确发出 start；commit 另需独立命令。

## Guardrails Touched

- Backend/Postgres 保持 durable product truth；Web 保持 route/UI/browser continuity 与非权威 cache。
- `AppType` 保持唯一 compile-time HTTP seam；runtime 仍由 HTTP validation 与 Problem Details 保护。
- 不恢复 Anchor Event identity、route 或表；`/prd`、PR Type Configuration、Authoring、Discovery
  是当前 owner。
- 不在 CF-01/CF-02 未决时修改 create/publish/waitlist/OAuth replay。
- 不引入 universal DomainService、万能 `useApi`、全局 DI container 或第二套 DTO truth。
- 保留用户已有 `package.json`、lock/workspace、`tasks/project-node-runtime/` 和不明来源 `vue`
  文件；不整理、不删除、不吸收。

## Poly-file Workstreams

| Directory | Purpose | Status |
| --- | --- | --- |
| `01-baseline-and-fitness/` | 当前基线、边界矩阵和 report-first fitness rules | Complete; 2026-07-17 |
| `02-pr-discovery-read-owner/` | `/prd` read-only workflow/query owner 收敛 | Planned; first app pilot |
| `03-feedback-submission-vertical/` | Feedback browser-to-Postgres mutation calibration | Planned; second pilot |
| `04-pr-type-config-boundary/` | PR Type Config public read/write owner 与 consumer migration | Planned after pilots |
| `05-pr-core-retirement/` | canonical `domains/pr` cutover 与 compatibility 退场 | Planned after type-config boundary |
| `06-contract-surface-narrowing/` | Web types-only contract surface 与 duplicate DTO 收窄 | Planned after public surfaces stabilize |

每个 workstream 独立拥有 `00-task-packet.md`、`execution-plan.md` 和 `rehearsal.md`。

## Shared Verification

- 行为：目标 unit + Backend scenario + Web unit + targeted System；跨单元 slice 完成前跑 full System。
- 静态：changed-file lint/type/build、import boundary report、focused `rg`/AST probes。
- 依赖：历史 violation 先 baseline/allowlist；只对新 violation 建议 blocking，且需 fixture 证明低误报。
- 范围：每次 mutation 前后记录 focused status、owned paths、生成物和未执行动作。
- Promotion：只有经过目标 slice 与完整 gate 证明的稳定规则才进入 durable owner。
- 本次规划态验证与范围审计分别见 `verification-log.md`、`scope-audit.md`。

## Stop Conditions

- HEAD、用户脏改动或 durable owner 在执行中发生漂移。
- 切片需要改变产品语义、HTTP contract、schema/migration 或 provider/OAuth choreography。
- Targeted scenario 失败暴露出未冻结行为，或 full System 出现新跨单元回归。
- Fitness rule 不能用正反 fixture 证明，或历史噪声无法廉价分类。
- 任何路径触及 CF-01/CF-02 而 owner 尚未做产品/合同决定。

## Current Status

- Target state、slice 顺序、durable promotion 路由和执行预演已 task-local 固化。
- Toolchain recovery 已完成：Web build PASS，System 8/8 files、33/33 tests PASS；这替代旧
  OQ-07 blocker，但 security SKIPPED 与全仓 format NO-SIGNAL 仍不可包装成通过。
- 六个 slice 均已具备独立 packet、具体 execution plan、mental rehearsal 和 stop/rollback 分支。
- Slice 01 已完成：架构目标/生长规则、owner topology、Backend/Web local rules 和 standalone
  architecture-fitness baseline 均已验证；125 known / 0 new，未接入 blocking gate。
- 并行 quality-gate work 已提交为 `c634d9b6`；Slice 01 在该 HEAD 上复核 digest 无漂移。
- Application mutation 尚未开始。
