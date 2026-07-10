# TypeScript 7 分层迁移

## Objective & Hypothesis

- Objective: 将 Backend 与两个 fake server 的 TypeScript 编译器升级到 TS 7，同时保留 Web 的 `vue-tsc`/Volar TypeScript 6 兼容链。
- Hypothesis: 当前后端与 fake server 的显式 `ESNext + bundler` 配置已满足 TS 7 的配置边界；Vue SFC 类型检查依赖 TS 程序化 API，因此分层迁移可以获得 TS 7 CLI 能力而不破坏前端类型检查。

## Guardrails Touched

- 产品行为、API 合约和运行时部署行为保持不变。
- 不升级 Web 的 `vue-tsc`/Volar 类型检查链，直到其明确支持 TS 7。
- 不调整 `target`、模块格式或运行时 Node 版本；TS 编译器升级与运行时目标保持独立。
- 保留 root 的 canonical `pnpm` 检查入口。
- 不创建分支，不修改数据库迁移，不修改生成产物。
- 任务证据和迁移决策保留在本任务包中；只有经过验证的长期规则才提升到 durable docs。

## Verification

- 依赖安装：`pnpm install --frozen-lockfile`
- 版本边界：Backend/fake server 使用 TS 7；Web `vue-tsc` 仍使用 TS 6。
- 类型检查：`pnpm check:type:backend`、两个 fake server 的 `typecheck`、`pnpm check:type:web`
- 构建：`pnpm check:build:backend`、`pnpm check:build:web`
- 测试：Backend/Web unit tests，以及可运行的 backend/system scenario tests
- 最终检查：确认 git diff 只包含本迁移范围，且 Web 类型检查没有被 TS 7 接管。

## Current Status

- 评估完成：Backend 和两个 fake server 用 TS 7.0.2 CLI 对现有 tsconfig 做 `--noEmit` 检查通过。
- 已完成：Backend 使用 `@typescript/native` 提供 TS 7 CLI，`typescript` 使用 `@typescript/typescript6` 保持 `ts-node` 的 TS 6 API；两个 fake server 使用 TS 7；Web 保持 TS 6。
- 已完成：更新 workspace 依赖与 `pnpm-lock.yaml`，并将编译器分层写入 `docs/20-product-tdd/test-platform.md`。

## Verification Evidence

- `pnpm install --frozen-lockfile` passed.
- Version matrix passed: Backend `tsc` 7.0.2; Backend `ts-node` compiler 6.0.3; both fake-server `tsc` 7.0.2; Web `vue-tsc` 6.0.3.
- `pnpm check:type` passed.
- `pnpm check:build` passed.
- `pnpm test:unit` passed: 106 files, 476 tests.
- `pnpm test:scenario:backend` passed: 26 files, 82 tests.
- `pnpm test:scenario:system` passed: 10 files, 48 tests.
- `pnpm check:static` passed. The existing report-only dead-code findings remain; local security report was skipped because semgrep is not installed, as the repository script specifies.
