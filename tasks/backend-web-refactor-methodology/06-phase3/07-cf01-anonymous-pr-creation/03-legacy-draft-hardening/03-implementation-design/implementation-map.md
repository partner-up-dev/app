# 07C implementation map：调用点、参数与断言

## Central owner / exact API

| 项目 | 设计 |
| --- | --- |
| owner | `apps/backend/src/domains/pr/services/draft-access-policy.service.ts` |
| 输入 row | `Pick<PartnerRequest, "status" | "createdBy">`；调用者已经完成 ID lookup，policy 不读 DB |
| actor | `Pick<RequestAuth, "userId" | "roles">`；不要只传 `userId`，以区分 anonymous session 与 authenticated owner |
| operation | `"read" | "content-mutation" | "status-mutation" | "publish" | "participant-flow"` |
| 返回/异常 | `void`；非 DRAFT或 authenticated owner（仅非 participant-flow）通过；拒绝统一 Problem Details 404（建议 `PR_DRAFT_NOT_ACCESSIBLE`），不泄露 row 状态/creator |
| privileged | 不在普通 API 中加入可伪造 `authority` 参数；`/api/admin/*` 继续由 `adminAuthMiddleware` + admin use-case 作为显式 service authority |

建议同时导出 `PRDraftActor`、`PRDraftAccessOperation`，从 `domains/pr/index.ts` 暴露给 domain adapters；不从 controller 复制逻辑。

## 调用点映射

| 调用点（当前文件/证据） | 必需 viewer/role 参数 | policy operation | DRAFT 例外与异常 | OPEN+ 要求 |
| --- | --- | --- | --- | --- |
| `read-models/get-pr-detail.ts:getPRDetailView`（`:116-166`）及 `GET /api/pr/:id`（controller `:448-453`） | `{ userId: auth.userId, roles: auth.roles, openId }`；openId 只用于现有 user resolve，不代替 roles | `read` | authenticated owner 200；anonymous/creatorless/other/service/analytics 404，且在 participant/feedback projection 前终止 | 原 `toPublicPR`、meeting-point、participant projection 不变 |
| `queries/get-pr.ts:getPR`（`:7-17`）、share adapters、`llm.controller.ts:27` | 固定 `{ userId:null, roles:["anonymous"] }`；public adapter 不接受请求 viewer | `read` | 所有 DRAFT 404；不为 share/LLM 添加匿名 draft capability | 继续 public `toPublicPR` |
| `services/pr-read.service.ts:readPartnerRequestById` | 低层 temporal/internal caller 可无 policy；HTTP canonical caller 必须马上调用 policy | 由 caller 指定 | 不把 raw repository 改成 public-only，避免破坏 admin/temporal/analytics | visible query 原 predicate 保留 |
| `services/join-gates.service.ts:getPRJoinGateProjection`（`:87-117`）及 GET controller `:267-275` | `viewerUserId` + `actor: {userId, roles}`；anonymous userId 不能当 authenticated | `participant-flow` | DRAFT 404，不读 gate acceptance；creatorless 与 non-owner 同语义 | OPEN+ projection/resolution unchanged |
| `resolvePRJoinGate`（`:169-212`）及 POST controller `:277-295` | `participant.user.id` + authenticated roles（由 `requireAuthenticatedCreatorIdentity` 得到） | `participant-flow` | DRAFT 404、不得 upsert acceptance；gate-not-found/版本 400/404 仅适用于 OPEN+ | 现有 gate payload/acceptance 语义 |
| `queries/get-pr-partner-profile.ts:getPRPartnerProfile`（`:35-65`）及 GET controller `:430-446` | `{viewerUserId, roles}`；先 policy 再 active participant query | `read` | DRAFT 仅 owner 可到达；非 owner/creatorless 404；若 owner 无 active participant，保留 profile 404 | active participant/profile projection unchanged |
| orders controller `:201-220` / `getPROr404` | `auth.userId + auth.roles`；先 policy 再读取 `pr.orders` | `read` | DRAFT owner 可读其 private orders；其他 actor 404；不要先 raw existence check | order status/offer filters unchanged |
| `services/pr-message-access.service.ts:16-35`、list/create/read-marker message commands | `{userId, roles}`；先 policy，再 active participant lookup | `participant-flow` | 所有 DRAFT 404（即使历史 row 有 participant）；OPEN+ 非 participant 仍现有 403 | current active participant rule unchanged |
| `services/creator-mutation-auth.service.ts:16-48`、PATCH content/status | 完整 `RequestAuth`（已有 `auth.roles`）；DRAFT 分支不得仅 cast `auth.userId` | `content-mutation` 或 `status-mutation` | owner DRAFT content 200；owner DRAFT status 保持 controller 400 “Use publish endpoint”；other/creatorless 404；anonymous mutation 401 由 route boundary 先处理 | non-DRAFT 现有 creator ownership 403/claimed-creator semantics unchanged |
| `commands/publish-pr.ts:54-100`、POST publish | 由 `CreatorIdentityInput` 解析出的 authenticated user + roles；必须在 `resolvePublishedCreator` claim 前完成 | `publish` | owner DRAFT 进入现有 publish validation；creatorless 不得 claim，普通 authenticated 404；anonymous route 仍可 401 `AUTHENTICATED_REQUIRED` | non-DRAFT 400 “Only DRAFT...” unchanged |
| join/waitlist/exit/confirm/check-in controllers `:349-429` 与对应 commands | authenticated participant identity/roles | `participant-flow` | DRAFT 404 在 status/child query 前终止；不得把 owner 视为 participant | 原 OPEN/READY/ACTIVE status gates unchanged |
| `/api/admin/*` (`adminAuthMiddleware`, `admin-pr-management.controller.ts`) | service auth 已在 admin boundary 验证；不传普通 USER actor | 专用 admin authority，非此 API | DRAFT workspace/detail/content/status/delete 例外保留；普通 user token 401 | 既有 admin assertions unchanged |

