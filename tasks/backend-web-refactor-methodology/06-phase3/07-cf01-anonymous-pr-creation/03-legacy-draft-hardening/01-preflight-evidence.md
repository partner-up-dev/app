# 07C 只读预检证据：legacy DRAFT 读写面

预检时间：2026-07-17。本文只记录当前工作树的证据与建议，不宣称已实现，也不修改历史数据。

## 结论

- `DRAFT` 的公开状态谓词已经把 DRAFT 排除在 discovery 列表之外（`pr-read.service.ts:47-59`），但按 ID 的 canonical read 没有同一授权边界：`readPartnerRequestById` 返回任何状态（`pr-read.service.ts:61-68`），detail read 直接把它投影（`read-models/get-pr-detail.ts:116-166`）。
- creatorless DRAFT 仍可被任意 authenticated actor 认领发布：`publish-pr.ts:72-100` 在 `createdBy` 为空时调用 `resolvePublishedCreator`，随后 `setCreatedBy` + `OPEN`（`publish-pr.ts:113-122`）。
- creatorless/他人 DRAFT 的内容仍可被任意 authenticated actor 修改：`authorizeCreatorMutation` 在 `mode === "content" && status === "DRAFT"` 时直接返回 actor，不比较 `createdBy`（`creator-mutation-auth.service.ts:16-31`）。
- WeCom 当前仍以空 identity 调用 NL create（`wecom.controller.ts:270-281`）；create 命令 `resolveDraftCreator` 对无 authenticated/openId 返回 `null`（`creator-identity.service.ts:39-52`），默认 finalize 会先落 DRAFT（`create-pr-structured.ts:114-120`、`create-pr.shared.ts:18-34`）。这是 07B 的入口守卫依赖，不应由 07C 重新引入匿名协议。

## 路径盘点

### Canonical read / public projection

| 路径 | 当前证据 | DRAFT 风险 | 建议归属 |
| --- | --- | --- | --- |
| `GET /api/pr/:id` | `partner-request.controller.ts:448-453` -> `getPRDetailView` -> `readPartnerRequestById`; detail 将 `createdBy` 直接投影于 `:164-166` | 未登录或他人可读完整 creator-private DRAFT | canonical draft-read guard；OPEN+ 不变 |
| `GET /api/pr/:id/join-gates` | controller `:267-275` -> `getPRJoinGateProjection`; service 只按 ID 读取 `:87-117` | 可读 DRAFT gate 内容；无 owner/status 检查 | 同一 draft-read guard |
| `POST /api/pr/:id/join-gates/:gateKey/resolve` | controller `:277-295` -> `resolvePRJoinGate`; service `:169-212` 仅检查 gate/payload | 任意 authenticated actor 可写 DRAFT gate acceptance | draft mutation guard；DRAFT 非产品流程应拒绝 |
| `GET /api/pr/:id/orders` | controller `:201-220` 先经 raw `getPROr404` (`:109-115`)，再返回 `pr.orders` | legacy DRAFT 的订单 ID 可公开枚举 | 先做 status/owner read guard；OPEN+ 返回保持一致 |
| `GET /api/pr/:id/partners/:partnerId/profile` | controller `:430-446` -> `getPRPartnerProfile`; query `:35-65` 只要求 active participant | 若历史 DRAFT 有 slot，可泄露参与者资料给非 owner | 同一 draft-read guard |
| `GET/POST /api/pr/:id/messages*` | controller `:184-199`, `:223-247`; `requirePRMessageParticipantAccess` 只检查 active participant (`pr-message-access.service.ts:16-35`) | 非 owner 的历史 DRAFT participant 可读/写消息 | 将 draft owner/status policy 接入 message access；若无 DRAFT 产品流，统一拒绝 |
| `POST /api/llm/xiaohongshu-caption` | 无 auth middleware；`llm.controller.ts:19-28` 调 `getPR`，`get-pr.ts:7-17` 无状态/owner guard | 可通过 LLM 间接读取 DRAFT 字段 | `getPR` 的 public projection 统一拒绝 DRAFT |
| `/api/share/*` poster/thumbnail/description/cache | route 无 auth (`share.controller.ts:50-127`)，`ShareService.ts:122-179` 调 `getPR`；cache 读写 `:186-232` 直读/写 repo | 可生成/缓存 creator-private DRAFT 分享内容 | share 只允许 public OPEN+；cache 也先检查状态 |

