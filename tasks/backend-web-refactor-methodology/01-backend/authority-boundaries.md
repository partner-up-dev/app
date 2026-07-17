# Backend authority boundaries（当前 owner 冻结）

本文只描述当前实现与重构期间不得漂移的 authority path。`Fact` 是直接观察；
`Inference` 是依赖图/代码结构推导的风险；`Open question` 不是批准的改动。
目标架构建议不写入当前 owner 栏。

## 1. Layer owner map

| Layer | 当前 owner（Fact） | 当前证据 | 重构期间禁止的漂移 |
| --- | --- | --- | --- |
| Controller / HTTP | `apps/backend/src/controllers/*.controller.ts` 定义 Hono route、`zValidator` boundary、auth middleware 接入、协议转换和 `c.json` 响应；业务 command 主要转发到 domain use-case。 | `apps/backend/src/controllers/AGENTS.md:1-11`；`apps/backend/src/index.ts:200-229`。 | 不在 controller 新增 status/eligibility/time/capacity/settlement 规则；不绕过 validator；不把 legacy facade 当新 domain owner。 |
| PR controller | `partner-request.controller.ts` 是 `/api/pr` 的当前 HTTP owner；调用 `domains/pr` 导出的 use-case/read-model，并保留少量 `PartnerRequestRepository` 读（404、order id/status projection）。 | `apps/backend/src/controllers/partner-request.controller.ts:1-58,134-180,204-524`。 | 不让 `/api/pr` 再分叉到独立 service orchestration；不把 frontend derived FULL、creator、join-gate 规则复制到 route。 |
| Admin controller | admin controller files 按 `/api/admin` mount，使用 `requireRoles(["service"])` 或 analytics auth；HTTP owner 不等于 admin domain state owner。 | `apps/backend/src/auth/admin-middleware.ts:10-30`；`apps/backend/src/index.ts:224-228`。 | 不在 admin route 直接写另一个 status/visibility/billing truth；写入通过对应 admin domain use-case。 |
| Domain use-case | `apps/backend/src/domains/*/use-cases` 是每个业务 action 的 command/read entry；PR external surface 以 `domains/pr` 为当前 canonical export。 | `apps/backend/src/domains/pr/index.ts:1-6`；`apps/backend/src/domains/pr-core/use-cases/create-pr-structured.ts:93-183`；`apps/backend/src/domains/pr-core/use-cases/join-pr.ts:40-175`。 | 新业务动作不得回到 `src/services/` generic facade；事务边界、授权、状态转换、operation log/job side effects 不得挪到 controller。 |
| Domain service | `domains/*/services` 持有可复用 domain rules/read helpers：PR status、bounds、join gates、time window、meeting point、POI availability、provider observation、pricing 等。 | `apps/backend/src/domains/pr-core/services/status-rules.ts:1-95`；`apps/backend/src/domains/pr-core/services/partner-bounds.service.ts:4-81`；`apps/backend/src/domains/ride-hailing/services/provider-order-observation.ts:1-80`。 | 不创建第二份 rule registry；service facade 只能兼容转发，不能重新编排业务。 |
| Repository | `apps/backend/src/repositories/*Repository.ts` 当前持久化 CRUD owner；`_executor.ts` 仅提供 db/transaction executor 类型。 | `apps/backend/src/repositories/AGENTS.md:1-24`；`apps/backend/src/repositories/_executor.ts:1-6`；`apps/backend/src/repositories/PartnerRequestRepository.ts:19-31,128-238`。 | 不把业务 eligibility、event ownership、状态转换或跨聚合 orchestration 放入 repository；读模型组合要有明确 domain owner。 |
| Entity / schema | `apps/backend/src/entities/*.ts` 定义 Drizzle table、insert/select Zod boundary、持久化类型。 | `apps/backend/src/entities/AGENTS.md:1-24`；`apps/backend/src/entities/partner-request.ts:162-243`。 | 不让 entity schema 反向决定业务 workflow；schema 类型可供 domain/HTTP 复用，但状态语义仍由 domain owner。 |
| Infra jobs | `apps/backend/src/infra/jobs` 的 JobRunner 是 durable delayed execution、dedupe、lease、retry、bucket timing owner；`infra/notifications` 只提供各 notification policy/handler。 | `apps/backend/src/infra/jobs/job-runner.ts:132-313`；`apps/backend/src/infra/jobs/index.ts:1-18`；`docs/20-product-tdd/unit-topology.md:62-67`。 | 不用内存 interval 取代 DB job；notification 不得自己决定 due/missed/lease；domain 不得直接持有长驻 scheduler。 |
| Infra side effects | `infra/operation-log`、`infra/telemetry`、`infra/analytics`、`infra/notifications` 持有审计、用户事件、投影和注意力副作用的运行实现。 | `apps/backend/src/infra/operation-log/operation-log.service.ts:1-7,23-45`；`docs/20-product-tdd/system-state-and-authority.md:27-29,49-55`。 | 异步副作用不可冒充主事务成功；失败/retry/missed 语义不可被 controller 自己解释。 |
| Auth / identity | `src/auth` 负责 JWT/role/request auth；`domains/user` 与 `pr-core/services/creator-identity.service.ts` 负责 user resolution 和 creator identity；WeChat OAuth routes 仍由 `wechat.controller.ts` + legacy WeChat services 共同实现。 | `apps/backend/src/auth/middleware.ts:72-132`；`apps/backend/src/domains/user/services/user-resolver.service.ts:1-34`；`apps/backend/src/domains/pr-core/services/creator-identity.service.ts:39-80`。 | 不把 anonymous continuity 当 authenticated role；不把 OAuth token 放 URL；不要在第三处复制 role/creator resolution。 |
| Provider integration | `domains/payment`、`domains/ride-hailing` 的 ports/adapters/use-cases 负责 provider calls、callback verification 和 local projection；外部 payment/provider 系统拥有 provider-facing lifecycle。 | `docs/20-product-tdd/ecommerce-contracts.md:122-155`；`apps/backend/src/domains/ride-hailing/use-cases/handle-caocao-order-status-callback.ts:115-189`。 | 不把 provider status/snapshot/transaction id 复制成另一份 Backend product truth；provider callback route 不得绕过 provider instance/routing checks。 |

