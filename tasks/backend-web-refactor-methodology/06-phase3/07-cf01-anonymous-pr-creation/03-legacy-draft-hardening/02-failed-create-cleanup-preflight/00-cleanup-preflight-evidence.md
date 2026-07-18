# 07C failed authenticated-create cleanup：只读预检

预检时间：2026-07-17。本文是 07C 的 task-local 证据；不修改生产代码、durable docs 或历史数据，且不覆盖 `01-preflight-evidence.md`。

## 结论（先行）

当前能证明的是：正常 `USER` 创建在 publish 校验失败时会留下一个“本次刚创建、绑定当前用户、状态仍为 `DRAFT`”的根行；它不会在此失败路径产生 creator slot 或 publish 通知，但创建阶段的 PR-type materialization 可能已经产生问卷实例。根行删除的直接 FK 子表大多是 `CASCADE`，而 `feedback_questionnaire_instances` 的反向 FK 是 `SET NULL`，所以仅删除 `partner_requests` 会留下无主问卷实例。每个步骤使用独立的 repository/db 调用，operation log 又是 fire-and-forget；没有证据证明一个 bounded cleanup 能原子覆盖所有副作用或竞态。

因此本预检不授权实现 root-only delete。建议 07C 对失败创建清理 **stop/fork 到一个事务/所有权明确的 bounded create-cleanup 工作项**。历史 creatorless DRAFT 不在清理条件内，也不应通过 migration 或运维脚本改写。

## `createPRFromStructured` 的精确副作用顺序

入口为 `apps/backend/src/domains/pr/commands/create-pr-structured.ts`：

1. 规范化和业务校验在持久化前完成（`96-112`）：时间窗、伙伴上下限、USER 类型创建策略、地点可用性。这里失败不会创建 PR 行。
2. `resolveDraftCreator` 解析身份，`createdBy` 取解析用户 ID，否则为 `null`（`114-118`）。普通已认证 USER 的 `createdBy` 是当前用户。
3. **写 PR 根行**：`prRepo.create(...)`，默认 `publicationMode` 为 `finalize-by-creator-identity`，故初始 `status` 为 `DRAFT`（`116-140`）。这是第一个 durable write。
4. **初始化 slots**：`initializeSlotsForPR(request.id, null)`（`142`）。虽然传入当前 PR ID，但第二个参数硬编码为 `null`，因此 `slot-management.service.ts:21-32` 不插入任何 `partners` 行；creator slot 只在 publish 阶段创建。
5. **PR-type materialization**：`materializePRTypeConfigurationAtCreation`（`144-149`）依次：
   - 读取当前 type config；若 notes 为空且有默认 notes，更新 PR 根行（`pr-type-creation-materialization.service.ts:16-21`）。
   - 写入 participation defaults，并物化/保留 join-gate config（`22-26`，委托 `pr-type-participation-defaults.service.ts:29-47`，仍是 PR 根行更新）。
   - 若 config 有 `feedbackQuestionnaireTemplateId`，先从模板创建一个全新的 `feedback_questionnaire_instances` 行，再将其 ID 写入 PR 根行（`27-35`；实例创建在 `FeedbackQuestionnaireRepository.createInstanceFromTemplate` 的 `73-83`）。该实例不是 PR 的 cascade 子行。
6. **创建 operation log（非阻塞）**：`operationLogService.log(...)`（`151-162`）立即返回，内部 `void writeAsync`，写入失败被吞掉（`apps/backend/src/infra/operation-log/operation-log.service.ts:23-45`）。`operation_logs.aggregate_id` 是 text，无 PR 外键。
7. 若 `publicationMode === "create-open"`，在 `164-171` 直接返回 `OPEN`；该分支不是正常 USER finalize 路径。
8. **publish/finalize**：`finalizeCreatedPR`（`create-pr.shared.ts:18-42`）只要 identity 有 authenticated user 或 oauth openId 就调用 `publishPR`（`36`）。

## publish 阶段的失败顺序及留下的状态

`apps/backend/src/domains/pr/commands/publish-pr.ts`：

