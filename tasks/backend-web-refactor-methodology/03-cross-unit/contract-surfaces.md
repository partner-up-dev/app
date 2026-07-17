# 跨单元 Contract Surfaces 冻结

> Historical snapshot at `a8cf2d7`: use the current durable docs and `../06-phase3/` before acting on this map.
> Event references below describe the former model and are not current target-state authority.

## 总则

本文件是 Phase 1 的任务态 authority/contract map。它不取代 PRD、Product TDD、Unit TDD 或 Deployment docs。重构可以移动代码，但必须保持下面的所有权方向与可观察合同；任何 authority 反转、路由/API 协作变化或用户承诺变化都必须先回到 durable owner。

## Authority Map

| Surface | 权威状态 / 职责 | 接收与输出合同 | 不得成为的权威 | Durable owner |
| --- | --- | --- | --- | --- |
| Browser | 当前 URL、browser capability、local/session storage、cookie transport、anonymous UUID、pending action、`spm`、share replay | 输入 browser route/capability；输出 route navigation、Bearer/cookie transport、用户 intent | PR/event/order/notification eligibility 与 durable entity truth | `docs/20-product-tdd/unit-topology.md:27-35`；`docs/20-product-tdd/system-state-and-authority.md:57-66,103-111` |
| Web | route composition、page assembly、UI interaction state、cache/invalidation、capability fallback、active share session | `route -> process/use-case -> typed RPC`；canonical reads 水合 UI；command problem 决定展示位置 | 复制后端 domain rules、用 caller preview 取代 canonical entity read、把 cache 当产品真相 | `docs/20-product-tdd/system-state-and-authority.md:57-74,103-111` |
| RPC / HTTP | `AppType` 共享 route/payload/response shape；Bearer/cookie transport；Problem Details；token rotation header | Backend export `AppType`；Web `hc<AppType>()`；HTTP runtime interaction；`application/problem+json` | 自建重复 DTO 真相、page-local error string registry、domain response 内 session payload | `docs/20-product-tdd/cross-unit-contracts.md:22-30,52-91` |
| Backend | domain rule、eligibility、state transition、auth/session verification、canonical projection、side-effect intent | API command/read -> transaction/domain events/outbox/jobs -> typed response/problem | 把 browser UI policy 当 durable truth；假设 provider payment state 可由本地镜像替代 | `docs/20-product-tdd/unit-topology.md:7-17`；`docs/20-product-tdd/system-state-and-authority.md:69-101` |
| Postgres | PR/user/event/message/commerce/config/operation/outbox/job/notification/analytics 的 durable backend truth | Repository transaction、forward-only schema/data migrations、canonical reads | local reset 作为 staging/production recovery；frontend storage 反写 authority | `docs/20-product-tdd/system-state-and-authority.md:17-55`；`docs/40-deployment/backend-runtime.md:130-145` |
| Jobs / Outbox | DB-backed delayed work、dedupe、lease/retry、bucket timing、opportunity/wave/delivery progression | Domain event/scheduling input -> persisted opportunity/job -> external tick claim -> dispatch revalidation -> persisted outcome | 长驻内存 scheduler；API return 即 side effect 完成；notification module 自定 JobRunner timing semantics | `docs/20-product-tdd/unit-topology.md:63-68`；`docs/20-product-tdd/notification-contracts.md:18-29,54-112`；`docs/40-deployment/backend-runtime.md:147-180` |
| Providers | gateway-facing payment lifecycle、provider transaction id/payload/failure；CaoCao execution reads、settlement/cancel preview | Backend adapter 发起/查询/验签；provider callback/read 返回 execution truth；backend 映射为产品 projection | 未验证 callback；将 cancel fee preview 当 final settlement；本地持久化第二份 provider transaction truth | `docs/20-product-tdd/system-state-and-authority.md:113-118`；`docs/20-product-tdd/ecommerce-provider-contracts.md:5-30`；`docs/40-deployment/provider-edge-routing.md:3-68` |

## Typed HTTP 与 AppType

