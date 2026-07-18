# 07C execution preflight — legacy DRAFT hardening

预检时间：2026-07-17（执行时只读 rebaseline）。本目录只记录当前工作树事实、调用图和最低成本验证；不修改生产代码、测试、durable docs、历史数据或 07C 根 packet。

## Accepted policy（执行边界）

- 普通 API：`authenticated` owner 可读取、内容修改、发布自己 `createdBy` 绑定的 `DRAFT`。
- creatorless、其他 owner、匿名 session、service/analytics 误入普通 API 的 DRAFT 统一不透明 `404`；policy 不能把当前 actor 写入 `createdBy`。
- DRAFT 不开放 participant flow，即使 owner 也不能 join/waitlist/exit/confirm/check-in、join-gate resolve、message 或 read-marker；匿名 mutation 可保留 route/auth 边界的 `401`。
- `/api/admin/*` 继续由 `adminAuthMiddleware` 和 admin use-case 提供显式 service authority；不把 admin 放进普通 actor policy。
- failed authenticated create 的 DRAFT 仅作为现有 cleanup residue characterization；本阶段不删除、重写或自动清理。

## Current rebaseline

`src/domains/pr-core` 和 `PartnerRequestService` 已从生产/测试消费者退休；当前 owner 文件落在 `apps/backend/src/domains/pr/{commands,queries,services,message,read-models}`。03 implementation map 的 seam/operation 划分仍然成立，但下文以这些 canonical 路径为准，并补入 share-cache 写入与 `/mine/created` 观察面。

## Stop/exit

本 packet 不宣称 policy、生产接入或测试已实现。若实现前仍不能在 canonical projection/command 之前阻断 DRAFT，或 cleanup 需要跨事务/所有权证明，应停止并 fork；不得通过 controller 删除 root。
