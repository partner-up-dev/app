# Web Authority Boundaries (Phase 1 Freeze)

## 当前 owner map

| Area | Current owner (Fact) | Authority / allowed responsibility | Evidence |
| --- | --- | --- | --- |
| `app/` | application wiring | bootstrap、providers、router wiring；不拥有业务流程 | [architecture](../../../apps/web/src/ARCHITECTURE.md:14), [app AGENTS](../../../apps/web/src/app/AGENTS.md:1) |
| `pages/` | route entrypoints | 容器装配、page context、可见性与 page-level error aggregation；不拥有可复用业务 side effect | [web AGENTS](../../../apps/web/AGENTS.md:31), [architecture](../../../apps/web/src/ARCHITECTURE.md:50) |
| `processes/` | cross-domain/platform workflow | OAuth bootstrap/handoff、route-handoff 等跨域或平台工作流 | [architecture](../../../apps/web/src/ARCHITECTURE.md:43), [AppRoot](../../../apps/web/src/app/AppRoot.vue:11) |
| `domains/<domain>/` | business module | domain model、queries/commands/use-cases、domain UI；domain 语义不提升到 shared | [architecture](../../../apps/web/src/ARCHITECTURE.md:27), [domains AGENTS](../../../apps/web/src/domains/AGENTS.md:1) |
| `shared/` | cross-domain primitive/infrastructure | browser/platform、generic UI、storage/URL/telemetry；禁止反向 import domain | [architecture](../../../apps/web/src/ARCHITECTURE.md:19), [architecture](../../../apps/web/src/ARCHITECTURE.md:56) |
| `model` | domain meaning transform | type、selector、adapter、format/path helper；不得 import Vue SFC | [architecture](../../../apps/web/src/ARCHITECTURE.md:70), [architecture](../../../apps/web/src/ARCHITECTURE.md:59) |
| `queries` / `commands` | transport adapters | 只负责 typed access 与 cache/invalidation；不得 import page/widget | [architecture](../../../apps/web/src/ARCHITECTURE.md:58), [queries AGENTS](../../../apps/web/src/queries/AGENTS.md:9) |
| `shared/ui` | true primitive | 跨 domain、稳定窄 API、无 domain copy/workflow/query result assumptions | [shared UI AGENTS](../../../apps/web/src/shared/ui/AGENTS.md:1), [shared UI TDD](../../../docs/30-unit-tdd/frontend-shared-ui-primitives.md:15) |

## 前后端权威分界

- **Fact — backend authoritative：** persisted PR/partner/session/event/POI/order/notification truth，及 PR action、join gate、canonical route/share/meeting-point 等 policy projection；frontend 不可另造规则。来源：[system authority](../../../docs/20-product-tdd/system-state-and-authority.md:25)、[system authority](../../../docs/20-product-tdd/system-state-and-authority.md:70)。
- **Fact — frontend authoritative：** route composition、UI-specific interaction、editor/map display、browser persistence/capability fallback、client cache invalidation、route-scoped share orchestration/replay。来源：[system authority](../../../docs/20-product-tdd/system-state-and-authority.md:108)。
- **Fact — canonical entity facts：** 预览或跨 surface 稳定实体 facts 按 entity id 走 canonical read；caller props 仅是 placement/cover/time/action slots 等上下文。来源：[system authority](../../../docs/20-product-tdd/system-state-and-authority.md:62)、[PR lifecycle](../../../docs/20-product-tdd/pr-lifecycle-contracts.md:41)。

## 已观察 seam / 多状态机风险

| Finding | Classification | Evidence / implication |
| --- | --- | --- |
| `lib/`、`router/`、`stores/` 被明示为 legacy compatibility seams；顶层 `queries/` 已退役且当前无生产文件。 | Fact | [web AGENTS](../../../apps/web/AGENTS.md:46), [queries AGENTS](../../../apps/web/src/queries/AGENTS.md:1), [baseline](./readonly-baseline.md) `WEB-003` |
| OAuth handoff、auth bootstrap 与 route auto-login 都作用于 browser/session lifecycle；设计上通过 pending nonce defer 形成顺序约束。 | Fact | [OAuth TDD](../../../docs/30-unit-tdd/wechat-oauth-handoff.md:14), [auth bootstrap](../../../apps/web/src/processes/auth/useAuthSessionBootstrap.ts:68), [auto-login](../../../apps/web/src/processes/wechat/useRouteWeChatAutoLogin.ts:89) |
| Form Mode surface、route-handoff process 均存在显式 phase/state；前者 route-level business journey，后者 navigation animation state，不能无证据合并。 | Fact | [Form Mode TDD](../../../docs/30-unit-tdd/frontend-event-form-mode.md:15), [matched handoff](../../../apps/web/src/processes/route-handoff/useMatchedPRHandoff.ts:13) |
| route-share controller 与 orchestrator 有 module-scoped session/replay state；它是 frontend UX authority，必须继续避开 OAuth-sensitive URL。 | Fact | [share controller](../../../apps/web/src/domains/share/use-cases/route-share-controller.ts:136), [share orchestrator](../../../apps/web/src/domains/share/use-cases/useRouteShareOrchestrator.ts:122) |
| `WeChatOAuthCallbackPage.vue` 直接调用 RPC；一般 query placement 规则与 callback compatibility 的交界尚未判定。 | Open question | [direct transport baseline](./readonly-baseline.md) `WEB-006`; 不应凭静态规则直接改写 callback |
| import 图的 OAuth/RPC SCC 说明 direction 不是完全单向；目前不能推断运行时错误。 | Inference | [baseline](./readonly-baseline.md) `WEB-008`; 先分类循环边再定拆分点 |

## 重构建议（非冻结事实）

- **Proposal — 试点优先采用 Form Mode 的明确 route-level state machine。** 它已有 Unit TDD、稳定 testid 和 domain/process 分界；可先提取 narrow use-case 或 child-control contract，不移动 backend rule。证伪条件：静态/场景证据显示实际热点更集中在另一个同等有合同的 flow。
- **Proposal — 把 `lib/rpc.ts` 视为迁移边界，不以“搬目录”作为首步。** 它是最高入度 hub（`WEB-008`），先把 domain transport import 收敛到已存在 query/command owner，再评估 shared API owner；否则大面积 import churn 会掩盖行为回归。
- **Proposal — 对 large SFC 只按行为 seam 拆分。** 文件行数、ref/watch 数是 review 线索，不是分拆授权；优先验证 state machine 和 canonical-read 契约后再切。