## 精确测试文件与断言

### `apps/backend/tests/pr/pr-draft.scenario.test.ts`

- 将 `authenticated_user_publish_claims_creatorless_draft` 改为 authenticated publisher 请求 404；查询 row 断言 `createdBy=null,status='DRAFT'`，没有 active creator slot。
- 将 `authenticated_user_can_edit_creatorless_draft_content` 改为 404；断言 title/type/createdBy 未变。
- 新增 owner-bound fixture：owner GET detail 200，owner PATCH content 200，owner publish 仍按既有 publish preconditions 成功或返回其业务错误但不返回 policy 403/404。
- 新增 other-user fixture：GET detail、PATCH content、POST publish 全 404；row owner/status/content 不变。
- 新增 creatorless GET detail、join-gates、orders、partner profile、messages 读写 404；若 route 先要求 authentication，匿名 mutation 断言 401 `AUTHENTICATED_REQUIRED`，authenticated anonymous/other 断言 404。

### `apps/backend/src/domains/pr/services/draft-access-policy.service.test.ts`（建议新建）

使用最小 `{status,createdBy}` rows 和 `roles` actor，不依赖 DB：

- OPEN/READY/ACTIVE/CLOSED/EXPIRED 对每个 operation 都不抛。
- owner (`roles:["authenticated"]`, matching `userId`) 的 read/content/status/publish 不抛。
- owner 的 participant-flow 抛 404；anonymous matching userId、authenticated other、creatorless authenticated、service、analytics 均抛 404。
- 断言 Problem Details status=404、detail 不含 `createdBy` 或内部状态；若固定 code，则断言 `PR_DRAFT_NOT_ACCESSIBLE`。

### `apps/backend/tests/pr/pr-join-gates.scenario.test.ts`

创建 DRAFT + join notice config；authenticated non-owner GET projection 与 POST resolve 均 404；`prJoinNoticeAcceptances` 行数保持 0。保留当前 OPEN+ acceptance/join/exit/rejoin 断言。

### `apps/backend/tests/pr/pr-admin.scenario.test.ts`

新增 service admin 对 DRAFT list/detail/content/status/delete 的保持通过断言；普通 USER token 调同一路径断言 401。不要把 admin 测试改成调用普通 `/api/pr/:id` policy。

### `apps/backend/tests/pr/pr-create.scenario.test.ts` 或 `pr-create-failure.scenario.test.ts`

冲突 characterization：同 actor 先有重叠 OPEN/READY/ACTIVE，再创建；断言 HTTP 409、code `JOIN_TIME_WINDOW_CONFLICT`、新 row `DRAFT + createdBy=actor`、partners=0。带 questionnaire template 时断言 instance 新建且 root 删除不级联（仅 probe，不实现 cleanup）。past-start 既有 no-row 断言保留。

### `apps/backend/tests/pr/pr-route.scenario.test.ts` / share-LLM fixture（条件）

若已有稳定 route fixture，DRAFT detail 对 non-owner/anonymous 404，OPEN+ canonical share/detail 既有 assertions 不变；share/LLM DRAFT 404、OPEN+ success。无 fixture 时不扩展昂贵跨 adapter scenario。

## 不安全设计分叉

- 把 `readPartnerRequestById` 全局改为仅 public status 会破坏 admin、temporal、notification、analytics 的 raw-row 需求；必须在 canonical HTTP projection 收口。
- 仅修改 `publishPR` 仍留下 detail/join-gate/orders/profile/message/LLM/share surfaces；不满足 07C。
- 以 `auth.userId` 代替 `auth.roles` 会让 anonymous session user 伪装 owner；policy 输入必须保留 roles。
- 把所有 DRAFT 统一拒绝会破坏既有 owner DRAFT edit/publish flow；participant-flow 才是全拒绝，owner read/content/publish 是明确例外。
- 在 controller 捕获 publish error 后 `deleteById` 会遗留 questionnaire instance、异步 operation log，并可能误删已被并发编辑的 row；cleanup 继续 fork。
