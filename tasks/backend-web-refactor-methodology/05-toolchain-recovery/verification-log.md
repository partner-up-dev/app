# Recovery Verification Log

状态词沿用 Phase 2 的 `PASS` / `FAIL` / `NO-SIGNAL` 语义；`PASS-WITH-FINDINGS` 表示命令成功
运行到报告阶段，但仍有不属于本恢复切片的 report-only findings。

| Layer | Command / probe | Result | Evidence summary |
| --- | --- | --- | --- |
| Native 0.124 | 从 `oxc-parser@0.124.0` 上下文 resolve/load Linux x64 GNU binding，并调用 `parseSync` | PASS | binding 可加载；返回 `Program`，0 parse errors |
| Native 0.135 | 从 `oxc-parser@0.135.0` 上下文 resolve/load Linux x64 GNU binding，并调用 `parseSync` | PASS | binding 可加载；返回 `Program`，0 parse errors |
| N-API guard | 两个 parser probe 均设置 `NAPI_RS_ENFORCE_VERSION_CHECK=1` | PASS | 两个版本在强制版本校验下仍成功解析 |
| Knip consumer | `pnpm check:dead-code` | PASS-WITH-FINDINGS | Knip 完整进入 report 阶段，旧 `0.135.0` binding crash 消失；现有 dead-code/unlisted 报告不在本恢复切片 |
| Initial Web gate | `pnpm check:build:web` | PASS | Vite production build 完成，791 modules transformed |
| Initial System gate | `pnpm test:scenario:system` | FAIL | startup 已恢复；6/8 files、29/30 tests 通过，另有 PR Discovery collection failure 与 route picker 60s timeout |
| Scenario dependency boundary | scoped Knip inspection + PR Discovery targeted run | PASS-WITH-FINDINGS | `drizzle-orm` root unlisted finding 消失；既有 `@partner-up-dev/backend` finding 保留；PR Discovery 3/3 通过 |
| Route PR targeted | route-create targeted run | PASS | 1/1 目标用例通过，另 2 tests skipped；12.60s |
| Changed-file static check | `pnpm exec biome check`（5 个代码/测试文件） | PASS | exact changed-file set clean |
| Patch whitespace | `git diff --check`（owned tracked files） | PASS | 无 whitespace error |
| Final Web gate | `pnpm check:build:web` | PASS | 791 modules transformed；13.00s |
| Final System gate | `pnpm test:scenario:system` | PASS | **8/8 files、33/33 tests**；119.65s（tests 110.26s） |

## Interpretation

- 用户的 oxc-parser 修复在本 workstream 开始时已经生效；本次没有再次安装依赖或改 package graph。
- Web build 与 System scenario 的 native startup blocker 均已解除。
- System 首轮暴露的两个后续问题分别属于 package ownership 与外网测试依赖；修复后又通过契约优先的
  API/DOM 对照定位到一个 `PuCard` consumer 渲染回归，三者均已有 targeted 与 full-gate 证据。
