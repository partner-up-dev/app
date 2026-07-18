# 07C entry inventory — current DRAFT ingress

证据基线：当前工作树（2026-07-17）；行号以本次 rebaseline 时文件为准。`readPartnerRequestById` 和 repository `findById` 仍是 raw row access，不是 HTTP authorization。

## Canonical reads and public adapters

| ingress | current call graph | DRAFT exposure / required actor |
| --- | --- | --- |
| `GET /api/pr/:id` | `controllers/partner-request.controller.ts:448-453` → `domains/pr/read-models/get-pr-detail.ts:getPRDetailView:116-227` → `services/pr-read.service.ts:61-68` | 目前按 ID 投影任意 status，且在 policy 前读取 participant/feedback/meeting/share；需将完整 `{userId, roles}` actor 传入，在 child projection 前做 `read`。owner 允许，其他/creatorless/anonymous/service/analytics 404。|
| public `getPR` | `domains/pr/queries/get-pr.ts:7-17` → raw read → `toPublicPR` | public adapter 不接收 request actor，固定 anonymous actor；所有 DRAFT 404。`llm.controller.ts:20-67` 直接调用它。|
| share generation | `controllers/share.controller.ts:50-82` → `services/ShareService.ts:122-184` → `getPR` | poster/thumbnail/description 可由匿名 route 间接读取 DRAFT；沿 public `getPR` 统一 404。|
| share cache read/write | `share.controller.ts:83-127` → `ShareService.ts:186-237` → `PartnerRequestRepository.add/find*` | cache 读写没有先读 status，是本次发现的额外 mutation/leak 面；cache read/write 必须在 owner/public policy 前置检查后才触及 repo，public surface 仅 OPEN+。|
| `GET /api/pr/mine/created` | controller `:174-177` → `queries/get-my-created-prs.ts:9-14` → `readPartnerRequestsByCreatorId` | 只按 `createdBy` 索引，当前 `requireSessionUserId` 可能接受 anonymous session user。它不能成为 creatorless claim；执行时固定是否仅 authenticated owner 列出 owner-bound DRAFT，并保持不暴露 creatorless。|
| `GET /api/pr/mine/joined` | `queries/get-my-joined-prs.ts:12-20` → active partner slots → raw rows | 已有 DRAFT participant residue 会进入索引；按 accepted participant-flow policy，DRAFT 不应从该普通列表产生可用流程，需保留 OPEN+ 回归并确认 DRAFT 过滤/404 语义。|

## Join gate, profile, orders, messages

| ingress | current call graph | guard required |
| --- | --- | --- |
| `GET /:id/join-gates` | controller `:267-275` raw `getPROr404` → `services/join-gates.service.ts:getPRJoinGateProjection:87-117` | 接收 `{userId, roles}`；`participant-flow` 在读取 gate config/acceptance 前阻断 DRAFT，owner 也 404。|
| `POST /:id/join-gates/:gateKey/resolve` | controller `:277-295` raw `getPROr404` → `resolvePRJoinGate:169-212` → upsert acceptance | 同一 actor，DRAFT 在 gate lookup/upsert 前 404；OPEN+ gate payload/version/error contract 不变。|
| `GET /:id/partners/:partnerId/profile` | controller `:430-446` → `queries/get-pr-partner-profile.ts:35-65` → `readPartnerRequestById` → active participant query | 传 `{viewerUserId, roles}`，先 policy 再 participant query；DRAFT 非 owner/creatorless 404；owner 若无 active participant 保持 profile 404。若 fixture 将 profile 视为 participant flow，则 owner 也应 404，不能扩大历史 slot 权限。|
| `GET /:id/orders` | controller `:201-221` raw `getPROr404` → `pr.orders` → `TradeOrderRepository` | 传完整 actor，先 `read` policy 再读取 order IDs；owner private read 可达，其他/creatorless 404。|
| `GET/POST /:id/messages` | controller `:184-199`, `:223-248` raw `getPROr404` → `message/list|create` → `services/pr-message-access.service.ts:16-35` | access helper 接收 `{userId, roles}`，先 `participant-flow` DRAFT 404，再 active participant check；不创建消息。OPEN+ 非 participant 403 保持。|
| `POST /:id/messages/read-marker` | controller `:250-265` raw `getPROr404` → `message/advance-pr-message-read-marker.ts:18-32` → same access helper | 同上，DRAFT 404，不能 upsert inbox marker。|

