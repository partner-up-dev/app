# 跨单元产品不变量冻结

> Historical snapshot at `a8cf2d7`: retain non-Event invariants as evidence. The Anchor Event section is
> superseded at current HEAD; do not use it to recreate an Event identity, route, table, or durable owner.

## 用法与边界

- 本表只摘录足以约束 Backend/Web 重构的用户可见承诺，不是新的产品 owner。
- `Fact` 表示可被当前 durable owner 直接支持；`Open` 表示 durable owners 之间存在张力，尚不能冻结成单一解释。
- 技术拆分可以改变，但不得静默改变这些承诺。若要改变承诺，先修改对应 PRD；若只改变技术实现或权威边界，修改 Product TDD。

## Identity

| 状态 | 冻结不变量 | Durable owner |
| --- | --- | --- |
| Fact | 浏览不以前置登录为门槛；匿名 UUID 连续性支持回访。需要更强身份保证的动作再升级到 authenticated session。 | `docs/10-prd/behavior/rules-and-invariants.md:149-153`；`docs/10-prd/behavior/claims.md:84-99` |
| Fact | 匿名与已认证用户会话都通过 Bearer JWT 传输；后端基于 JWT roles 与持久化用户状态判定权限，前端只负责启动身份升级 UX。 | `docs/20-product-tdd/cross-unit-contracts.md:54-67` |
| Fact | WeChat OAuth callback 不得把长期 access token 放进 query；handoff 使用短期签名 HttpOnly cookie + 非秘密 nonce，交换时必须带 credentials，nonce 在成功后从 URL 清除。 | `docs/20-product-tdd/cross-unit-contracts.md:68-68`；`docs/30-unit-tdd/wechat-oauth-handoff.md:14-30` |
| Open | 匿名用户创建 PR 的当前产品语义不一致：PRD 写“先持久化 DRAFT，认证后 publish”，Product TDD 写“user-owned create command 需要 authenticated 并在同一路径 publish”。重构不得自行选择其一。 | `docs/10-prd/behavior/rules-and-invariants.md:20-23`；`docs/10-prd/behavior/workflows/core-pr.md:4-11`；`docs/20-product-tdd/pr-lifecycle-contracts.md:17-25` |

## PR

| 状态 | 冻结不变量 | Durable owner |
| --- | --- | --- |
| Fact | 系统只有一个 durable collaboration object：`PartnerRequest` / `PR`；不同入口不得分叉其语义或对象模型。 | `docs/10-prd/behavior/claims.md:20-49`；`docs/10-prd/behavior/rules-and-invariants.md:3-7` |
| Fact | Durable status 集合为 `DRAFT/OPEN/READY/ACTIVE/CLOSED/EXPIRED`；`FULL` 只是容量派生展示状态，不能被持久化为 PR status。 | `docs/10-prd/behavior/rules-and-invariants.md:67-75`；`docs/20-product-tdd/pr-lifecycle-contracts.md:5-12` |
| Fact | PR 每次只拥有一个 place mode：location 模式持久化 location 并清空 route；route 模式持久化有序 route 并使 location 为 null。 | `docs/10-prd/behavior/rules-and-invariants.md:12-15`；`docs/20-product-tdd/pr-lifecycle-contracts.md:26-31` |
| Fact | 生命周期、资格、容量、时间冲突、join gates、当前 creator 转移与命令拒绝均由后端权威决定；前端 preflight/CTA 只是展示和提前提示。 | `docs/10-prd/behavior/rules-and-invariants.md:67-104`；`docs/20-product-tdd/pr-lifecycle-contracts.md:33-66,90-104` |
| Fact | Canonical PR facts 从 `GET /api/pr/:id` 读取；历史、event list、Form candidates 和 search preview 只传 id 与调用方上下文，不复制 title/status/place/time/count 真相。 | `docs/20-product-tdd/pr-lifecycle-contracts.md:41-48`；`docs/20-product-tdd/system-state-and-authority.md:69-74` |

## Event

