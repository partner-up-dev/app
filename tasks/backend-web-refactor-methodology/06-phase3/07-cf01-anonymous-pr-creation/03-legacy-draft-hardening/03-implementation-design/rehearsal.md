# 07C policy rehearsal（只读）

## 中央 API 草案

owner：`apps/backend/src/domains/pr/services/draft-access-policy.service.ts`

```ts
import type { PartnerRequest } from "../../../entities/partner-request";
import type { RequestAuth } from "../../../auth/types";

export type PRDraftAccessOperation =
  | "read"
  | "content-mutation"
  | "status-mutation"
  | "publish"
  | "participant-flow";

export type PRDraftActor = Pick<RequestAuth, "userId" | "roles">;

export function assertPRDraftAccess(input: {
  request: Pick<PartnerRequest, "status" | "createdBy">;
  actor: PRDraftActor;
  operation: PRDraftAccessOperation;
}): void;
```

实现约束：

- `request.status !== "DRAFT"` 时立即 return；因此 OPEN/READY/ACTIVE/CLOSED/EXPIRED 的当前 command/query 语义不变。
- `operation === "participant-flow"` 对 DRAFT 一律 404，即使 actor 是 owner；DRAFT 没有 join/waitlist/message/gate acceptance 产品流程。
- 其他 operation 只有 `actor.roles.includes("authenticated") && actor.userId !== null && actor.userId === request.createdBy` 通过。`createdBy === null` 永不由此 API 认领。
- 失败用 `throwHttpProblem({ status: 404, detail: "Partner request not found" })`（可加稳定 code，例如 `PR_DRAFT_NOT_ACCESSIBLE`，但 transport 首轮优先固定 404），避免暴露 creator-private row。调用点自身的认证 middleware 仍可先返回 401；这不是 policy 的绕过。
- 不接受 `role` 单值或客户端 authority 字段作为唯一输入；`roles` 是现有 `RequestAuth` 的 authority 集合。service/admin 不调用该普通 USER policy，使用已有 `adminAuthMiddleware`/admin use-case；若误入普通 surface，应因没有 authenticated owner 匹配而 404。

## 请求拓扑与结果

```text
HTTP authMiddleware
  -> actor {userId, roles}
  -> policy-aware domain loader/command
      -> DRAFT owner?  --yes--> projection or owner mutation
      -> no             --404--> stop before child query / setCreatedBy
  -> OPEN+             --policy no-op--> existing status/participant rules
```

### 场景 A：owner GET detail

`GET /api/pr/:id` 必须把 controller 的 `auth.userId + auth.roles` 传入 `getPRDetailView`；detail 在 `readPartnerRequestById` 后、任何 participant/feedback projection 前调用 `assertPRDraftAccess({operation:"read"})`。authenticated owner 通过；anonymous session 即使 `userId` 相同也不通过；OPEN+ 继续原 projection。

### 场景 B：other user/creatorless GET detail、orders、profile

actor 经过同一 policy，因 owner 不匹配或 `createdBy=null` 直接 404；不得先由 `getPROr404` 回 200/后续 403，也不得执行订单、participant profile、feedback child 查询。`getPR` public adapter 固定 anonymous actor，故 share/LLM 对所有 DRAFT 404。

### 场景 C：owner content/status/publish

`PATCH content` 和 `PATCH status` 的 `authorizeCreatorMutation` 先加载 row，再以 `operation:"content-mutation"`/`"status-mutation"` 调 policy。owner content 继续 200；owner status 仍收到 controller 现有 400 “Use publish endpoint...”。`POST publish` 在任何 `resolvePublishedCreator`/`setCreatedBy` 前构造 authenticated actor 调 `operation:"publish"`；owner 进入现有 conflict/start/POI checks，creatorless 不进入 claim 分支。

### 场景 D：other user/creatorless mutation

authenticated other user、creatorless authenticated user 对 content/status/publish 统一 404，数据库 row 不变。匿名 content/status/publish 仍可在 controller/auth boundary 得到 401（例如 `AUTHENTICATED_REQUIRED`）；若是无 auth GET 则 404。不得为了统一 status 而把认证错误降成 404。

### 场景 E：join-gate/message/participant flow

`GET/POST join-gates`、list/create/read-marker messages、join/waitlist/exit/confirm/check-in 使用 `operation:"participant-flow"`，DRAFT 在读取 gate/participant/order child 前 404。OPEN+ 仍由原 gate/participant/status guards 决定；不把 owner 例外扩展成 participant authority。

### 场景 F：service/admin

`/api/admin/*` 由 `adminAuthMiddleware=requireRoles(["service"])` 保护，workspace/list/detail/content/status/delete 的 DRAFT 例外保持现状。它们不是普通 policy 的测试输入；测试重点是普通 USER token 不能访问 admin route，且 admin 不会误走 `publishPR` creator claim。

## failed-create rehearsal

```text
validate before write
  -> INSERT partner_requests(DRAFT, createdBy=actor)
  -> initializeSlotsForPR(id, null): no partners
  -> optional type materialization
       -> may INSERT feedback_questionnaire_instances
  -> fire-and-forget operation log
  -> publish conflict check throws 409
  => root remains owner-bound DRAFT; no automatic delete in 07C
```

若异常发生于 `updateStatus(OPEN)` 之后，row 已非 DRAFT，不能匹配任何 draft cleanup predicate。任何未来 cleanup 必须绑定同一次 command 的 root/child IDs、owner、仍为 DRAFT、无 active/pending children，并在同一 transaction 内证明；否则保持 stop/fork。
