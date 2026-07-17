# Web Behavior Contracts (Phase 1 Freeze)

> 范围：本文件冻结重构期间不可改变的 Web 可观察行为与边界；不改变 durable owner。
> 术语：`Fact` 是代码或 owner 文档直接支持的事实；`Inference` 是待验证的解释；`Open question` 不可廉价确认，不能作为重构前提。

## 路由与页面装配

- **Fact — route/page assembly。** `src/app` 只拥有应用接线，`pages` 只拥有路由入口与页面上下文；可复用业务逻辑应留在 domain/process，页面不应成为可复用行为 owner。来源：[ARCHITECTURE](../../../apps/web/src/ARCHITECTURE.md:14)、[web AGENTS](../../../apps/web/AGENTS.md:38)、[router](../../../apps/web/src/app/router.ts:48)。
- **Fact — 路由是唯一页面入口表。** 路由声明懒加载 page，`/pr/:id`、`/e/:eventId` 与 OAuth callback 是显式记录；页面接线和 admin guard 仍在 `app/router.ts`。来源：[router](../../../apps/web/src/app/router.ts:7)、[router](../../../apps/web/src/app/router.ts:83)、[router](../../../apps/web/src/app/router.ts:433)、[router](../../../apps/web/src/app/router.ts:473)。
- **Fact — App root 编排跨路由 gate。** `AppRoot` 在 `RouterView` 外包裹 OAuth handoff gate，并挂载 matched-PR overlay、auth bootstrap 与 route-share orchestration；重构不可把这些流程偷偷下沉到某一个 page。来源：[AppRoot](../../../apps/web/src/app/AppRoot.vue:1)。
- **Fact — Form Mode 单一旅程状态机。** `/e/:eventId` 的选择、推荐、matched handoff、no-match 与 zero-candidate create handoff 必须保持一个 route-level 状态机；no-match 是 inline state。来源：[event-context](../../../docs/20-product-tdd/event-context-contracts.md:20)、[event Form Mode TDD](../../../docs/30-unit-tdd/frontend-event-form-mode.md:15)、[event UI AGENTS](../../../apps/web/src/domains/event/ui/AGENTS.md:13)。

## Typed transport、读取与缓存

- **Fact — Hono RPC/AppType 边界。** 前端客户端必须以 backend 导出的 `AppType` 创建 `hc<AppType>()`，应用读写不手写重复 API 返回类型或改用 manual fetch。来源：[cross-unit contracts](../../../docs/20-product-tdd/cross-unit-contracts.md:18)、[rpc](../../../apps/web/src/lib/rpc.ts:7)、[web AGENTS](../../../apps/web/AGENTS.md:29)。
- **Fact — TanStack Query 是 async server state 的 owner。** 读路径用 query hook，写路径用 mutation；query key 必须来自 `shared/api/query-keys`，不把 `client.api` 读调用直接放入组件。来源：[queries AGENTS](../../../apps/web/src/queries/AGENTS.md:9)、[query keys](../../../apps/web/src/shared/api/query-keys.ts:3)、[PR detail query](../../../apps/web/src/domains/pr/queries/usePRDetail.ts:13)。
- **Fact — canonical PR read。** 列表/预览只传 `prId` 与调用方上下文；稳定 PR facts 从 `GET /api/pr/:id` 的 canonical read 获得，`PRPreviewCard` 自己调用 `usePRDetail`。来源：[system authority](../../../docs/20-product-tdd/system-state-and-authority.md:70)、[PR lifecycle](../../../docs/20-product-tdd/pr-lifecycle-contracts.md:41)、[PR UI AGENTS](../../../apps/web/src/domains/pr/ui/AGENTS.md:8)、[PRPreviewCard](../../../apps/web/src/domains/pr/ui/primitives/PRPreviewCard.vue:32)。
- **Fact — 失效与缓存并非领域真相。** TanStack Query cache 是前端非权威状态；backend 仍拥有 PR、session、event、order 等产品事实与规则。来源：[system authority](../../../docs/20-product-tdd/system-state-and-authority.md:50)、[system authority](../../../docs/20-product-tdd/system-state-and-authority.md:119)。

## Auth / OAuth handoff

