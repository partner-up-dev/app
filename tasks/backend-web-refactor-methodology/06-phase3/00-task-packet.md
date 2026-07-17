# Program Phase 3 — Target State And Executable Slices

## Objective & Hypothesis

- 将 Backend/Web 的目标状态转化为可执行、可验证、可回退的渐进切片，而不是一次目录搬迁。
- 以 `3-1` 提交 `b674f5ca` 为当前执行起点，显式隔离
  `a8cf2d7` 历史基线和已经退役的 Anchor Event 假设。
- 假设：先用 report-first fitness rules 和两个低风险 pilot 证明 owner 模型，再迁移 PR Type
  Config 与 `pr-core`，能够降低整合成本和行为回归风险。

## Current Mode And Authorization

- 当前模式：`Solidify`。
- Sir 已明确授权完成 Phase 3；`3-1`、`3-2`、`3-3` 已由 `ca6151cd` 收口，`3-4` 已在受控工作树验证完成。
  `3-5` 是下一个 executable slice；后续 slice 仍按各自 entry/stop conditions 逐个进入，不将 phase
  授权扩张为跨 scope 修改。
- commit 仍需 Sir 独立命令。

## Guardrails Touched

- Backend/Postgres 保持 durable product truth；Web 保持 route/UI/browser continuity 与非权威 cache。
- `AppType` 保持唯一 compile-time HTTP seam；runtime 仍由 HTTP validation 与 Problem Details 保护。
- 不恢复 Anchor Event identity、route 或表；`/prd`、PR Type Configuration、Authoring、Discovery
  是当前 owner。
- 不在 `3-7`/`3-8` 的既定 entry、characterization 与 stop conditions 之外提前修改
  create/publish/waitlist/OAuth replay。
- 不引入 universal DomainService、万能 `useApi`、全局 DI container 或第二套 DTO truth。
- 保留用户已有 `package.json`、lock/workspace、`tasks/project-node-runtime/` 和不明来源 `vue`
  文件；不整理、不删除、不吸收。

## Poly-file Workstreams

| Stage | Slice / directory | Purpose | Status |
| --- | --- | --- | --- |
| 3A Foundation/calibration | `3-1` · `01-baseline-and-fitness/` | 当前基线、边界矩阵和 report-first fitness rules | Complete; 2026-07-17 |
| 3A Foundation/calibration | `3-2` · `02-pr-discovery-read-owner/` | `/prd` read-only workflow/query owner 收敛 | Complete; `ca6151cd` |
| 3B Mutation calibration / PR convergence | `3-3` · `03-feedback-submission-vertical/` | Feedback browser-to-Postgres mutation calibration | Complete; `ca6151cd` |
| 3B Mutation calibration / PR convergence | `3-4` · `04-pr-type-config-boundary/` | PR Type Config public read/write owner 与 consumer migration | Complete; dedicated exit commit |
| 3B Mutation calibration / PR convergence | `3-5` · `05-pr-core-retirement/` | canonical `domains/pr` cutover 与 compatibility 退场 | Planned after `3-4` |
| 3B Mutation calibration / PR convergence | `3-6` · `06-contract-surface-narrowing/` | Web types-only contract surface 与 duplicate DTO 收窄 | Planned after public surfaces stabilize |
| 3C Conflict closure | `3-7` · `07-cf01-anonymous-pr-creation/` | 对齐 authenticated-only PR persistence 产品与运行合同 | Decided; execute after `3-6` |
| 3C Conflict closure | `3-8` · `08-cf02-waitlist-auth-contract/` | 修正 waitlist header-only auth 合同描述并用真实旅程收口 | Decided; execute after `3-7` |

`3A`–`3C` 是 Phase 3 内的阶段分组，`3-1`–`3-8` 才是可执行 slice；物理目录保留两位序号以避免
重命名历史证据。每个 slice 独立拥有 `00-task-packet.md`、`execution-plan.md` 和 `rehearsal.md`。
CF-01 和 CF-02 的退出同时构成 Phase 3 exit，不再添加一个没有独立产品价值的代码 slice。

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
- Phase 2 toolchain recovery snapshot 已完成：Web build PASS，System 8/8 files、33/33 tests PASS；这替代旧
  OQ-07 blocker，但 security SKIPPED 与全仓 format NO-SIGNAL 仍不可包装成通过。
- 八个 slice 均已具备独立 packet、具体 execution plan、mental rehearsal 和 stop/rollback 分支。
- `3-1` 已完成：架构目标/生长规则、owner topology、Backend/Web local rules 和 standalone
  architecture-fitness baseline 均已验证；125 known / 0 new，未接入 blocking gate。公开入口现在精确包括
  root `index.ts` 或四类 category root entrypoint，且有正反 fixture 保证 nested implementation 仍不可跨域导入。
- 并行 quality-gate work 已提交为 `c634d9b6`；`3-1` 在该 HEAD 上复核 digest 无漂移。
- Sir 已于 2026-07-17 授权开始 Phase 3；`3-2` 已由 `ca6151cd` 收口：单一 `/prd` read workflow、Web unit
  142/142、targeted System 11/11、full System 42/42、fitness 125 known / 0 new。
- `3-3` 已由 `ca6151cd` 收口：generic Feedback command、PR-owned workflow、retryable UI 与
  Browser→Postgres proof 均通过。`3-4` 已完成 neutral PR Type Config owner、Admin adapter 收敛、current/snapshot
  scenario proof、Backend build/lint/type 与 fitness 125 known / 0 new。3B 仍有 `3-5`–`3-6`，之后才进入 3C。
- Phase 3 之后的领域 phases 与全局收尾见 `../program-roadmap.md`，不属于本次应用修改授权。