## 2. Frozen authority paths（当前可追溯链）

### PR create/join/read

```text
HTTP /api/pr
  -> partner-request.controller.ts (protocol + zValidator + auth)
  -> domains/pr export surface
  -> pr-core use-case / pr read-model / domain services
  -> repositories
  -> entities + Postgres
  -> infra operation-log / notification jobs (按 action)
```

这是当前实现的组合，不是新增抽象。create path 由
`create-pr-structured.ts:93-183` 统一 canonicalize、guard、persist、slot/defaults、log；
join path 由 `join-pr.ts:40-175` 统一 guard、slot/reliability/status/creator、log 与 jobs。
`GET /api/pr/:id` 的 canonical facts 由 `domains/pr/read-models` 生成；frontend 不应从
`PR.type` 或 caller preview 重新推导 title/place/status。对应 durable authority 为
`docs/20-product-tdd/system-state-and-authority.md:67-116`。

### Commerce / provider

```text
HTTP commerce/payment/provider callback
  -> controller boundary (param/header/raw body validation)
  -> merchandising/trade/fulfillment/bill/payment/ride-hailing use-cases
  -> repositories/entities (local snapshots, obligations, execution slots)
  -> external provider adapter (provider-facing truth)
  -> durable jobs/notifications/operation log where required
```

Merchandising、Trade、Fulfillment、Bill、Payment 的具体 ownership 以
`docs/20-product-tdd/ecommerce-contracts.md:27-155` 为准；不得新建 generic `ecommerce`
dumping-ground（同文档 `:27-50`）。

### Auth/OAuth

```text
Authorization: Bearer JWT
  -> auth/middleware resolveRequestAuth
  -> controller requireSession/requireAuthenticated/... helper
  -> domain identity/authorization guard
```

OAuth navigation 则是 `wechat.controller` 的 state cookie -> callback -> short-lived
handoff cookie + nonce -> `/oauth/handoff` 的 path-scoped exchange，见
`docs/30-unit-tdd/wechat-oauth-handoff.md:11-30,41-60`。任何重构都必须维持这条不泄漏 bearer 的路径。

## 3. Observed dual owners / reverse dependencies

以下是当前事实或由只读 import scan 得出的反向边，不是建议清单。

