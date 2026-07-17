# Recovery Scope Audit

## Owned Code And Test Changes

| Path | Change |
| --- | --- |
| `apps/backend/tests/pr-core/_kit/probes/partner-requests.ts` | 增加 Backend-owned 的按 type 查询 PR id probe，ORM 不再泄漏到 root scenario workspace |
| `tests/scenario/pr-discovery/pr-discovery.scenario.test.ts` | 改用 Backend probe，并先断言 discovery API contract 再断言 DOM |
| `tests/scenario/_infra/browser/tencent-location-picker.ts` | 新增 deterministic Tencent JS SDK browser test double |
| `tests/scenario/pr-core/pr-create.scenario.test.ts` | route picker scenario 改用 deterministic SDK fixture，继续验证有限坐标与完整创建 journey |
| `apps/web/src/domains/pr/ui/PRDiscoveryPanel.vue` | 通过 `PuCard #header` + `PuHeader` 显式渲染 discovery title/subtitle |

本目录中的 `00-task-packet.md`、`diagnosis.md`、`verification-log.md`、`scope-audit.md` 以及上级
`README.md` 仅记录本 workstream 的易变证据与索引。

## Preserved User Work

- 工作区开始时已有大规模 Backend/Web 重构与 package/lock/workspace 改动；本 workstream 未还原、
  重排或吸收这些改动。
- `apps/web/src/domains/pr/ui/PRDiscoveryPanel.vue` 与
  `tests/scenario/pr-discovery/pr-discovery.scenario.test.ts` 在本 workstream 开始前已属于用户的
  untracked 重构；这里只做了恢复所需的局部修改。
- 未修改 `package.json`、`pnpm-lock.yaml` 或 `pnpm-workspace.yaml`，也未执行新的依赖安装。

## Runtime Artifacts And Lifecycle

- Web build 可生成 ignored `apps/web/dist/`；System scenario 可生成 ignored test result/attachment，
  并由 global setup 创建和清理临时数据库、随机端口进程。
- 未启动、停止或杀死用户已有的 portless/dev server。

## Explicitly Not Performed

- 未修改 durable docs、schema/migration 或产品 API。
- 未增加 root `drizzle-orm` 依赖，未 patch `node_modules`。
- 未创建 live Tencent smoke lane；当前只把默认 System gate 恢复为 deterministic。
- 未 stage、commit、push 或创建 PR。
