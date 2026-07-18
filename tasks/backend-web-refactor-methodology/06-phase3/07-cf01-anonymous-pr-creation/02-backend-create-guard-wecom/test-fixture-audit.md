# 07B test-fixture audit（只读，2026-07-17）

本文件是实现前的 fixture/test seam 审计，不代表 guard、WeCom worker 或任何测试已经实现或运行。审计只读了现有
Backend PR/admin/system 测试、WeCom controller 测试及其 builders/probes。

## 现有可复用测试面

| 文件 | 已有能力 | 对 07B 的用途/缺口 |
| --- | --- | --- |
| `apps/backend/tests/pr/pr-create.scenario.test.ts` | `requestJson`、`expectJsonResponse`、`getTestDb`；已有 authenticated user + 过去时间的 400/no-root 断言 | 最小追加 W1/W2（匿名 HTTP 401、authenticated HTTP 201/OPEN）；不能单独证明 canonical command 在 repository write 之前拒绝 unmapped WeCom |
| `apps/backend/tests/pr/pr-admin.scenario.test.ts` | `givenAdminUser`（`service`+`analytics`）、`givenPRTypeConfig({ authoringCreationPolicy: "ADMIN_ONLY" })`、root/partner 查询 | 最小追加 G7：创建后查询 `partner_requests.createdBy` 等于 admin actor，状态仍 `OPEN`；现有测试尚未断言 owner |
| `apps/backend/tests/pr/_kit/builders/users.ts` | `givenUser` → ACTIVE + `role: ["authenticated"]` + user token；`givenAnonymousUser` → ACTIVE + `role: ["anonymous"]`；`givenAdminUser` → ACTIVE + `role: ["service", "analytics"]` | 可直接复用 W1/W2/G7。没有 disabled user 或 service-only helper；G2/G3 在 unit test 中用 mocked `UserRepository` 的最小 User shape 即可，不应把 service actor 变成 USER fixture |
| `apps/backend/tests/pr/_kit/builders/partner-requests.ts` | `givenPublishedPartnerRequest` 通过真实 HTTP 创建并期望 `OPEN`；`givenDraftPR` 直接写 `createdBy: null` 并初始化 slots | W2/G7 的已有创建 helper；G1–G3 失败场景不要用 `givenDraftPR`（它本身会写 root），应先快照再走 command/HTTP |
| `apps/backend/tests/pr/_kit/probes/partner-requests.ts` | `probePartnerRequestCreationState`（`createdBy`,`status`）、status/id probes | W2/G7 的 owner/status probe；失败场景仍需直接比较 `partnerRequests` root rows/count |
| `apps/backend/tests/pr/_kit/probes/participants.ts` | `partners` active participant count/user ids | 可证明 W2 有 creator slot；G1–G3/W3 期望指定 PR id 下没有 partner rows |
| `apps/backend/tests/_infra/http/backend-app.ts` | 真实 Hono `app.request`，token 自动设置 Bearer header | W1/W2 的最低成本 HTTP ingress；匿名请求不传 token 或传 `givenAnonymousUser.token` |
| `apps/backend/tests/_infra/vitest/global-setup.ts` | backend-scenario 单数据库、串行、迁移后运行 | scenario 命令必须使用 `backend-scenario` project；不可从 unit test 连接 scenario DB |
| `apps/backend/src/controllers/wecom.controller.test.ts` | 目前只动态 import `buildWeComPRShareUrl` 并断言 canonical URL | 没有 webhook fixture、crypto fixture、AI/WeCom service spy；需扩展该文件或新增同目录 controller unit test |
| `apps/backend/src/controllers/wecom.controller.ts` | 只导出 `wecomRoute` 与 `buildWeComPRShareUrl`；`WeComService` 是 module singleton；POST 先返回空 200，再异步 decrypt→NL create→send reply | W3/W4 最低成本是 mock command、crypto 和 `WeComService`；若要 DB 级 no-row，依赖 G1 command test，不要让 async controller 测试承担数据库竞态 |

## 最小文件集合与 ID 覆盖

### 1. 新 unit：canonical command（G1/G2/G3，另含 SYSTEM 分支）

建议新增 `apps/backend/src/domains/pr/commands/create-pr-structured.test.ts`。若实现抽出
`pr-creation-guard.service.ts`，身份矩阵可以搬到对应 guard unit，但至少保留一个 command-level test 验证 guard 位于
`PartnerRequestRepository.create` 之前。

使用 `vi.hoisted` spies/mock：