- Backend 从 `apps/backend/src/index.ts` 导出 `AppType`，Web 用 `hc<AppType>()` 创建 RPC client。类型共享负责在编译时暴露 route/payload/多数 response drift；生产交互仍是 HTTP。
- `AppType` 是 cross-unit compile-time contract，不意味着 Web 可 import backend runtime internals，也不替代 runtime validation。
- Route shape、payload、response 或 selected shared domain/entity type 的 breaking change，必须同步 Backend、Web 与针对该 journey 的验证；若 coordination shape 变化，更新 Product TDD。
- Local portless 与 system scenario 有两套独立 origin/runtime：开发环境用同源 `/api` proxy；system scenario 由 Vitest project 分配隔离 frontend/backend HTTP ports。

Owner：`docs/20-product-tdd/cross-unit-contracts.md:22-47`，`docs/20-product-tdd/test-platform.md:61-83`。

## Route -> Auth -> Command -> Result 序列

```text
Browser URL / user intent
  -> Web route/process (route state, pending action, capability fallback)
  -> hc<AppType>() request (Bearer JWT; credentialed OAuth/bind flows include cookies)
  -> Backend auth/session + domain command authority
       -> success: transaction + domain/outbox/job intent, optional x-access-token rotation
       -> expected rejection: RFC 9457 Problem Details {status, code, title, detail}
  -> Web applies rotated session transport, invalidates canonical reads, presents result
  -> Jobs/providers may converge asynchronously after the command response
```

冻结点：

- Stable user route families 由 `docs/20-product-tdd/cross-unit-contracts.md:93-122` 及 focused owners 定义；route family 改名、兼容 redirect 退场或 route-to-API handoff 变化属于 Product TDD 变化。
- 用户动作需要 `authenticated` role 时，Backend 返回 `401` + `AUTHENTICATED_REQUIRED`；全局 RPC auth policy 启动 WeChat OAuth，command owner 负责 domain-specific pending-action replay。
- Human-readable `title/detail` 仍由 Backend 根据 locale 决定；Web 只决定展示位置与交互方式。稳定分支依赖 HTTP status + `code`，不能解析文案。
- 预期 API 失败必须经 Problem Details helper/typed domain helper；raw `HTTPException` 只允许在 global adapter 归一化兼容异常。

Owner：`docs/20-product-tdd/cross-unit-contracts.md:52-91,93-138`，`docs/30-unit-tdd/wechat-oauth-handoff.md:14-50`。

## OAuth Handoff 安全边界

```text
WeChat -> Backend callback validates state/user
       -> sets short-lived path-scoped signed HttpOnly cookie
       -> redirects to returnTo + non-secret nonce
Browser/Web gate -> exchanges nonce with credentials: include
                 -> applies auth session
                 -> removes nonce before route content/share orchestration resumes
```

- `returnTo` 不得包含 frontend access token、WeChat token、OAuth code/state。
- Auth bootstrap 与 auto-login 在 pending handoff 时必须 defer；OAuth redirect single-flight。
- Handoff missing/mismatch/expired/consumed 是失败，不是匿名成功。
- 修改 callback URL、cookie options、nonce/query cleaning、bootstrap gating 或 share gating，必须更新/复核 Unit TDD；修改 session/auth transport 则还必须更新 Product TDD。

Owner：`docs/30-unit-tdd/wechat-oauth-handoff.md:14-60`。

## Canonical Reads 与 Cache

- 跨 route/surface 稳定 entity facts 一律由 canonical entity read 提供。Caller 可提供 placement、route override、cover、time label、action slots 等 context，不能提供另一套 entity truth。
- PR 典型合同：`/pr/mine`、event list、Form candidate 与 search 只传 PR id + context；title/status/location/time/participant count 由 `GET /api/pr/:id` 水合。
- TanStack Query/cache 是 UX 优化。Command success 后由 Web invalidation/refetch 恢复 canonical state；不能因乐观 UI 产生独立 lifecycle/eligibility 规则。
- Base share descriptor 使用 canonical detail payload metadata；Web 只拥有当前 route 的 share session、replay 与富媒体降级。

Owner：`docs/20-product-tdd/system-state-and-authority.md:57-74`，`docs/20-product-tdd/pr-lifecycle-contracts.md:41-48,74-88`。

## Postgres 与 Forward-only Evolution