| 状态 | 冻结不变量 | Durable owner |
| --- | --- | --- |
| Fact | Anchor Event 是 discovery/context surface，不是 PR durable identity；`PR.type` 驱动 event context resolution，event defaults 在创建时物化为 PR-owned runtime state。 | `docs/10-prd/behavior/claims.md:36-49`；`docs/10-prd/behavior/rules-and-invariants.md:11-12,26-28`；`docs/20-product-tdd/event-context-contracts.md:3-18` |
| Fact | `/e/:eventId` 是 canonical landing，支持 `FORM/CARD_RICH/LIST`；`/events/:eventId` 仅是兼容转发入口，无法及时得到模式决策时进入可用 `LIST` fallback。 | `docs/10-prd/behavior/rules-and-invariants.md:40-44`；`docs/20-product-tdd/event-context-contracts.md:19-28,60-66` |
| Fact | Form Mode 推荐与排序由系统生成；零匹配且零候选时的 auto-create 创建 system-owned `OPEN` PR，`createdBy = null`，viewer 不在创建时成为 creator。 | `docs/10-prd/behavior/rules-and-invariants.md:45-48`；`docs/20-product-tdd/event-context-contracts.md:31-38` |
| Fact | Dummy PR 是浏览器中的瞬态机会，不是持久化发现真相；只有用户触发 detail intent 后才通过系统命令物化，且不自动把 viewer 设为 creator 或 participant。 | `docs/10-prd/behavior/rules-and-invariants.md:58-61`；`docs/10-prd/behavior/workflows/event-context.md:30-38` |

## Messaging

| 状态 | 冻结不变量 | Durable owner |
| --- | --- | --- |
| Fact | PR messaging 是非实时协调层，位于独立 `/pr/:id/messages` 页面；不能引入 presence、typing 或 read-receipt 聊天室语义。 | `docs/10-prd/behavior/rules-and-invariants.md:7-9,169-169`；`docs/10-prd/behavior/workflows/messaging-reliability-and-study.md:3-12` |
| Fact | 同一 PR thread 同时容纳 participant-authored 与 operator-authored system messages；system message 必须可识别。 | `docs/10-prd/behavior/rules-and-invariants.md:8-9`；`docs/20-product-tdd/pr-messaging-contracts.md:5-10` |
| Fact | 只有 current active participants 能读取 thread、推进 read marker 或发送 participant message；operator 通过独立 admin capability 注入 system message。 | `docs/10-prd/behavior/rules-and-invariants.md:95-96`；`docs/20-product-tdd/pr-messaging-contracts.md:28-36` |
| Fact | Read marker 必须显式推进，不能由预取或隐藏 fetch 自动清除 unread wave。 | `docs/20-product-tdd/pr-messaging-contracts.md:13-26`；`docs/20-product-tdd/notification-contracts.md:98-112` |

## Commerce

| 状态 | 冻结不变量 | Durable owner |
| --- | --- | --- |
| Fact | Commerce 是帮助 PR 完成的有界附着能力，不是通用 marketplace/dispatch/ticketing 平台；用户 journey spine 为 PR Page -> `/order/new` -> Order Detail。 | `docs/10-prd/behavior/claims.md:65-80`；`docs/10-prd/behavior/scope.md:17-24`；`docs/20-product-tdd/ecommerce-contracts.md:180-203` |
| Fact | PR-attached order 仅能在 PR `READY` 或 `ACTIVE` 时创建，且每个 `(prId, offerId)` 最多一个 non-terminal order；PR 是最终 attachment authority。 | `docs/10-prd/behavior/rules-and-invariants.md:130-133`；`docs/20-product-tdd/ecommerce-contracts.md:241-258` |
| Fact | Quote identity 是 listing 到 create-order 的 freshness/authorization 边界；浏览器不得复制 route、participant、SKU 或 price 作为权威输入。 | `docs/10-prd/behavior/rules-and-invariants.md:133-136`；`docs/20-product-tdd/ecommerce-contracts.md:290-329` |
| Fact | Provider 系统拥有 gateway-facing payment lifecycle truth；后端拥有订单、账单和本地执行槽，不得另存一套 provider transaction state 作为产品真相。 | `docs/20-product-tdd/system-state-and-authority.md:113-118`；`docs/20-product-tdd/ecommerce-contracts.md:107-151` |

## Notification

