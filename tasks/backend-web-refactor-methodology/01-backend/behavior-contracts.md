# Backend behavior contracts（Phase 1 freeze）

本文件是重构期间的行为护栏，不是目标架构设计。`Fact` 只记录可以从当前
源代码或 durable owner 复核的事实；`Inference` 是由事实推导出的风险判断；
`Open question` 保留尚未获得足够证据的决定。除非另有说明，路径均相对于仓库根。

## 1. HTTP route family 与 typed origin

| 状态 | 冻结项 | 当前 owner / 窄证据 |
| --- | --- | --- |
| Fact | Backend 统一从 `src/index.ts` 聚合 `/api/*` 与 `/internal/*`。当前挂载族包括 auth、users、pr、events、llm、share、upload、feedback、wechat、wecom、config、meta、analytics、telemetry、pois、commerce、placements、study-sprint、payment、ride-hailing、legacy provider、admin 与 maintenance。 | `apps/backend/src/index.ts:200-229`；技术 owner 也明确 Backend 拥有 `/api/*`、`/internal/*`（`docs/20-product-tdd/unit-topology.md:5-16`）。 |
| Fact | PR 写入入口仍是两个明确的 command：`POST /api/pr/new/form` 与 `POST /api/pr/new/nl`；publish 为 `POST /api/pr/:id/publish`，详情为 `GET /api/pr/:id`。 | `apps/backend/src/controllers/partner-request.controller.ts:142-215,518-524`；`docs/20-product-tdd/pr-lifecycle-contracts.md:14-31`。 |
| Fact | PR 消息、read marker、join gate、waitlist、Study Sprint 使用 PR 族和 `/api/study-sprint/*` 的分离端点；详情读模型仍是 canonical entity read。 | `apps/backend/src/controllers/partner-request.controller.ts:226-340,414-524`；`docs/20-product-tdd/pr-messaging-contracts.md:14-38`；`docs/20-product-tdd/pr-lifecycle-contracts.md:50-70`。 |
| Fact | Commerce 的 `/api/payment` 被两个 route module 组合，admin 的 `/api/admin` 被多个管理 route module 组合；这是当前 mount 形状，不等于单一 domain owner。 | `apps/backend/src/index.ts:217-228`。 |
| Fact | CaoCao 新 callback 端点是 `/api/ride-hailing/caocao/:providerInstanceId/callback/order-status`，旧兼容端点是 `/api/v1/service_provider/caocao/callback/order`。 | `apps/backend/src/controllers/ride-hailing-provider.controller.ts:27-48`；mount 前缀见 `apps/backend/src/index.ts:220-223`。 |
| Fact | Backend 导出 `AppType = typeof routes`，并额外导出 entity/domain 类型与 schemas；Frontend 的 Hono RPC 依赖这个编译期来源。 | `apps/backend/src/index.ts:200-255,299-372`；`docs/20-product-tdd/cross-unit-contracts.md:22-31`。 |
| Inference | `canonical.controller.ts` 的两个 route declaration 不在 index mount 中，因而不能作为对外 API 族的事实；它更像未完成的 scaffold/legacy seam。 | 当前文件 `apps/backend/src/controllers/canonical.controller.ts:1-29`；mount 列表 `apps/backend/src/index.ts:200-229`。 |
| Open question | 是否在后续 execute slice 中删除或修复 `canonical.controller.ts`？它 import 的 `../services/YourService` 当前不存在，不能在未确认兼容范围前直接改动。 | `apps/backend/src/controllers/canonical.controller.ts:6-9`；`test -e apps/backend/src/services/YourService.ts` 返回非零。 |

**Freeze rule：** route path、HTTP method、input validator 和 `AppType` 的组合视为一条 typed contract。重构不得把兼容 route 当成新的业务 owner；若要退休 legacy route，必须先有兼容窗口、调用方证据和 Product TDD 更新。

## 2. Validation 与 boundary normalization