- `PartnerRequestRepository.create`（以及可选 `findById`）;
- `initializeSlotsForPR`、`materializePRTypeConfigurationAtCreation`、`operationLogService.log`;
- 真正的 identity/guard seam；将 `UserRepository.findById` 返回的 User 最小化为 `{ id, status, role }`，不要落库。

建议四个最小 case：

| ID | identity/authority fixture | 必须断言 |
| --- | --- | --- |
| G1 | `USER` + 全 null identity | `ProblemDetailsError.status === 401`、`code === "AUTHENTICATED_REQUIRED"`；`create`、slot、materialization、log 均 0 次 |
| G2 | `USER` + `anonymousUserId` 非 null、其余 null | 与 G1 相同；断言 anonymous UUID 从未传给 `create.createdBy` |
| G3 | `USER` + ACTIVE `role: ["service", "analytics"]` id | 同样 401/auth code；service actor 不得被当作 USER owner |
| G9 | `SYSTEM` + 全 null identity（与 `expandFullCapacityPR` 调用形状一致） | `create` 仅 1 次，`status: "OPEN"`、`createdBy: null`；`initializeSlotsForPR(id, null)`；结果不被 USER guard 拦截 |

G1–G3 的 repository spy 是 ordering proof；真实 DB root count 放在 W1/W3 scenario/adapter 边界，避免 unit 依赖测试数据库。
G9 的 canonical command 分支可在同一文件直接覆盖；若验收要求“必须经过真实调用者 seam”，再新增下面的轻量 expansion unit（不需 scenario DB）。

### 2. 严格 G9 caller seam（仅在验收要求时新增）

新增 `apps/backend/src/domains/pr/commands/expand-full-capacity-pr.test.ts`，mock
`PartnerRequestRepository.findById`/`PartnerRepository.countActiveByPrId`、type expansion policy、POI 查询、visible sibling
查询和 `createPRFromStructured`。source PR fixture 只需 `maxPartners` 已满、`ENABLED`、另一个可用 location；断言 mock command 收到
`creationAuthority: "SYSTEM"`、`publicationMode: "create-open"` 和 `{ authenticatedUserId: null, anonymousUserId: null, oauthOpenId: null }`，并返回
`OPEN`/`createdBy: null`。这条 seam test 不应复制完整容量/POI scenario；若 `expandFullCapacityPR` 未被实现改动，仍可作为 G9 的最小调用者回归证据。

### 3. 现有 scenario：HTTP create（W1/W2）

只改 `apps/backend/tests/pr/pr-create.scenario.test.ts`：

- W1：用 `givenAnonymousUser`（或无 token）发送 `/api/pr/new/form`，使用未来时间字段；期望
  `application/problem+json`、HTTP 401、`AUTHENTICATED_REQUIRED`。请求前后分别
  `select({ id, createdBy, status }) from partnerRequests`，断言整组 rows 相等；这证明 middleware/command 都没有 root write。
- W2：用 `givenUser` 发送同样的未来字段；期望 HTTP 201、`status: "OPEN"`。以返回 id 查询
  `partnerRequests.createdBy === creator.user.id`，并用 `probeActiveParticipantUserIds` 断言 creator slot（若当前创建契约保留该 slot）。

W1 不能替代 G1：middleware 会在 command 之前拒绝匿名 HTTP；G1 才覆盖 WeCom/内部直接调用传全 null 的 canonical command。

### 4. 现有 scenario：ADMIN（G7）

只改 `apps/backend/tests/pr/pr-admin.scenario.test.ts` 的 `admin_pr_create_and_edit_allow_admin_only_pr_type`：保留现有
`givenAdminUser` 和 `givenPRTypeConfig`，创建成功后按 response id 查询：

```ts
select({ status: partnerRequests.status, createdBy: partnerRequests.createdBy })
  .from(partnerRequests)
  .where(eq(partnerRequests.id, created.id))
```

断言 `status === "OPEN"`、`createdBy === admin.user.id`，并保留 admin-only type assertion。不要把 ADMIN null actor 变成 USER 成功 case；若 direct use-case 仍允许 null actor，那是另一个显式 ADMIN characterization。

### 5. WeCom controller unit（W3/W4）

扩展 `apps/backend/src/controllers/wecom.controller.test.ts`（或新增同目录 `wecom.controller.pr-creation.test.ts`）。当前 route 未注入依赖，最低改动是 import 前使用 `vi.hoisted`/`vi.mock`：

- mock `../lib/wecom-crypto`：`verifySignature` 返回 true，`decryptWeComMessage` 返回固定 XML（`MsgType=text`、`Content`、`FromUserName`、`CreateTime`）；
- mock `../domains/pr/commands` 的 `createPRFromNaturalLanguage`；
- mock `../services/WeComService` class，使 `sendTextMessage` 成为 spy；
- 以小 Hono app `.route("/api/wecom", wecomRoute)` 发送带 `msg_signature/timestamp/nonce` 的 POST，断言立即响应为空 body + 200，然后 `await vi.waitFor(...)` 等待 async task。

