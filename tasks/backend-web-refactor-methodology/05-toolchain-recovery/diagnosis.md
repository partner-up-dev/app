# Recovery Diagnosis

## Timeline And Blast Radius

| Stage | Observation | Scope |
| --- | --- | --- |
| Phase 2 baseline | Knip 缺 `oxc-parser@0.135.0` binding；Web build/System startup 缺 `0.124.0` binding | Toolchain startup；System 0 assertions |
| 2026-07-16 direct probes | 两个 Linux x64 GNU binding 均可 resolve/load，并各自成功解析 TypeScript AST | Native install restored |
| Real consumers | Knip 可完整报告；Web production build 完成 | 两套真实调用链 restored |
| First recovered System run | 8 files 中 6 pass；30 tests 中 29 pass；另有 1 suite collection failure | Startup restored；剩余测试代码问题 |

## Evidence-backed Findings

### H1 — PR Discovery scenario crosses the pnpm package boundary

- `tests/scenario/pr-discovery/pr-discovery.scenario.test.ts` 从根测试 workspace bare-import `drizzle-orm`。
- `drizzle-orm` 只声明在 `apps/backend/package.json`，pnpm strict resolution 不会把它暴露给 root test workspace。
- Vitest 因而在 collection 阶段失败，0 tests 被收集。
- 最小方向：让 Backend domain test kit 拥有 ORM probe，root browser scenario 只调用 domain test language。

### H2 — Route create scenario depends on live Tencent SDK/network

- 失败用例通过 `curl` 代理真实 `map.qq.com` / `apis.map.qq.com`，然后等待 map overlay detached。
- 两次腾讯 SDK 请求均由 `curl` 以 exit 28 超时结束，响应为 0 bytes；测试环境已声明非空 key，
  未读取或记录 key 内容。
- SDK loader 重试后进入 error 状态；Location Picker 在非-ready 状态保留 overlay，搜索因此不能继续。
- 修复落在测试基础设施：默认 System gate 注入最小 deterministic `window.TMap` 实现，保留真实
  Location Picker、provider normalization、PR form、Backend HTTP、数据库持久化与 canonical detail
  断言。未修改产品错误处理，也未用延长超时掩盖外网故障。

### H3 — Discovery API 正确，但 PuCard consumer 未渲染标题

- collection 修复后，浏览器收到的 `/api/pr/discovery/catalog` 响应包含目标 type 与 exact title；
  DOM 中对应卡片却只显示“查看匹配 PR”。
- `@partner-up-dev/design-web@0.4.7` 的已编译 `PuCard` 仅在 header/collapsible 分支渲染
  `title` prop；当前 consumer 未进入该分支。
- 依据 design-web skill 的组件组合约定，consumer 改为 `PuCard #header` + `PuHeader`，不 patch
  node_modules，也不改变 API 或领域数据。

## Protected Invariants

- System journey 仍必须经过 Playwright browser、Vite frontend、真实 Backend HTTP 与隔离 Postgres。
- Route PR 测试仍必须通过 Location Picker UI 选中两个带有限数值 GCJ-02 坐标的地点，并验证 create request 与 canonical detail。
- PR Discovery no-match journey 前后不得额外持久化 dummy PR。