| 状态 | 冻结项 | 当前 owner / 窄证据 |
| --- | --- | --- |
| Fact | Controller 输入边界以 `zValidator` 读取 `param/query/json/header/form`，业务代码应读取 `c.req.valid(...)`；生产 controllers 当前有 188 个 `zValidator(` 调用，未发现直接 `c.req.json()`。 | `apps/backend/src/controllers/partner-request.controller.ts:70-132,142-155`；`apps/backend/src/controllers/pr-controller.shared.ts:92-107`；静态命令与结果见 `readonly-baseline.md` 的 BE-BL-003。 |
| Fact | PR schema 强制：时间端点为带 offset 的 instant（自然语言输入另允许 local date）、location/route 互斥、route point 至少有一个坐标且 name 非空；PR 状态集合为 `DRAFT/OPEN/READY/ACTIVE/CLOSED/EXPIRED`，manual status 不含 `DRAFT/EXPIRED`。 | `apps/backend/src/entities/partner-request.ts:24-61,64-123`；`docs/20-product-tdd/pr-lifecycle-contracts.md:26-31`。 |
| Fact | PR create use-case 在写入前 canonicalize time/place、校验 start 未过期、partner bounds、Anchor Event create policy 与 POI availability；写入后初始化 slots、materialize event defaults、记录 operation log，并按 publication mode 返回 DRAFT 或 OPEN。 | `apps/backend/src/domains/pr-core/use-cases/create-pr-structured.ts:93-183`。 |
| Fact | 手工 partner bounds 的 `minPartners` 至少为 1、present `maxPartners` 至少为 2 且不能低于 min/current；自动路径可把无效或缺失 min 默认成 2。 | `apps/backend/src/domains/pr-core/services/partner-bounds.service.ts:4-19,21-81`；`docs/20-product-tdd/pr-lifecycle-contracts.md:5-12`。 |
| Fact | `FULL` 不是持久化 status；frontend 可从 OPEN + capacity 推导。当前 `deriveStatusFromPartnerCount` 明确返回 OPEN，测试锁定“不从 count 派生 durable formed/full”。 | `apps/backend/src/domains/pr-core/services/status-rules.ts:16-95`；`apps/backend/src/domains/pr-core/services/status-rules.test.ts:22-30`；`docs/20-product-tdd/pr-lifecycle-contracts.md:5-12`。 |
| Inference | Provider callback 的 raw text/form 解析在 use-case/adapter 内完成，故不能把所有 callback payload 强制套用普通 JSON `zValidator`；但参数、签名头和 provider instance identity 仍需在协议边界保持可验证。 | `apps/backend/src/controllers/payment-provider.controller.ts:23-48`；`apps/backend/src/controllers/ride-hailing-provider.controller.ts:27-48`。 |
| Open question | WeChat OAuth 与 provider callback 中保留的 `{ error }` 兼容响应，哪些属于明确的 compatibility exception，哪些应迁移到 Problem Details？当前静态扫描有 25 行 controller `c.json({ error: ... })`。 | 代表性行：`apps/backend/src/controllers/wechat.controller.ts:1160-1197,1327-1380,1496-1574`；完整计数见 BE-BL-003。 |

**Freeze rule：** boundary schema 是输入真相；controller 不重复实现时间、状态、capacity、POI 或身份规则。raw provider payload 可以由 adapter 解析，但不得让 provider payload 变成产品状态的第二份 schema。

## 3. Problem Details / error semantics