- Drizzle entities + committed SQL artifacts 是 schema source；staging/production schema/data evolution 与 recovery 都是 forward-only。
- Migration 必须先于 backend deploy；若 migration 后 deploy 失败，应让 runtime 前向适配新 DB state，不能 reset hosted DB。
- Legacy invalid data 通过 forward-only data migration 修复，read path 不得建立第二套 normalization policy。
- Schema、data meaning、transaction attachment 或 durable authority 改变，需要 Product TDD（跨单元）或 Unit TDD（hard-local）明确；用户可见规则改变再回 PRD。

Owner：`docs/20-product-tdd/unit-topology.md:63-68`，`docs/20-product-tdd/pr-lifecycle-contracts.md:5-12`，`docs/40-deployment/backend-runtime.md:130-145`，`docs/40-deployment/recovery.md:3-56`。

## Side Effects、Jobs 与 Providers

- Backend transaction 持久化产品事实与 side-effect intent；outbox/job 可在 API response 后运行，Web 不得显示“已送达/已结算”等超出持久化 projection 的结论。
- Scale-to-zero runtime 要求 delayed work 由 DB-backed jobs + external tick 驱动，不得依赖进程内长期 scheduler。
- JobRunner 集中拥有 bucket timing、due/missed、lease/retry；notification 仅提供 kind-specific timing/eligibility policy。
- Dispatch 必须 reload current state 并重新验证 recipient、quota、membership、wave/source slot/candidate、channel config。
- Provider callback/query 需要验签、environment/provider binding 检查；payment provider lifecycle 是 provider truth，而 Order/Bill/settlement projection 是 Backend truth。
- CaoCao cancellation fee 是 pre-cancel decision surface，不是 post-cancel final settlement；final settlement 必须走 provider final-settlement query contract。

Owner：`docs/20-product-tdd/cross-unit-contracts.md:133-138`，`docs/20-product-tdd/notification-contracts.md:18-112`，`docs/20-product-tdd/ecommerce-contracts.md:107-151,389-454`，`docs/20-product-tdd/ecommerce-provider-contracts.md:5-30`。

## Change Routing

| 变化 | 必须更新的 durable owner | 最低验证 |
| --- | --- | --- |
| 用户是否能匿名创建、何时登录、status/route/join/message/share/revisit/commerce 的用户可见语义 | PRD `docs/10-prd/behavior/*`；随后同步 Product TDD realization | 对应 browser journey scenario + unit/domain guards |
| State authority 在 Browser/Web/Backend/Postgres/provider 间移动 | `docs/20-product-tdd/system-state-and-authority.md` + focused contract | Backend command/read proof + cross-unit scenario |
| `AppType` route/payload/response、route-to-API coordination、Problem Details code/status、auth/token/cookie | `docs/20-product-tdd/cross-unit-contracts.md`；OAuth 细节另改 `docs/30-unit-tdd/wechat-oauth-handoff.md` | Backend/Web type + focused unit + auth browser scenario |
| PR/event/message/notification/ecommerce focused contract | 对应 `pr-lifecycle/event-context/pr-messaging/notification/ecommerce*-contracts.md` | Focused backend tests + relevant Web unit + journey scenario |
| DB evolution/recovery/rollout/jobs runtime | `docs/40-deployment/*`；若改变 system-shaping coordination 同步 Product TDD | db lint/check、backend scenario、rollout/recovery review |
| 仅模块内部移动且不改变上述合同 | 最近 `AGENTS.md` / optional Unit TDD；通常无需改 PRD/Product TDD | 所属 unit static/type/unit；跨边界时加 scenario |

## 已知 Contract 张力

1. `Anonymous DRAFT`: PRD 与 PR lifecycle contract 不一致，详见 `product-invariants.md`；在 owner 判定前保持 `Open`。
2. `Waitlist auth payload`: `docs/20-product-tdd/cross-unit-contracts.md:62-68` 禁止 domain response 携带 session payload，而 `docs/20-product-tdd/pr-lifecycle-contracts.md:55` 仍声明 waitlist 返回 auth payload。最低成本复核是检查 typed response 与唯一 consumers；是否保留兼容期必须由 Product TDD 决定。