```text
findById / status=DRAFT (58-68)
  -> owner/identity resolution (70-100)
  -> conflict + start-time + POI checks (102-111)
  -> [only on success] setCreatedBy (creatorless branch, 113-115)
  -> updateStatus(OPEN) (117-120)
  -> ensureCreatorSlotJoined (122; creates JOINED partner row at 30-52)
  -> reload + publish operation log (124-135)
  -> scheduleAlternativeWaitlistNotificationsForCandidate (137)
```
对“正常 authenticated create 产生的新 owner-bound DRAFT”来说，最便宜且确定的失败是：用户已有重叠的 `OPEN/READY/ACTIVE` PR，`assertNoUserTimeWindowConflict` 在 `102-106` 返回 `409 JOIN_TIME_WINDOW_CONFLICT`（规则实现：`participation-time-conflict.service.ts:41-53`）。此异常发生在 `setCreatedBy`、`OPEN`、creator slot 和通知之前，因此顺序结果是：

```text
PR(DRAFT, createdBy=actor) 已存在
partners：create 阶段为 0（initializeSlotsForPR 传 null）
type materialization：可能已更新 PR，并可能已创建/挂接 questionnaire instance
create operation log：可能已异步写入
publish 校验抛 409
无 publish log、无 creator slot、无 waitlist notification job/opportunity
```

若失败发生在 `updateStatus(OPEN)` 之后（例如 creator slot 插入、reload 或通知阶段异常），根行已不是 `DRAFT`，故不能以“仍为 DRAFT”条件删除；这种部分成功必须保留并另行修复。不能把所有 `publishPR` 异常都统一当成 cleanup residue。

## 外键、级联和非事务边界

### 删除 PR 根行时的当前实体 FK

以下字段明确引用 `partner_requests.id` 且为 `onDelete: "cascade"`：

| 子表/路径 | 证据 | 删除效果 |
| --- | --- | --- |
| `partners.pr_id` | `apps/backend/src/entities/partner.ts:25-35` | 删除所有 slot；其 `study_sprint_participant_sessions.partner_id` 也 cascade |
| `pr_messages.pr_id` | `apps/backend/src/entities/pr-message.ts:11-22` | 删除消息；inbox state 对消息 ID 的 FK 是 `SET NULL` |
| `pr_message_inbox_states.pr_id` | `apps/backend/src/entities/pr-message-inbox-state.ts:7-25` | 删除该 PR 的消息读标记 |
| `pr_join_notice_acceptances.pr_id` | `apps/backend/src/entities/pr-join-notice-acceptance.ts:6-16` | 删除 gate acceptance |
| `notification_deliveries.pr_id` | `apps/backend/src/entities/notification-delivery.ts:15-29` | 删除已持久化 delivery；其 `job_id` 仅 `SET NULL` |
| `study_sprint_rooms.pr_id` | `apps/backend/src/entities/study-sprint.ts:33-44` | 删除 room，并 cascade sessions/events |
| `study_sprint_participant_sessions.pr_id` | `apps/backend/src/entities/study-sprint.ts:57-79` | 删除 session；events 经 `session_id` cascade |

以下不是可依赖的 root cascade：

- `partner_requests.feedback_questionnaire_instance_id` 指向 `feedback_questionnaire_instances.id`，反向策略是 `onDelete: "set null"`（`apps/backend/src/entities/partner-request.ts:203-209`；migration `apps/backend/drizzle/0043_feedback_questionnaire.sql:14-40`）。删 PR 只会清空引用，留下实例；实例的 responses 仅在实例本身被删时 cascade（`feedback-questionnaire.ts:119-131`）。
- `operation_logs.aggregateType/aggregateId`、`notification_opportunities.aggregateType/aggregateId`、`notification_waves.aggregateType/aggregateId` 都是无 FK 的文本聚合标识（`operation-log.ts:8-16`、`notification-opportunity.ts:41-63`、`notification-wave.ts:19-35`）。
- `jobs.payload` 是 JSON，无 PR FK（`apps/backend/src/entities/job.ts:25-51`）；waitlist notification 的 job 与 opportunity 仅在 publish 已成为 OPEN 后才可能创建（`wechat-waitlist-alternative-available.ts:149-168`）。
- telemetry 的 PR ID 只在 JSON payload/attributes 中，实体没有 `partner_requests` FK（`apps/backend/src/entities/user-telemetry.ts:5-20`）。

历史 migration 中的 `anchor_*`/`pr_support_*` 表已由 `0025_single_pr_contract.sql:19-20`、`0059_remove_booking_support.sql:17-19`、`0087_drop_anchor_events.sql:177-179` 删除；当前 runtime entities 也没有这些表。因此不能把旧 data-migration `0004_partner_request_delete_cascade_alignment.sql` 中的旧 support FK 当作当前清理证明。

### 非事务证据