| 状态 | 冻结项 | 当前 owner / 窄证据 |
| --- | --- | --- |
| Fact | RFC 9457 transport shape 是 `{ type,title,status,detail,code? }`，`ProblemDetailsError` 保留 status/type/code 与中英文本；全局 `app.onError` 输出 `application/problem+json` 与 `Content-Language`，并适配 Zod/HTTPException/未知错误。 | `apps/backend/src/lib/problem-details.ts:14-20,22-43,136-189`；`apps/backend/src/index.ts:142-198`。 |
| Fact | 需要 authenticated role 的命令用 `401 + code=AUTHENTICATED_REQUIRED`；PR creator identity helper 提供稳定 type/code 和本地化 detail。 | `apps/backend/src/domains/pr-core/services/creator-identity.service.ts:8-36,57-80`；`docs/20-product-tdd/cross-unit-contracts.md:80-91`。 |
| Fact | 生产代码预期 API failure 使用 Problem Details helper 或 typed domain helper；全局 adapter 是唯一允许兼容第三方 Hono `HTTPException` 的位置。 | `apps/backend/AGENTS.md:73-79`；`docs/20-product-tdd/cross-unit-contracts.md:80-91`。 |
| Inference | 25 条直接 `{ error }` 响应构成潜在 transport drift；其中 OAuth/WeChat 与 upload/compatibility 可能是刻意的旧 contract，不能在没有调用方证明时一概判为 bug。 | `apps/backend/src/controllers/wechat.controller.ts:1150-1197,1283-1380,1382-1668`；BE-BL-003。 |
| Open question | 迁移 direct-error 响应前，需要为每个 route 标注调用方、是否由 frontend RPC 解析以及是否允许保留兼容 JSON；不可通过静态计数回答。 | 需要 route consumer 证据；当前不执行应用变更。 |

**Freeze rule：** 新增或重构的预期 API 失败必须保留 status + stable `code/type` + backend-owned detail；Frontend 只负责呈现与 auth/retry 编排，不复制 guard rule。

## 4. Auth/session 与 WeChat OAuth

| 状态 | 冻结项 | 当前 owner / 窄证据 |
| --- | --- | --- |
| Fact | JWT roles 为 `anonymous/authenticated/service/analytics`，claims 同时保留 primary `role` 与完整 `roles`；`resolveRequestAuth` 无 token/坏 token 降为 anonymous，authenticated role 需要 user id，可在临近过期时轮换。 | `apps/backend/src/auth/types.ts:1-32`；`apps/backend/src/auth/jwt.ts:23-45,77-139`；`apps/backend/src/auth/middleware.ts:72-118`。 |
| Fact | Auth transport 使用 `Authorization: Bearer`，新 token 可通过 `x-access-token` response header 返回；auth/session endpoints 才返回 accessToken body，普通 domain command 不应携带 session payload。 | `apps/backend/src/auth/middleware.ts:14-29,110-132`；`apps/backend/src/controllers/auth.controller.ts:33-123`；`docs/20-product-tdd/cross-unit-contracts.md:54-68`。 |
| Fact | WeChat OAuth navigation callback 不把 bearer token/code/state 放进 `returnTo`；backend 写 path-scoped signed handoff cookie，再以 nonce 附在 return URL；handoff endpoint 单次读取并清 cookie。 | `apps/backend/src/controllers/wechat.controller.ts:1575-1628,1680-1706`；`docs/30-unit-tdd/wechat-oauth-handoff.md:11-30,41-60`。 |
| Fact | `AUTHENTICATED_REQUIRED` 是产品强身份升级边界；当前 public user flow 通过 WeChat OAuth 或 anonymous upgrade 获得 authenticated。 | `apps/backend/src/controllers/pr-controller.shared.ts:122-157,190-220`；`docs/20-product-tdd/cross-unit-contracts.md:58-68,82-91`。 |
| Open question | OAuth route 中部分错误仍是 JSON `{error}`，且 controller 直接读 UserRepository/WeChat services；需要单独决定 auth/compatibility owner 是否拆出 domain use-case。 | `apps/backend/src/controllers/wechat.controller.ts:1120-1146,1496-1574,1708-1833`；当前仅冻结，不迁移。 |

**Freeze rule：** 不得将 access token、WeChat OAuth code/state 或 handoff secret 放入 URL；不得把 anonymous continuity 当成 authenticated authorization；服务/analytics role 不得被普通用户 command 误用。

## 5. Database schema / migration ledger