W3 最小断言：mocked NL command 以全 null identity reject `ProblemDetailsError(401, AUTHENTICATED_REQUIRED)`；`sendTextMessage` 至多一次且 content 不含 `/pr/`、`搭子请求草稿已创建` 或任何 success URL。若实现明确选择“不回复”，锁定 `sendTextMessage` 0 次；若选择 truthful failure reply，锁定 `toUser === FromUserName` 且 content 是非成功文案。不要让 `FRONTEND_URL` 成为失败路径依赖。

W4 将 `FromUserName` 设成一个看似已知 `users.openId` 的值；断言传给 NL command 的 identity 仍为
`{ authenticatedUserId: null, anonymousUserId: null, oauthOpenId: null }`，sender id 只出现在 reply recipient。这样无需创建/查询 User mapping，也能防止隐式 `FromUserName → oauthOpenId`。

W3/W4 controller test 只证明 adapter 的调用、回复与 URL 约束；G1–G3 command unit 证明 no-write ordering。若实现改为 dependency-injected `handleWeComText`，优先测试该纯 seam，保留一条 route 200/empty-ack assertion。

## no-side-effect row probes

失败路径（G1/G2/G3/W1/W3/W4）建议按成本递增使用：

1. command unit：repository/child/log spies，断言 `PartnerRequestRepository.create` 之前抛错；不启动 DB。
2. backend scenario/adapter：`partnerRequests` root rows（至少 `{ id, createdBy, status, feedbackQuestionnaireInstanceId, joinGateConfig }`）前后深比较；也可按 `count(*)` + id 集合比较，避免并行 scenario 污染造成误判。
3. 若使用启用反馈问卷的 type config，额外比较 `feedback_questionnaire_instances` count；`materializePRTypeConfigurationAtCreation` 的参与规则/默认值写回 root，root snapshot 已覆盖。
4. 对 `partners` 按新增 PR id 查询，失败必须 0 行；成功 W2/G7 仅断言预期 creator/admin slot（若现行契约创建 slot）。
5. `operation_logs` 是 fire-and-forget；若需要 DB 证据，按 `aggregateType = "partner_request"`、`aggregateId = String(prId)` 查询并等待 `vi.waitFor`/一次 event-loop tick。更稳定的 G1–G3 证据是 spy `operationLogService.log`，应为 0 次。

不要把“root count 不变”单独当成 W3 充分证据：必须同时断言没有 success URL/reply；也不要把异步 operation-log 的最终写入误认为失败路径已成功。

## 精确执行命令（实现后）

这些命令使用仓库已定义的 Vitest projects，不是 ad-hoc `pnpm dev` 或未配置的 Vitest root：

```bash
pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit \
  apps/backend/src/domains/pr/commands/create-pr-structured.test.ts \
  apps/backend/src/controllers/wecom.controller.test.ts

pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario \
  apps/backend/tests/pr/pr-create.scenario.test.ts \
  apps/backend/tests/pr/pr-admin.scenario.test.ts

pnpm check:type:backend
pnpm check:build:backend
```

若选择严格 G9 caller seam，再把已新增的 `apps/backend/src/domains/pr/commands/expand-full-capacity-pr.test.ts` 追加到
第一条 unit 命令；未新增该可选文件时不要把它写入命令行。

预期 proof：unit 输出 G1/G2/G3 的 401/auth code + zero create/child/log calls，G9 的 OPEN/null-owner create（若新增严格 caller seam，则同时看到 `expandFullCapacityPR` 传参）；scenario 输出 W1 的 401 + root rows unchanged、W2 的 201/OPEN + owner probe、G7 的 OPEN + admin owner；WeCom unit 输出 W3 的 empty 200 + no success URL/reply、W4 的 sender 不进入 identity。上述命令在 guard/WeCom worker 实际改动前不应被解读为已通过。

## 不应在 07B 借 fixture 扩张的内容

- 不新增 WeCom `FromUserName` 到 `users.openId` 的 mapping、synthetic user 或 anonymous owner。
- 不把 legacy creatorless DRAFT（`givenDraftPR`）的编辑/发布规则塞进 create guard；那是 07C。
- 不为 G9 构造完整 Browser/System journey；system proof 归 07E。仅在 `expandFullCapacityPR` 被实际改动时补最小 command seam。
- 不依赖 operation-log 的即时数据库可见性来判定同步 guard 顺序。