`createPRFromStructured` 没有 `db.transaction` 包围 `create → slots → materialization → publish`；其 repository 方法分别使用全局 `db`（例如 `PartnerRequestRepository.create/deleteById`：`apps/backend/src/repositories/PartnerRequestRepository.ts:19-23,278-281`）。虽然仓库其他领域有事务范式，但本 bounded use case 尚未接入统一 transaction executor。

此外 operation log 是异步 fire-and-forget：cleanup 即使立即删除根行，也不能撤回一个稍后成功落库的 `pr.create_*` log；这虽不是完整性 FK 问题，但会产生“已清理 PR 仍有创建审计”的可见事实，应由产品/审计策略明确接受，而非偶然发生。

## 安全判断与最小后续设计

### 当前结论：stop/fork

“只删本次创建的 PR 根行”尚不足以证明安全，原因是：

1. type config 可能已经创建独立 questionnaire instance；root `DELETE` 只将其 FK 置空，造成 orphan，root cascade 无法覆盖。
2. 无事务边界，任一中间写入异常都可能留下半成品；把所有 publish error 统一清理会误删 `OPEN` 部分成功状态。
3. cleanup 与 owner 编辑/管理操作之间没有锁或 attempt token；仅用 `id + createdBy + status=DRAFT` 不能证明“仍是本次未被触碰的行”。
4. operation log/notification/job 等无 FK副作用无法由 root delete 回滚；虽然正常冲突路径不会排程通知，但未来在 publish 顺序变化时会形成残留。

按 07C packet 的 stop 条件，应 fork 为“bounded create transaction + ownership/attempt marker + child cleanup contract”，而不是在 controller 中追加 delete。

### 若后续 fork 获批，最小 API/条件/放置建议

建议放在 PR domain 的 `create-pr-structured` use-case 内（不是 controller），接口形状仅供后续设计评审：

```text
createPRFromStructured(...)
  -> bounded transaction(executor)
      -> insert root and capture {id, actorId, initial status}
      -> materialize children, capture newly-created questionnaireInstanceId
      -> finalize publish
      -> on expected pre-publish failure only:
           DELETE where id = captured id
                    AND created_by = actorId
                    AND status = 'DRAFT'
                    AND no partner/message/gate/sprint/notification children
           delete captured questionnaire instance only when it is still referenced by this root
           and has no responses
```

必须同时满足：普通 `USER` authority、同一 command 捕获的 ID/attempt、状态仍 `DRAFT`、owner 精确匹配、无任何 active/pending child；不接受 `createdBy IS NULL`，不接受历史 rows，不接受 admin/system create-open。若数据库无法在同一事务中证明这些条件，保持 stop/fork。

## 最便宜验证计划（实现前）

1. **真实场景 characterization（Backend）**：在 `apps/backend/tests/pr/pr-create.scenario.test.ts` 新增 authenticated user + 已有重叠 OPEN PR，POST `/api/pr/new/form`；断言 `409`/`JOIN_TIME_WINDOW_CONFLICT`，按新 title/owner 查出一行 `DRAFT`，并断言该 PR 没有 `partners`。这固定当前失败序列，不触碰历史数据。
2. **materialization child probe（Backend scenario）**：用带 `feedbackQuestionnaireTemplateId` 的 PR type config 重复上述失败，记录新 PR 的 `feedbackQuestionnaireInstanceId`；断言 instance 存在且 root 删除时只会 `SET NULL`（responses 为空）。这一步是决定 root-only cleanup 是否可接受的关键证据。
3. **FK cascade probe（隔离 scenario DB）**：为一个专用 fixture 写入 gate acceptance/message/inbox/notification delivery/study-sprint children，删除该 fixture root，分别断言上述 cascade；同时断言 questionnaire instance 未被 root delete 级联。不得把 fixture 指向历史行。
4. **事务/竞态验证**：若 fork 获批，先用 transaction-backed use-case 单测验证“materialization 或 publish 前校验抛错时 root 与捕获 child 同时回滚”；再增加同一 actor 另一个并发编辑/管理员操作不会被 cleanup 删除的条件测试。没有这两层 proof，不实现 cleanup。

## 失败序列摘要

```text
authenticated USER
  -> validate
  -> INSERT partner_requests (DRAFT, createdBy=actor)
  -> initializeSlotsForPR(id, null): no slot
  -> optional PR-type root updates + questionnaire instance INSERT
  -> fire-and-forget pr.create_* operation log
  -> publish checks conflict/start/POI
       └─ expected 409: root remains owner-bound DRAFT; no creator slot/notify
       └─ later-stage error: root may already be OPEN; never match DRAFT cleanup
```