| 状态 | 观察 | 证据与影响 |
| --- | --- | --- |
| Fact | `domains/pr` 是 canonical export，但 `domains/pr-core` 仍作为 compatibility entrypoint；`domains/pr/services/index.ts` 大量 re-export `pr-core/services`。 | `apps/backend/src/domains/pr/index.ts:1-6`；`apps/backend/src/domains/pr-core/index.ts:1-6`；`apps/backend/src/domains/pr/services/index.ts:1-114`。重构时需同时保持两条 import path 的行为，不能误删 compatibility。 |
| Fact | `src/services/PartnerRequestService.ts` 明确是 thin facade，转发到 `domains/pr`，仍被 `llm.controller`、`wecom.controller`、`ShareService` 使用；新代码指向 domain。 | `apps/backend/src/services/PartnerRequestService.ts:1-23,33-84`；`apps/backend/src/controllers/llm.controller.ts:1-10`；`apps/backend/src/controllers/wecom.controller.ts:1-17`；`apps/backend/src/services/ShareService.ts:1-5,114-123`。 |
| Fact | `ShareService` 同时持有 `PartnerRequestService`、`ShareAIService`、`PartnerRequestRepository`；而 canonical share metadata 在 `domains/pr/sharing`。 | `apps/backend/src/services/ShareService.ts:114-123,125-191`；`apps/backend/src/domains/pr/sharing/pr-share-metadata.service.ts:1-20,120-145`。这是 integration service 与 domain read owner 的双路径。 |
| Fact | `AnchorEventPRContextRepository` 不只是 CRUD：它调用 `eventOwnsTimeWindow`，构造 anchor context，过滤 visibility/status/location，并排序返回 records。 | `apps/backend/src/repositories/AnchorEventPRContextRepository.ts:8-16,39-62,80-110,156-210`。这是 repository/domain logic 的双 owner 风险。 |
| Fact | Controller 当前直接 import legacy services 11 条、repositories 7 条；其中 `wechat.controller`、`pr-controller.shared`、`auth.controller`、`admin-poi.controller`、`partner-request.controller` 仍直接持有 repo/service。 | `rg` 证据见 `readonly-baseline.md` BE-BL-004；代表路径：`apps/backend/src/controllers/wechat.controller.ts:18-57`、`apps/backend/src/controllers/partner-request.controller.ts:29-58`。 |
| Fact | Entities import domain model/type 14 条，repositories import domain 8 条；这是 persistence layer 对 domain 的反向编译依赖，即使部分是 `import type` 也会进入静态拓扑。 | `rg` 证据见 BE-BL-004；代表路径：`apps/backend/src/entities/trade-order.ts:1-15`、`apps/backend/src/entities/commerce-quote.ts:1-18`、`apps/backend/src/repositories/AnchorEventPRContextRepository.ts:10-16`。 |
| Fact | `domains/pr-core/services/user-resolver.service.ts` 是迁移后 compatibility re-export，真实 resolver 在 `domains/user/services`。 | `apps/backend/src/domains/pr-core/services/user-resolver.service.ts:1-2`；`apps/backend/src/domains/user/services/user-resolver.service.ts:1-34`。 |
| Fact | `canonical.controller.ts` 是 unmounted scaffold，并 import 不存在的 `YourService`；不能假定它属于当前 HTTP authority。 | `apps/backend/src/controllers/canonical.controller.ts:1-29`；`apps/backend/src/index.ts:200-229`。 |
| Fact | Provider 有 canonical 与 legacy CaoCao callback 两个公开 mount；二者最终在 use-case 进入同一 `applyCaocaoCallbackWithProviderInstance`。 | `apps/backend/src/index.ts:220-223`；`apps/backend/src/controllers/ride-hailing-provider.controller.ts:27-48`；`apps/backend/src/domains/ride-hailing/use-cases/handle-caocao-order-status-callback.ts:115-189`。 |
| Inference | 静态图的 3 个 cyclic SCC（最大 38 节点）主要由 barrel exports、entity↔domain model 类型边、commerce/payment/trade 与 notification/pr 交叉边组成；先拆 barrel 或类型边可能比先拆业务 use-case 更低成本，但这是待证伪解释，不是执行顺序。 | BE-BL-005 输出的 SCC 节点；需以独立 graph slice 或 import-boundary lint 复核。 |
| Open question | 是否把 `AnchorEventPRContextRepository` 的 context projection 迁为 domain read-model、是否把 WeChat OAuth/subscription controller orchestration 拆为 use-cases，需先确认 scenario/compatibility consumers；本阶段不改 owner。 | 需要跨单元 scenario 与 runtime evidence；`apps/backend/src/controllers/wechat.controller.ts:1199-1379` 当前直接读写 notification opt。 |

## 4. Boundary invariants for the next phase

1. **Controller = protocol only.** 新 route 先声明 validator 和 auth，再调用既有 use-case/read-model；不得通过 repository 直接实现业务决策。
2. **Domain = state/eligibility authority.** PR status、bounds、creator、join gate、time/POI、commerce lifecycle、provider settlement decision 只能有一个可追溯 domain owner。
3. **Repository = persistence shape.** repository API 贴近 entity/persistence semantics；任何跨聚合筛选/排序/业务状态解释都必须在 evidence 中标注当前 owner，不能借机扩大 repository 权威。
4. **Entity = schema boundary.** Drizzle + Zod schema 是 persistence/input shape；AppType 复用类型不等于 entity 拥有 workflow。
5. **Infra = durable side effects.** JobRunner、notification opportunity/wave/delivery、operation log、telemetry/analytics 的失败与重试语义由 infra 持有。
6. **Provider = external execution truth.** Backend 只保存本地 execution/obligation projection；provider callback/query 是唯一 provider-facing truth ingress。
7. **Compatibility is explicit.** `PartnerRequestService`、`pr-core` aliases、legacy CaoCao route、raw OAuth JSON errors、legacy job columns 都必须保持可识别；删除前要有调用方证据与 owner 更新。