## Content/status/publish and participant commands

| ingress | current behavior | required enforcement |
| --- | --- | --- |
| `PATCH /:id/content` | controller `:331-347` raw existence → `authorizeCreatorMutation` currently lets every DRAFT actor through (`services/creator-mutation-auth.service.ts:26-31`) → `updateUserPRContent` | full `RequestAuth` (roles + userId)；`content-mutation` only authenticated owner, creatorless/other 404; anonymous outer 401 remains. |
| `PATCH /:id/status` | controller `:297-329` raw existence → `authorizeCreatorMutation` → owner DRAFT currently reaches existing 400 “Use publish endpoint” | enforce owner before status semantic check (`status-mutation`); creatorless/other 404; owner remains 400, not a successful status mutation; OPEN+ ownership/error behavior unchanged. |
| `POST /:id/publish` | controller `:162-173` raw existence → `publishPR:54-143`; creatorless branch calls `resolvePublishedCreator` then `setCreatedBy` | pass authenticated actor before claim; owner DRAFT may run existing conflict/start/POI checks; creatorless/other ordinary actors 404; anonymous route `401 AUTHENTICATED_REQUIRED`; no `setCreatedBy` claim. |
| `POST /:id/join` | controller `:349-367` raw existence → `joinPRByIdentity`/`joinPRAsUser` status gate | add `participant-flow` before temporal refresh/child queries; DRAFT 404 even owner; OPEN+ join/gate/reliability semantics unchanged. |
| `POST /:id/waitlist`, `/waitlist/cancel` | controller `:369-398` raw existence → waitlist/cancel commands | same DRAFT 404 before pending/active slot reads/writes; no waitlist residue. |
| `POST /:id/exit` | controller `:400-405` raw existence → `exitPRByUserId` | same DRAFT 404 before active slot/reconciliation/reset; OPEN+ behavior unchanged. |
| `POST /:id/confirm` | controller `:407-412` raw existence → `confirmSlot` | DRAFT 404 before openId/slot mutation; retain outer auth/openId errors where route reaches them. |
| `POST /:id/check-in` | controller `:414-428` raw existence → `checkIn` | DRAFT 404 before openId/attendance mutation; keep existing `didAttend=false` and OPEN+ semantics. |

## Non-ingress status gates and explicit authority

- Discovery visible reads (`services/pr-read.service.ts:86-113`) filter to OPEN/READY/ACTIVE/CLOSED/EXPIRED and already exclude DRAFT; retain regression.
- `queries/order-attachment-eligibility.ts:18-29` allows only READY/ACTIVE; commerce create therefore rejects DRAFT as `PR_NOT_READY` before attach. Keep this status/error contract; do not treat it as owner draft read.
- `domains/study-sprint/services/eligibility.ts` requires ACTIVE; no DRAFT surface found.
- `domains/pr/services/current-creator.service.ts:16-39` can set `createdBy` to the first active participant and is called by join/exit/release effects. This is an unexpected write path if a legacy DRAFT has active slots; implementation must make creator reconciliation OPEN+ only or otherwise prove it cannot run on DRAFT.
- `/api/admin/*` (`controllers/admin-pr-management.controller.ts:91-245`) is an explicit service surface. Its DRAFT workspace/detail/content/status/delete/message behavior remains allowed and must not call ordinary USER policy.

## Raw `getPROr404` inventory

The helper is local to `partner-request.controller.ts:109-115` and is called before business auth/commands at lines `164,186,208,230,257,269,283,303,337,355,375,395,402,409,420`. These are publish, messages list/create/read-marker, orders, gate projection/resolve, status/content, join, waitlist/cancel, exit, confirm, and check-in. It only proves row existence and must be replaced by policy-aware loading or followed immediately by the same actor policy; a raw 404 helper alone leaks DRAFT existence via downstream 400/403.