`GET /mine/created` (`partner-request.controller.ts:174-177`) 走 creator-index（`get-my-created-prs.ts:9-14`）。它是 owner-scoped，但当前 `requireSessionUserId` 可接受 anonymous session；应在 07C 测试决定是否仅 authenticated owner 可列出历史 owner-bound DRAFT，不能让它成为 creatorless claim 入口。

已核对的跨域安全门：discovery 的 visible reads 在 `pr-read.service.ts:86-113` 统一过滤 DRAFT；study-sprint 入口在 `study-sprint/services/eligibility.ts:17-51` 明确只允许 `ACTIVE`；order attachment eligibility 在 `queries/order-attachment-eligibility.ts:23-29` 只允许 READY/ACTIVE。它们不构成新的 DRAFT public surface，但应保留对应回归断言。

### Canonical mutation / claim

| 路径 | 当前证据 | 当前行为 | 最小修正方向 |
| --- | --- | --- | --- |
| `POST /api/pr/:id/publish` | controller `:162-173`; `publish-pr.ts:54-100` | `createdBy=null` 时把当前 authenticated user 设为 creator 并发布 | creatorless DRAFT 对普通 USER 一律 403/404；owner-bound 仅 owner；ADMIN/SYSTEM 必须走显式 authority surface，不能复用该 claim 分支 |
| `PATCH /api/pr/:id/content` | controller `:331-347`; auth helper `creator-mutation-auth.service.ts:26-31` | 任意 authenticated actor 可改 DRAFT | helper 统一要求 `request.createdBy === auth.userId`；creatorless 不可改 |
| `PATCH /api/pr/:id/status` | controller `:297-329`; helper `:33-47` | DRAFT 先要求 creator，owner 随后收到“Use publish endpoint”；creatorless 403 | 保留 owner guard；集中 policy 使 DRAFT 不会因未来 status 分支绕过 |
| `POST /api/pr/:id/join-gates/:gateKey/resolve` | 上表 | 任意 authenticated actor 可写 gate acceptance | 接入 draft mutation guard或明确 DRAFT 统一 404 |
| join/waitlist/exit/confirm/check-in | controller `:349-429`；各 command 的状态门（如 `join-pr.ts:62-64` 仅 OPEN） | DRAFT 通常被业务状态拒绝，但 route 的 raw `getPROr404` 仍可探测存在 | 统一在 command 入口调用 status/owner policy；保留 OPEN+ 行为 |
| PR messages/read-marker | 上表 | participant-only，不是 creator-only | DRAFT 统一 owner/status guard，避免历史 slot 扩大权限 |
| current-creator reconciliation | `current-creator.service.ts:16-39` 被 `join-pr.ts:72,123`、`exit-pr.ts:71`、release effects 调用 | creatorless row 有 active participant 时可自动把 `createdBy` 设为最早 participant | 明确只对 OPEN+ 允许“当前 creator”交接；DRAFT 不得由普通 participant/自动路径补写 owner |

### Privileged exceptions

`/api/admin/*` 由 `adminAuthMiddleware`（service role）保护（`admin-pr-management.controller.ts:91-122`），workspace/list/detail 能看到 DRAFT，content/status/delete 能改 DRAFT（use-cases `commands.ts:85-160`）。这是已有显式 service authority，属于保留的运维例外；需在 07C 测试矩阵单独验证，不应把 service role 放宽到普通 `/api/pr/:id` 路由。`expand-full-capacity-pr.ts:85-119` 是 SYSTEM 创建 OPEN（`publicationMode:"create-open"`），不是 DRAFT 入口。

## 最小集中式 enforcement 设计

新增一个 PR domain 内部 policy（可命名 `assertPRDraftAccess` / `readPRForActor`），输入当前 row、viewer/actor user id、是否显式 privileged authority，规则如下：

1. 非 `DRAFT` 直接放行，确保 OPEN/READY/ACTIVE/CLOSED/EXPIRED 的当前读写语义不变。
2. `DRAFT && createdBy !== null` 仅当 actor 已认证且 `actor.userId === createdBy` 放行；缺失/不匹配统一 404（避免泄露 creator-private 状态；内部测试可检查 403 但 transport 推荐 404）。
3. `DRAFT && createdBy === null` 对普通 USER/anonymous 一律拒绝，绝不把当前 actor 写入 `createdBy`；只有已有显式 ADMIN/SYSTEM command authority 才能读取/处置，并记录 authority，不复用 publish claim。
4. 将 policy 接到 detail/getPR、join-gate projection/resolve、orders、partner profile、message access，以及 `authorizeCreatorMutation`；`publishPR` 在 owner check 前先拒绝 creatorless 普通 identity。低层 repository/readPartnerRequestById 继续允许内部作业读取，不能被当成 HTTP projection。
5. share/LLM 是无 auth 的 public adapters，继续只走 public `getPR`，因此 DRAFT 自然拒绝；不要为它们添加匿名能力。admin service 继续走专用 admin surface。