- **Fact — handoff URL 只携带 nonce。** `wechatOAuthHandoff` 不能携带 token、OAuth code 或 state；前端 exchange 必须 `credentials: "include"`，成功应用 auth session 后才从地址栏移除 nonce。来源：[wechat process AGENTS](../../../apps/web/src/processes/wechat/AGENTS.md:3)、[OAuth handoff TDD](../../../docs/30-unit-tdd/wechat-oauth-handoff.md:14)、[oauth-handoff](../../../apps/web/src/processes/wechat/oauth-handoff.ts:49)。
- **Fact — handoff 是 bootstrap/auto-login 的前置 gate。** pending nonce 时 auth bootstrap 返回 deferred，不注册匿名用户；route auto-login 也先 defer，之后才 bootstrap 和作 OAuth redirect 决策。来源：[auth bootstrap](../../../apps/web/src/processes/auth/useAuthSessionBootstrap.ts:54)、[route auto-login](../../../apps/web/src/processes/wechat/useRouteWeChatAutoLogin.ts:84)。
- **Fact — AUTHENTICATED_REQUIRED 的统一入口。** RPC fetch policy 识别 401 后交给 authenticated-required policy；领域 command owner 仍负责自己的 pending-action replay。来源：[rpc](../../../apps/web/src/lib/rpc.ts:25)、[PR lifecycle](../../../docs/20-product-tdd/pr-lifecycle-contracts.md:24)。

## Share、replay 与浏览器连续性

- **Fact — route share 是 process-like route-scoped orchestration。** Share session/replay 在 route 变化、`pageshow`、可见性恢复时重放；pending OAuth nonce 时不生成 descriptor，且 share URL 先经 sensitive-route sanitizer。来源：[route share orchestrator](../../../apps/web/src/domains/share/use-cases/useRouteShareOrchestrator.ts:78)、[route share orchestrator](../../../apps/web/src/domains/share/use-cases/useRouteShareOrchestrator.ts:122)、[PR lifecycle](../../../docs/20-product-tdd/pr-lifecycle-contracts.md:72)。
- **Fact — entity share truth 不在 page。** PR detail payload 提供 canonical title/description/path/image/revision；frontend 使用它创建 base descriptor，rich poster/thumbnail 失败不得破坏 base descriptor。来源：[PR lifecycle](../../../docs/20-product-tdd/pr-lifecycle-contracts.md:74)。
- **Fact — local/session/browser state 的定位。** route-local interaction、draft、TanStack cache、local/session storage、share replay 与 capability fallback 只服务 UX/连续性，不能重演 backend domain policy。来源：[system authority](../../../docs/20-product-tdd/system-state-and-authority.md:50)、[session storage](../../../apps/web/src/shared/auth/session-storage.ts:3)。

## 测试可见性

- **Fact — system journey 的 semantic anchors。** 可能进入 scenario/E2E 的路由流程，要在真实 primary action、modal action 和结果 affordance 上提供稳定 `data-testid`；命名描述 route/workflow node。来源：[web AGENTS](../../../apps/web/AGENTS.md:34)、[test platform](../../../docs/20-product-tdd/test-platform.md:50)。
- **Fact — 场景边界。** 跨单元 journey 是 root-owned scenario：Playwright browser → Vite → real backend HTTP → isolated Postgres；本 workstream 的静态证据不替代它。来源：[test platform](../../../docs/20-product-tdd/test-platform.md:55)。

## 需要防伪的解释

- **Inference — canonical-read 可能有 N+1 UX 成本。** `PRPreviewCard` 为每个 card 触发 canonical detail query 是已证实的合同，不是自动 bug；若一个列表同时渲染多张 card，network/cache 热点才可能成为成本。低成本证伪：在目标 route 以浏览器网络面板或现有 scenario trace 观察实际请求去重；在此之前不可为“优化”改变 canonical-read owner。
- **Inference — OAuth SCC 是边界压力信号，不是循环一定错误。** 静态 import 图含一个五文件 SCC（见 [readonly baseline](./readonly-baseline.md)）；其节点围绕 RPC 401 policy 和 WeChat login。低成本证伪：逐边确认是否为纯 type/常量 import，或在不改变流程的情况下用 dependency-cruiser/AST import 分类复核。
- **Open question — `WeChatOAuthCallbackPage.vue` 的组件内 RPC 调用。** 静态搜索发现它是唯一 `.vue` 的 `client.api` 调用；该页可能是刻意保留的 callback compatibility seam，也可能违背一般 read-path placement。需先确认 callback 是否仍由 router 用户路径进入及其错误/redirect 语义，再决定迁移 owner。
