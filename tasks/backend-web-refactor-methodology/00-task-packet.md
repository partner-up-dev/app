# Backend / Web Refactor Methodology

## Objective & Hypothesis

- Objective: 基于当前仓库证据，形成一套指导 `apps/backend` 与 `apps/web`
  系统性重构的方法论，核心评价标准是降低认知复杂度、依赖复杂度与变更风险，而不是追求目录或模式的表面统一。
- Hypothesis: 先建立行为基线与依赖地图，再按可验证的业务纵切面渐进替换复杂边界，能够在保持产品行为和跨单元合约稳定的同时持续降低维护成本。

## Historical Planning Guardrails

- 本阶段只读分析 `apps/backend`、`apps/web`、相关 durable docs、测试与静态检查配置。
- 不修改应用代码、产品行为、数据库 schema、API 合约或 durable docs。
- 保留工作区中既有未提交改动，不对其整理、格式化或回退。
- 方法论必须区分事实、推断与待验证假设，并明确未来进入 Execute 前的启动确认点。

## Verification

- 当前架构、复杂度热点与风险判断均能回指仓库内具体证据。
- 方法论覆盖：目标函数、基线、边界设计、迁移切片、阶段门、测试策略、度量、回滚与停止条件。
- Backend 与 Web 的建议既共享同一治理框架，又尊重各自技术栈和依赖方向。
- 最终输出明确哪些结论可立即采用，哪些需要后续测量或小型试点验证。

## Historical Evidence Snapshot

以下数字属于 Phase 2 的 `a8cf2d7` 快照；`bda22b60` 是 Phase 3 entry/Anchor-retirement baseline，
也不是当前 working HEAD。当前可复跑基线、
过期边界和工具链恢复状态由 `06-phase3/entry-baseline.md` 接管。

- Backend 生产 TypeScript 约 57,298 行，Web 生产 TypeScript/Vue 约 85,932 行；
  规模本身不是问题，但巨型控制器、重复状态机和跨层依赖集中在少数热点。
- 当前静态导入图快照识别到 Backend 3 个强连通依赖环（最大 38 个模块），
  Web 1 个 5 模块依赖环；这些数字需要在正式执行前固化为可重复脚本基线。
- Backend 的主要复杂度集中在 PR 双轨兼容、WeChat/OAuth 控制器、
  Commerce/Provider 编排、持久化边界倒置，以及导入时注册的全局运行时状态。
- Web 的主要复杂度集中在 Event 多套重复状态机、Admin 工作台、Commerce
  query/cache/ordering 编排，以及 auth/WeChat/share/handoff 全局流程耦合。
- `pnpm test:unit:backend` 通过（68 files / 314 tests），
  `pnpm test:unit:web` 通过（38 files / 162 tests）；Backend/Web 类型检查通过。
- `pnpm check:dead-code` 当前因本地 `oxc-parser` 原生绑定缺失而不能运行；这是
  正式基线前应修复的工具链阻塞，不能被解释为代码 dead-code 结论。

## Candidate Method Decision

> The original candidate ordering below is historical. Program Phase numbering,
> current status, and remaining work are owned by `program-roadmap.md` and
> `remaining-work-register.md`; no later executor should infer a next slice
> from the Phase 3 wording in this historical section.

- 将“彻底”定义为最终消除双重 owner、反向依赖、依赖环和永久兼容缝；执行方式采用
  contract-preserving、domain-sliced、strangler-style 的渐进迁移，禁止大爆炸重写。
- 每个切片遵循：冻结行为与 authority -> 建 characterization/scenario evidence ->
  Backend 边界迁移 -> Web 边界迁移 -> 真实跨单元验证 -> 观察 -> 删除旧路径。
- 首个校准切片候选为 `feedback-questionnaire`：边界较窄、已有 scenario，适合验证
  controller/use-case/repository、Web query/UI 与跨单元测试的整套迁移协议。
- 校准后按证据优先处理 PR Discovery/PR，再处理 Admin；Commerce/Payment/RideHailing、
  WeChat/OAuth 和全局 Job/Notification bootstrap 放在护栏成熟后。
- 进入任何应用代码修改前，必须由用户明确发出开始指令，并先完成 Impact Handshake。

## Active Scope

- Phase 1/2: 保留为历史冻结与只读基线，不覆写其原始证据。
- Phase 3: `3-1`–`3-8` 已完成并收口；其授权不得外溢到后续领域。
- Phase 4 User/Auth: 本地实现与 completion review 已完成；4-1 rollout
  observation、4-3.4 provider/edge topology evidence，以及 canonical-host
  System-harness re-entry condition 仍是外部/环境分支。
- Phase 5 Commerce: 本地 owner convergence 已由 `171319de` 提交；5-7a
  staging/provider evidence 仍待执行或显式延后。历史 Rental Bill 支付风险和
  RideHailing 后结算费用确认恢复分别作为 Sir 接受的风险与 Phase 6
  atomic-settlement + typed-Job handoff 保留；不引入通用 outbox，也不得
  在其它 slice 中偷渡修复。
