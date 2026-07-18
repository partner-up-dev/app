# 07C implementation design：legacy DRAFT policy

## 目的

本目录只承载 07C 的只读实现设计与验证矩阵。本轮不修改生产代码、测试代码、durable docs、历史 DRAFT 数据或其他 task packet。

目标是把已完成的 `01-preflight-evidence.md` 与 `02-failed-create-cleanup-preflight/00-cleanup-preflight-evidence.md` 转换成一个最小、可执行的集中式 PR DRAFT policy 方案，并把 failed authenticated create 的清理问题留在明确的 stop/fork 边界内。

## 证据基线

- `apps/backend/src/domains/pr/services/pr-read.service.ts:61-68` 的 `readPartnerRequestById` 返回任意状态；只有 discovery 的 visible query 在 `:47-59,86-113` 过滤 DRAFT。
- `apps/backend/src/domains/pr/read-models/get-pr-detail.ts:116-166` 将 raw row 投影成 detail；`apps/backend/src/domains/pr/queries/get-pr.ts:7-17` 是 share/LLM 使用的 public adapter，当前没有状态 guard。
- `apps/backend/src/domains/pr/services/creator-mutation-auth.service.ts:16-31` 对 DRAFT content 直接接受任意 `auth.userId`，未比较 `createdBy`。
- `apps/backend/src/domains/pr/commands/publish-pr.ts:72-100,113-122` 允许普通 authenticated actor 认领 creatorless DRAFT；publish 成功才写 creator/status/slot。
- `apps/backend/src/controllers/partner-request.controller.ts:109-115,162-454` 的大量 endpoint 先 raw `getPROr404`，这本身会在 policy 前泄露 DRAFT 的存在。
- `apps/backend/src/domains/pr/services/join-gates.service.ts:87-117,169-212`、`pr-message-access.service.ts:16-35`、`queries/get-pr-partner-profile.ts:35-65` 只按 ID/participant 读取或写入，未有 DRAFT owner/status guard。
- cleanup 预检证明正常 authenticated create 的 publish 冲突会留下 `DRAFT + createdBy=actor`，且 type materialization 可能创建 `feedback_questionnaire_instances`；其反向 FK 是 `SET NULL`，root-only delete 不安全。没有 transaction、attempt marker 或完整副作用回滚证据。

## 设计结论

1. 在 `apps/backend/src/domains/pr/services/draft-access-policy.service.ts`（owner）增加纯策略函数 `assertPRDraftAccess`，由已加载 row 的 canonical query/command 调用；不要把低层 `readPartnerRequestById` 改成 public-only。
2. 普通 HTTP actor 只由 `RequestAuth` 的 `userId` 与 `roles` 建立；`role` 单值不是足够的 authority 判断，因为 service token 的主 role/roles 语义需要保留。service/admin 继续由专用 `adminAuthMiddleware` 和 admin use-case 处理，不穿过普通 USER claim 分支。
3. DRAFT 的普通 read 仅允许 authenticated owner；creatorless、匿名、非 owner、service/analytics 误入普通 surface 统一 404。DRAFT 的 participant/message/join-gate resolve 等没有产品流程的操作统一 404；owner 的 detail/content/publish 是唯一普通 USER 例外。OPEN+ 的原状态门与错误码保持不变。
4. failed authenticated create 的删除不在本轮实现；cleanup 继续 stop/fork 到 transaction + attempt ownership marker + questionnaire child contract，禁止 controller 追加 root-only delete。

## 验收边界

- 设计文件齐全且引用当前工作树证据。
- 测试矩阵覆盖 creator-owned、other-user、creatorless、anonymous、service/admin 与 OPEN+ regression。
- 任何实现前先完成 characterization，尤其是 `pr-create.scenario.test.ts` 的真实 conflict residue 和 questionnaire child probe。