| 状态 | 冻结项 | 当前 owner / 窄证据 |
| --- | --- | --- |
| Fact | Drizzle entities 是 schema source；`partner_requests` 持久化 route、place、status、bounds、meeting-point、join-gate、orders、feedback pointer 与 `createdBy`。 | `apps/backend/src/entities/partner-request.ts:162-212,214-243`；`apps/backend/src/entities/AGENTS.md:1-24`。 |
| Fact | `apps/backend/drizzle/` 与 `apps/backend/data-migrations/` 共用 global numeric prefix；applied history 进入 `app_migrations`；staging/production forward-only；data migration 的 environment metadata 只允许显式 allowlist。 | `docs/30-unit-tdd/backend-migration-ledger.md:15-47`；`apps/backend/data-migrations/AGENTS.md:3-17`；`apps/backend/data-migrations/README.md:3-40`。 |
| Fact | 当前文件计数为 72 个 Drizzle SQL、12 个 data migration SQL（共 84），prefix 范围 0000–0085，缺口 0063/0066，无重复；这是静态目录事实，不代表数据库已应用。 | BE-BL-009；未执行 database command。 |
| Fact | `jobs` schema 仍保留标注为 legacy rollout 的 `earlyToleranceMs/lateToleranceMs`，同时使用 `resolutionMs/earlyToleranceUnits/lateToleranceUnits`。 | `apps/backend/src/entities/job.ts:25-66`。 |
| Open question | legacy job tolerance columns 的 drop migration、telemetry staging 清理与 migration gap 0063/0066 的历史原因不在本次只读范围内，需在专门 ledger slice 复核。 | `apps/backend/src/entities/job.ts:36-41`；`docs/20-product-tdd/analytics-and-telemetry-contracts.md:238-253`；BE-BL-009。 |

**Freeze rule：** 不编辑已应用 SQL、不引入 reset/环境分支到 schema migration；新 schema/data migration 先分配 shared prefix，再按 ledger 规则前进。所有实体边界变更必须同时检查 AppType 与 scenario owner。

## 6. Scale-to-zero / job / delayed side effects

| 状态 | 冻结项 | 当前 owner / 窄证据 |
| --- | --- | --- |
| Fact | JobRunner 把 job 写入 DB，持有 dedupe、lease、attempt/retry、bucket timing 和 due claim；`runDueJobs` 支持 `request-tail/external-trigger/manual`。 | `apps/backend/src/infra/jobs/job-runner.ts:26-79,177-235,237-313`；`docs/20-product-tdd/system-state-and-authority.md:49-55`。 |
| Fact | serverless 驱动有两个入口：请求尾部按节流 kick（排除 internal/health）与受 token 保护的 `POST /internal/maintenance/tick`；外部 FC trigger 调用这个 endpoint。 | `apps/backend/src/index.ts:123-140,257-297`；`apps/backend/src/controllers/internal-maintenance.controller.ts:10-37`；`apps/backend/fc-job-runner-trigger/README.md:1-47`。 |
| Fact | index import 时注册 9 组 job handlers，并可 bootstrap official-account follow sync；没有 `setInterval`，`setTimeout` 仅用于超时/一次性 OAuth 辅助，不得替代 DB job。 | `apps/backend/src/index.ts:76-93`；`apps/backend/src/infra/marketing/official-account-follow-sync.job.ts:108-123`；BE-BL-006。 |
| Fact | notification modules 只提供每种 notification 的 timing policy；JobRunner 决定 due/missed/lease 语义。 | `docs/20-product-tdd/unit-topology.md:62-67`；`docs/20-product-tdd/notification-contracts.md:18-28,71-85`。 |
| Inference | module-level job registration/bootstrap 是可观察的 import-time side effect；任何重构都必须保持 idempotent registration 与 scenario-disable flags，否则 scale-to-zero 运行语义会改变。 | `apps/backend/src/index.ts:76-93`；`apps/backend/src/infra/marketing/official-account-follow-sync.job.ts:108-123`。 |
| Open question | 是否需要把 request-tail 与 external tick 的 budget/claim 参数提升为一个持久化 runtime contract，当前 Product TDD 只冻结“DB-backed + externally triggerable”。 | `apps/backend/src/index.ts:274-297`；`apps/backend/src/infra/maintenance/maintenance-runner.ts:26-69`。 |