- Phase 6 Job/Notification 的只读 `6-0` topology inventory、D6-N-01、
  D6-J-02 与 D6-F-01 已完成；Job-as-Notification-Task、business/channel template mapping、
  Job `UNTIL_ACKNOWLEDGED`、PR inbox retirement 与通用 state-placement
  规则已经批准并固化。`6-1` JobRunner foundation 与 `6-2` Notification exemplar
  已本地实现和验证；`6-3` 的 one-shot、PR-message atomic window、visible ACK
  与 legacy state/decoder retirement 已完成。`6-4` 已按曹操官方合同完成
  atomic settlement → generic Job handoff；`6-5` 已完成 runtime/recovery、
  scoped console/stdout 清理和全量本地复审。既有 Commerce/FC/SLS
  pseudo-observability cleanup 与 Analytics 收敛随后已由 Phase 7 完成；真正专业的
  program O11y 及依赖其 replacement proof 的 `notification_deliveries` 退役
  属于 Phase 7 clean-baseline 之后的独立未来任务。Phase 6 控制面在
  `09-phase6-job-notification/`。
  Phase 7 的 `7-0` 只读入口已经按 Sir 的纠正重切，并建立
  `10-phase7-observability-analytics/` 控制面；`7-1` 删除边界已经批准，
  包括前向退役 `operation_logs`。Sir 已于 2026-07-23 明确开始剩余
  Phase；`7-2`–`7-5` 已完成并通过全量本地门禁。Sir 随后确认 SLS
  没有配置 saved query/dashboard，并决定本 Phase 不再盘点平台遗留；
  D7-04 以明确标注的 operator evidence/decision 关闭，而不虚构 Codex
  执行过平台审计或删除。Phase 7 因此完整收口。Phase 8 global
  review/cleanup 的只读 `8-0` 已在 `cf6cd736` 完成；Sir 随后授权并完成
  `8-1`–`8-6`，关闭 active boundary regressions、package contract owner
  gap、Web direction reversals、Backend controller/repository seams 和
  Commerce SCC，并收敛有证明的 endpoint/compatibility/control residue。
  Sir 于 2026-07-24 授权连续执行 `8-6`/`8-7`；两者的 integrated、
  authority、sequence、canonical 与 durable-control proof 均已通过。
  Phase 8 本地完成但尚未提交，`HEAD` 仍为 `cf6cd736`。
- 独立 Node/Oxc/quality-gate 工作不属于本程序 Phase；不得被上述任一领域提交吸收。

## Delegation And Validation Contract

- 工作拆为 `01-backend`、`02-web`、`03-cross-unit` 三个独立子任务，根代理只写
  `04-integration` 和根控制文件。
- 每个子任务使用多个聚焦文件，事实与建议分离；关键事实必须进入 `evidence-index.md`。
- 每项重要结论至少携带一个仓库路径或可复跑命令。计数必须记录搜索范围、排除项和命令。
- Backend/Web 子任务只做静态只读取证；Cross-unit 子任务独占测试/gate 的执行，避免并行数据库、构建和报告器冲突。
- 根整合采用低成本复核：引用存在性、关键计数抽样复跑、跨子任务冲突矩阵、canonical gate 结果核对。

## Current Status

- Phase 1 and 2 are historical complete snapshots; Phase 2's toolchain recovery is also complete.
- Phase 3 `3-1`–`3-8` is complete, including both named conflict closures.
- Phase 4 is locally complete after its completion review; remaining claims are explicitly external evidence or
  System-harness re-entry conditions, not local source work.
- Phase 5 local Commerce convergence is committed as `171319de`; its local review completed F-03 Placement feedback
  repair and carried F-01/F-02 forward as explicit deferrals. It is not a deployment-topology conclusion.
- Phase 6 `6-0`–`6-5` is locally complete under
  `09-phase6-job-notification/`: generic Job/Notification ownership, producer
  handoffs, semantic ACK, legacy state/decoder retirement, atomic
  fee-confirmation recovery, runtime seams and full local review are proven.
  Phase 7 subsequently removed the carried Phase 5 debug stdout. Professional
  O11y and delivery-table retirement remain an independent future task.
- Phase 7 `7-0` is complete as a corrected read-only negative-baseline entry.
  Its packet withdraws SLS-first/structured-output as a target, makes their
  retirement the first source slice, keeps Analytics as a separate evidence
  family, and hands professional program O11y plus any
  `notification_deliveries` retirement to a future task. `7-1` decisions are
  complete; Sir started the remaining Phase on 2026-07-23. `7-2`–`7-5` are
  complete with canonical static/unit/Backend/System scenario proof. D7-04 is
  closed by Sir's confirmation that no configured SLS saved query/dashboard
  exists and no further platform inventory is required. Phase 7 is closed
  without claiming external SLS access or deletion by Codex.
- Phase 8 `8-0`–`8-7` is complete locally. The executed slices reduced the current
  architecture-fitness result to one known terminal WeChat OAuth exception with
  `0 new / 0 unresolved`, preserved the package contract path while converging
  its owners, removed controller/repository and model/query reversals, and made
  Backend/Web static and dynamic-inclusive import graphs acyclic. The bounded
  zero-consumer compatibility set is also retired. The final
  authority/sequence/canonical/durable handoff passed under Sir's 2026-07-24
  authorization. The working tree remains uncommitted at `cf6cd736`.

## Phase Exit Summary

- Frozen boundaries: `04-integration/frozen-boundaries.md`
- Read-only baseline: `04-integration/baseline-scorecard.md`
- Conflicts/open questions: `04-integration/conflicts-and-open-questions.md`
- Candidate readiness: `04-integration/next-slice-readiness.md`
- Root verification: `04-integration/verification-log.md`
- Current Phase 3 control surface: `06-phase3/00-task-packet.md`
- Phase 4 control surface: `07-phase4/00-task-packet.md`
- Phase 5 control surface: `08-phase5/00-task-packet.md`
- Phase 6 control surface: `09-phase6-job-notification/00-task-packet.md`
- Phase 7 control surface: `10-phase7-observability-analytics/00-task-packet.md`
- Phase 8 control surface: `11-phase8-global-review-cleanup/00-task-packet.md`
- Phase 8 `8-0` scorecard:
  `11-phase8-global-review-cleanup/01-global-rebase-and-baseline/current-and-target-scorecard.md`
- Current remaining-work register: `remaining-work-register.md`