| 状态 | 冻结不变量 | Durable owner |
| --- | --- | --- |
| Fact | Notification subscription 是剩余发送 quota，不是 boolean toggle；后端拥有 opportunity/wave/delivery/job 的持久化与 dispatch-time eligibility revalidation。 | `docs/10-prd/behavior/rules-and-invariants.md:169-183`；`docs/20-product-tdd/notification-contracts.md:18-29,62-96` |
| Fact | `PR_MESSAGE` 每个 `PR / recipient / unread wave` 最多发送一次，并在固定短 debounce 后汇总；发送前必须再次确认 recipient 仍是 active participant。 | `docs/10-prd/behavior/rules-and-invariants.md:175-177`；`docs/20-product-tdd/notification-contracts.md:98-110` |
| Fact | API 成功不意味着异步副作用已完成；outbox/job 可在响应后完成，前端只有在 API 明示时才可假设 side effects 已收敛。 | `docs/20-product-tdd/cross-unit-contracts.md:133-138`；`docs/20-product-tdd/notification-contracts.md:54-96` |

## Share

| 状态 | 冻结不变量 | Durable owner |
| --- | --- | --- |
| Fact | PR public detail route 必须可分享并可重新进入；share link 可携带 `spm` attribution。 | `docs/10-prd/behavior/rules-and-invariants.md:184-186`；`docs/10-prd/behavior/workflows/core-pr.md:48-54` |
| Fact | Entity truth 与基础 share metadata 由后端 canonical detail read 提供；前端拥有 route-scoped active share session、环境能力 fallback 和 replay。 | `docs/20-product-tdd/pr-lifecycle-contracts.md:74-88`；`docs/20-product-tdd/claim-realization-matrix.md:13-13` |
| Fact | Rich description、thumbnail、poster 是可选增强；增强失败不得使 base share descriptor 失效。 | `docs/20-product-tdd/pr-lifecycle-contracts.md:74-88` |
| Fact | OAuth handoff nonce 仍在 route 时，前端不得构建 share target/revision，避免把敏感 handoff state 分发出去。 | `docs/30-unit-tdd/wechat-oauth-handoff.md:14-28` |

## Revisit

| 状态 | 冻结不变量 | Durable owner |
| --- | --- | --- |
| Fact | Home、event pages、personal center、history 都是 revisit/re-entry surface；`/pr/mine` 是 created/joined PR history 的专用入口。 | `docs/10-prd/behavior/rules-and-invariants.md:184-194`；`docs/10-prd/behavior/workflows/core-pr.md:40-46` |
| Fact | `/me` 集中 avatar、nickname、WeChat identity/bind state 与匿名 UUID continuity；logout 后应立即获得新的匿名 UUID session 继续浏览。 | `docs/10-prd/behavior/rules-and-invariants.md:189-194`；`docs/10-prd/behavior/workflows/core-pr.md:40-46` |
| Fact | `/pr/mine` collection read 返回 id-only membership；preview facts 仍从 canonical PR detail read 水合。 | `docs/20-product-tdd/pr-lifecycle-contracts.md:41-42` |

## 未冻结张力与最低成本判别

| Open question | 不能静默做的事 | 最低成本判别证据 | Owner |
| --- | --- | --- | --- |
| 匿名 create 到底是“创建 DRAFT 后 OAuth publish”还是“创建前先 OAuth、同命令 publish”？ | 不得仅凭现有实现删除 DRAFT/pending replay，或反向强制恢复匿名 create。 | 由产品 owner 选择 intended workflow；随后用一个 browser scenario 覆盖匿名 `/pr/new` 提交直到 canonical detail 的完整序列。 | PRD `behavior/rules-and-invariants.md` + `workflows/core-pr.md`，再同步 `pr-lifecycle-contracts.md` |
| `POST /api/pr/:id/waitlist` 是否仍可返回 `auth payload`？ | 不得在 refactor 中复制或扩展 domain-response session payload。 | 对 typed response 与 frontend consumer 做一次只读结构查询；若仍存在，Product TDD 必须决定迁移到 `x-access-token`/session endpoint 的兼容窗口。 | `docs/20-product-tdd/cross-unit-contracts.md:62-68` 与 `docs/20-product-tdd/pr-lifecycle-contracts.md:55-55` |