**Freeze rule：** 禁止 `setInterval`/长驻内存 scheduler；durable async work 使用 `scheduleOnce` + DB job + tick/request-tail。API 响应不得假设 downstream notification/outbox 已完成，除非 endpoint 明确承诺同步完成。

## 7. Provider boundary 与副作用

| 状态 | 冻结项 | 当前 owner / 窄证据 |
| --- | --- | --- |
| Fact | Payment provider 系统拥有 gateway-facing lifecycle、provider transaction id/snapshot/failure；Backend Payment 可以发起、查询、验签 callback，但不把 provider transaction status mirror 成 product truth。 | `docs/20-product-tdd/ecommerce-contracts.md:122-155`；`apps/backend/src/controllers/payment-provider.controller.ts:23-48`。 |
| Fact | BillLine 拥有本地 provider execution slot 与 settlement confirmation；Payment 负责 provider orchestration，Bill 负责 obligation/settlement，Trade 负责 Order/PR attachment，Fulfillment 负责 service execution。 | `docs/20-product-tdd/ecommerce-contracts.md:52-155`。 |
| Fact | CaoCao adapter 要提交用户选中的多候选，不在 create command 内选择 cheapest fallback；provider create 失败时 local order CANCELLED，不自动换候选/provider；final settlement 只能由 dedicated final-settlement query 写入。 | `docs/20-product-tdd/ecommerce-provider-contracts.md:5-30`；`docs/20-product-tdd/ecommerce-contracts.md:402-458`。 |
| Fact | CaoCao callback use-case 校验 provider instance、routing token、callback provider identity，再调用 provider sync；legacy callback 仅是兼容入口，最终仍走同一 apply path。 | `apps/backend/src/domains/ride-hailing/use-cases/handle-caocao-order-status-callback.ts:34-113,115-189`。 |
| Fact | PR join 会同步更新 partner/reliability/status/current creator，写 operation log，并 schedule new-partner/reminder/activity jobs；operation log 自身是 fire-and-forget，失败只写 stderr 不传播。 | `apps/backend/src/domains/pr-core/use-cases/join-pr.ts:100-174`；`apps/backend/src/infra/operation-log/operation-log.service.ts:1-7,23-45`。 |
| Inference | 业务提交、operation log、notification job、provider sync 的成功边界不同；重构时必须保留“主状态先由 domain 持久化、异步副作用可延后/重试”的时序，不能把 fire-and-forget 假装成事务一部分。 | `docs/20-product-tdd/cross-unit-contracts.md:133-138`；`docs/20-product-tdd/notification-contracts.md:55-85`。 |
| Open question | 何时退休 `/api/v1/service_provider` legacy CaoCao callback、何时 drop provider legacy columns，需调用方/部署证据；本阶段不改变任何 provider route。 | `apps/backend/src/index.ts:220-223`；`apps/backend/src/entities/job.ts:36-41`。 |

**Freeze rule：** 外部 provider 是 provider-facing truth owner；Backend 只保留本地 execution/obligation projections。Provider callback、settlement、cancellation-preview 和 destructive command 的边界必须保持分离。

## 8. 保持项与不把建议冒充事实

- `Fact` 的 owner 是当前代码/当前 durable doc，不是目标目录结构。
- `Inference` 只用于风险排序或待证伪解释；它不能作为迁移授权。
- `Open question` 进入后续 alignment/execute 的入口，不能在本阶段通过“顺手清理”解决。
- 本 workstream 不修改 `apps/`、`docs/`、`tests/`、`scripts/`、配置、依赖、migration 或其他 task 目录。