### 拓扑 / 时序

```text
HTTP actor
  -> controller/auth (普通 USER | anonymous | service)
  -> PR draft-access policy (status + createdBy + explicit authority)
      -> canonical query/command
          -> repository row
```

普通用户读取 DRAFT 时，policy 在 projection 前终止；普通用户 publish 时，policy 在任何 `setCreatedBy` 前终止；owner DRAFT 只有 owner 的 detail/content/publish 继续通过。OPEN+ 走同一 controller/command，但 policy 是 no-op，因此既有 discovery/join/share 行为保持不变。ADMIN/SYSTEM 不穿过普通 USER claim 分支，而由现有 admin/内部 authority 明确调用。

## 失败 authenticated create 的残留

`createPRFromStructured` 在 `prRepo.create` (`:120-140`) 后先初始化 slots/materialization (`:142-149`)，再由 `finalizeCreatedPR` 调 publish (`create-pr.shared.ts:36`)。publish 的用户冲突等校验在 `publish-pr.ts:102-111`，失败时没有 transaction/rollback；因此可能留下“刚创建、owner-bound、仍 DRAFT”的 cleanup residue。当前 `pr-draft.scenario.test.ts:122-155` 只证明历史 creatorless fixture 的失败，不证明正常 authenticated create 的真实残留。

最便宜 characterization：先建立 owner 已有同时间 PR，再 POST authenticated `/api/pr/new/form`；断言返回 Problem Details（例如冲突码）、新 row `createdBy=actor,status=DRAFT`、child slots/materialization 数量。只有确认 child effects 可安全回滚/删除后，才在同一 bounded command 中删除“本次 command 创建且仍 DRAFT”的 row；不要通过 07C migration 改写历史 creatorless rows。

## 候选 focused tests

- `apps/backend/tests/pr/pr-draft.scenario.test.ts`：反转现有 creatorless publish-claim (`:86-120`) 与 arbitrary content edit (`:157-195`) 为拒绝并断言 row 未变；新增 owner read/edit/publish、other-user read/edit/publish、creatorless detail/gate/orders/profile/message 读写矩阵。
- `apps/backend/src/domains/pr/services/pr-read.service.test.ts`：保留 DRAFT 非 public status 谓词测试 (`:31-68`)，补 policy 的 owner/creatorless/privileged 分支单测。
- `apps/backend/tests/pr/pr-join-gates.scenario.test.ts`：增加 DRAFT gate projection/resolve 拒绝，OPEN+ projection 不变。
- `apps/backend/tests/pr/pr-admin.scenario.test.ts`：service/admin 对 DRAFT 的现有读取/编辑/删除例外继续通过，并证明普通 user token 不能访问 `/api/admin/*`。
- `apps/backend/tests/pr/pr-create.scenario.test.ts` 或新增 `pr-create-failure.scenario.test.ts`：真实 authenticated create→publish 失败的返回错误、row owner/status、child effects；不要只测手工插入 creatorless row。
- 若 share/LLM 有稳定 HTTP fixtures，分别请求 `/api/share/*` 与 `/api/llm/xiaohongshu-caption` 对 DRAFT 断言 404，OPEN+ 维持既有成功契约。

## 风险与兼容性

- 不能把 `readPartnerRequestById` 全局改为只读 public status：内部 temporal/notification/admin/analytics 需要 raw rows；应在 canonical HTTP/query projection 层收口。
- 不能只修 `publishPR`：detail、join-gates、orders、share/LLM、partner profile 和 message access 仍会泄露 DRAFT。
- 不能把所有 DRAFT 都 404：owner-bound DRAFT 的 owner 编辑/发布是既有 product flow；admin service 是显式运维例外。
- 不要把 `currentCreator` 的 OPEN+ participant handoff 规则改成全局 owner immutable；只排除 DRAFT，避免破坏现有 creatorless OPEN compatibility 行为。
- 统一 404 会改变当前部分 400/403 错误码；这属于隐私收口，需在 focused tests 固定；OPEN+ 的状态码/响应保持原样。
- 删除失败-create row 可能级联 partners/messages/gates/notification/study-sprint 等子表（实体 FK 多为 `onDelete:"cascade"`）；没有 child inventory 与事务证据前不得自动删除。
