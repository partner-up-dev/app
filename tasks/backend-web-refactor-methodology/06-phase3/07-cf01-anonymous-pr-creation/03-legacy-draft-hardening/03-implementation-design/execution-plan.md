# 07C implementation design execution plan

## 顺序与低成本验证

### 1. 先固定现状（不改变生产行为）

在 `apps/backend/tests/pr/pr-create.scenario.test.ts` 增加真实 authenticated USER create -> publish conflict characterization：先用同一 creator 建立时间重叠的 `OPEN` PR，再 POST `/api/pr/new/form`，断言 `409` 与 `JOIN_TIME_WINDOW_CONFLICT`；按标题/owner 查询新 row，断言 `status='DRAFT'`、`createdBy=creator.id`、`partners` 数量为 0。若当前 fixture/config 可提供 questionnaire template，再记录新 row 的 `feedbackQuestionnaireInstanceId` 并断言 instance 存在；否则先把 probe 标为 blocked，不实现 cleanup。

在隔离 scenario DB 做 FK probe（可在 `pr-create.scenario.test.ts` 或独立 `pr-create-failure.scenario.test.ts`）：验证 partners/messages/gates/notification/study-sprint 子项的 root cascade，同时验证 questionnaire instance 在 root delete 后仅 `SET NULL`。该 probe 只使用本测试新建 fixture，不接触历史 rows。

### 2. 建立最小纯 policy

owner 文件建议为 `apps/backend/src/domains/pr/services/draft-access-policy.service.ts`，纯函数只读取 row 的 `status/createdBy` 与 actor；不执行 repository read，不认识 controller context，不接受客户端可控的 `authority` 字段。

建议签名与语义见 `implementation-map.md`。先给 policy 写单元测试，再接入 callers；测试应覆盖所有 actor/operation 分支和 OPEN+ no-op。

### 3. 接入 canonical read / mutation seams

按 implementation map 的顺序改 domain seams：

1. `getPRDetailView` 扩展 viewer 的 role/roles 后先 policy，再 `toPublicPR`。
2. `getPR` 作为 public adapter 固定匿名 actor，故 DRAFT 直接 404；share/LLM 不另加匿名能力。
3. `getPRJoinGateProjection` / `resolvePRJoinGate` 接受 actor，DRAFT join-gate projection/resolve 404。
4. `getPRPartnerProfile`、orders、message access 在读取/participant 查询前 policy；message/participant flow 的 DRAFT 统一 404。
5. `authorizeCreatorMutation` 在 DRAFT content/status 分支调用 policy；owner 才继续，普通 creatorless/非 owner 404。status 对 owner DRAFT 仍由 controller 返回现有 400 `Use publish endpoint...`。
6. `publishPR` 在任何 `setCreatedBy` 前以 authenticated owner actor 调 policy；creatorless 普通 actor 不进入 `resolvePublishedCreator` claim 分支。匿名 publish 的 route-level `AUTHENTICATED_REQUIRED` 可保持为认证边界。
7. 消除相关 endpoint 在 policy 前的 raw `getPROr404`，或把其替换成同一 policy-aware loader；join/waitlist/exit/confirm/check-in 等无 DRAFT product flow 的命令也要在业务 status 门之前不泄露 DRAFT。

### 4. focused scenario matrix

完成下列断言后再跑 Backend focused tests、Backend type/build；全跨单元证明留给 07E：

- `apps/backend/tests/pr/pr-draft.scenario.test.ts`：反转 creatorless claim/content-edit 两个现有成功断言；新增 owner detail/content/publish 成功、other-user detail/content/publish 404、creatorless detail/gate/orders/profile/message 404、anonymous 读 404/写 401 或 404（取决于 route auth boundary），并断言失败后 row `createdBy/status/title` 未变。
- `apps/backend/tests/pr/pr-join-gates.scenario.test.ts`：DRAFT `GET /join-gates` 与 resolve 404 且 `pr_join_notice_acceptances` 无新行；OPEN+ 现有 projection/accept/join 流保持原断言。
- `apps/backend/tests/pr/pr-admin.scenario.test.ts`：service/admin 对 DRAFT workspace/detail/content/status/delete 继续通过；普通 USER token 访问 `/api/admin/*` 仍 401（不得改成从普通 policy 放行）。
- `apps/backend/src/domains/pr/services/pr-read.service.test.ts`：保留 DRAFT 非 public status predicate；新增 policy 单测（建议另建 `draft-access-policy.service.test.ts`，若项目测试发现规则要求则合并到本文件），断言 DRAFT owner read/content/publish 通过、其余普通 actor 404、OPEN+ no-op。
- `apps/backend/tests/pr/pr-create.scenario.test.ts` 或新增 `pr-create-failure.scenario.test.ts`：保留 past-start no-row 断言，加入 conflict residue 与 child probe；cleanup 未获 transaction/ownership 证明前不得断言自动删除。
- 若有稳定 HTTP fixture，新增 share/LLM DRAFT 请求断言 404、OPEN+ 既有成功契约；没有 fixture 时只做 domain `getPR` public-adapter 单测，避免凭空扩展场景。

## 停止条件

- policy 无法区分 authenticated owner 与 anonymous session user：停止，不以 `userId` 单独授权。
- controller/raw repository 仍可在 policy 前投影 DRAFT：停止，不以单一 publish 修复宣称完成。
- root-only cleanup 仍无法覆盖 questionnaire instance、竞态或 fire-and-forget operation log：停止并 fork，不实现删除。
- service/admin authority 需要在普通 `/api/pr/:id` route 伪造：停止，恢复专用 admin/internal surface。
