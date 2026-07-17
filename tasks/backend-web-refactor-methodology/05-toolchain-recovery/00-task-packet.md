# Toolchain Recovery Workstream

## Objective & Hypothesis

- 确认用户刚完成的依赖安装是否已恢复 `oxc-parser@0.124.0` 与 `0.135.0` 的 Linux x64 GNU native binding。
- 恢复 `pnpm check:build:web` 与 `pnpm test:scenario:system`，并把 binding、测试依赖边界和业务断言失败分层归因。
- 当前假设：binding 本体已经恢复；System scenario 剩余失败来自当前测试代码，而不是 native toolchain。

## Guardrails Touched

- 保留工作区中大规模 Backend/Web 重构及 package/lock 改动，不还原、不重排、不提交。
- 优先修改测试语言或测试替身，不改变产品行为来迁就测试。
- 不读取或记录 `.env` secret；System scenario 继续由 Vitest global setup 独占临时数据库和随机端口生命周期。
- 不手工启动、停止或杀死已有 portless/dev server。
- 不修改 durable docs；稳定结论先留在本任务目录。

## Planned Low-cost Verification

1. 两个 parser/native 版本做直接 resolve、load、`parseSync` 探针。
2. `pnpm check:dead-code` 验证 `0.135.0` 的真实 Knip 消费链。
3. `pnpm check:build:web` 验证 `0.124.0` 的真实 UnoCSS/Vite 消费链。
4. System scenario 首轮全量复现只做一次；后续按失败文件或用例 targeted 验证。
5. 两个 targeted 修复均通过后，才复跑一次 `pnpm test:scenario:system`。
6. 最后审计 tracked/untracked scope、生成物与 task packet 链接。

## Owned Outputs

- `diagnosis.md`
- `verification-log.md`
- `scope-audit.md`

## Current Status

- **Complete (2026-07-16).** 用户先前的依赖修复已恢复两套 binding，无需再次安装或修改
  package/lock/workspace 文件。
- Knip 真实消费链、Web production build 与完整 System scenario 均已恢复。
- 最终 System gate：8/8 files、33/33 tests 通过；详细证据见 `verification-log.md`。
- 默认 System gate 以 deterministic Tencent SDK test double 取代外网依赖；真实腾讯地图兼容性如需
  持续覆盖，应另建显式 opt-in live smoke lane。
