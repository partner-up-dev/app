# Phase 2 Canonical Verification Runtime Baseline

> Historical snapshot at `a8cf2d7`: do not treat the failures below as current blockers. The binding recovery and
> current Web build/System results are recorded in `../05-toolchain-recovery/` and `../06-phase3/entry-baseline.md`.

## Baseline Scope

这是一次只读诊断快照，不是 release qualification。命令均从仓库根目录执行；未安装依赖、未修复失败、未运行 reset/migrate、未手工启动 dev server。Scenario 只通过 Vitest project 自有的隔离数据库与 server lifecycle 启动。

状态词严格区分：

- `PASS`：命令完成、exit 0，且其主要检查实际执行。
- `FAIL`：命令 exit 非 0 或得到等价的 definitive failure evidence。
- `SKIPPED`：命令 exit 0，但主检查因前置工具缺失而明确跳过。
- `NO-SIGNAL`：命令 exit 0，但实际扫描 0 个目标，不能证明全量基线。
- `PASS-WITH-FINDINGS`：命令 exit 0，report-only 子层有非阻断发现。

## Environment And Worktree Assumptions

| 项 | 当前快照 |
| --- | --- |
| Timestamp / timezone | 2026-07-15 21:27-21:34, `Asia/Shanghai` |
| Repository | `/home/yyh/development/Anana/mvp-HA` |
| Branch / HEAD | `develop` / `a8cf2d7c1beb6f8c285a1265440b278c6668a55b` |
| Worktree | 非干净：`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml` 已修改；多个 task 目录 untracked。均为共享工作区既有改动，本 workstream 未触碰。 |
| Host | Linux `6.18.33.2-microsoft-standard-WSL2`, x86_64 |
| Shell Node | `node --version` = `v22.22.3` |
| Project Node used by pnpm scripts | `pnpm exec node --version` 与 `node_modules/.bin/node --version` 均为 `v22.23.1`；`node_modules/.bin/node` 解析到 pnpm store 的 `@node/22.23.1`。Gate 结果应归因于此 project runtime，而非 shell Node。 |
| pnpm | `11.13.0` |
| Scenario env | `apps/backend/.env` 与 `apps/web/.env` 均存在；只检查存在性/权限/大小，未读取或记录 secret。 |
| Dependency state | 使用现有 `node_modules`；未运行 install。每个 pnpm 命令都报告 committed project `.npmrc` auth-setting warning。 |

因此，本表只描述“该 HEAD + 该脏工作树 + 现有依赖安装”的结果。不能外推为 clean HEAD、CI install 或 hosted runtime 结果。

## Canonical Diagnostic Matrix

工作目录统一为 `/home/yyh/development/Anana/mvp-HA`。

| Gate | Command | Exit | Duration | Result | 摘要 |
| --- | --- | ---: | ---: | --- | --- |
| Format | `pnpm check:format` | 0 | 2s | NO-SIGNAL | Biome `--changed` 检查 0 files；无修复。不能记成全仓格式通过。 |
| Backend lint | `pnpm check:lint:backend` | 0 | 5s | PASS | Biome changed lane 0 files；AST structural scan 与 Problem Details lint 实际执行并通过。 |
| Web lint | `pnpm check:lint:web` | 0 | 3s | PASS-WITH-FINDINGS | Biome changed lane 0 files；token strict 无 baseline 外发现；naming report 有 2 个 medium weak-name findings，report-only。 |
| Backend type | `pnpm check:type:backend` | 0 | 7s | PASS | Backend `tsc --noEmit` 完成。 |
| Web type | `pnpm check:type:web` | 0 | 29s | PASS | Web `vue-tsc --noEmit` 完成。 |
| Backend config | `pnpm check:config:backend` | 0 | 4s | PASS | `db:lint` 通过；`drizzle-kit check` 返回 `Everything's fine`。未连接或迁移持久开发 DB。 |
| Dead code | `pnpm check:dead-code` | 1 | 2s | FAIL | Knip 启动时缺少 `@oxc-parser/binding-linux-x64-gnu`；故未产生 dead-code 报告。失败栈来自 `oxc-parser@0.135.0`。 |
| Security | `pnpm check:security` | 0 | 1s | SKIPPED | 明确输出 `semgrep is not installed; skipping security report`；不能记为 security pass。 |
| Backend build | `pnpm check:build:backend` | 0 | 3s | PASS | Backend tsup 与 FC db-migrate bundle 均构建成功。 |
| Web build | `pnpm check:build:web` | 1 | ~28s | FAIL | 本 workstream 多次运行都进入 `vue-tsc && vite build` 后终止；根复核 session `88826` 给出 definitive exit 1：`vue-tsc` 通过，Vite/UnoCSS 加载缺失的 `oxc-parser@0.124.0` native binding 失败。与 dead-code 属同类 native optional-dependency 缺失，但版本不同。 |
| Backend unit | `pnpm test:unit:backend` | 0 | 7s | PASS | 68 files / 314 tests 全部通过；Vitest duration 5.64s。 |
| Web unit | `pnpm test:unit:web` | 0 | 6s | PASS | 38 files / 162 tests 全部通过；Vitest duration 4.24s。 |
| Backend scenario | `pnpm test:scenario:backend` | 0 | 16s | PASS | 26 files / 82 tests 全部通过；隔离 Postgres lifecycle 由 project 管理，Vitest duration 14.19s。 |
| System scenario | `pnpm test:scenario:system` | 1 | 7s first / 8s retry | FAIL | 首次 global setup 在 `127.0.0.1:43925` 遇到瞬时 `EADDRINUSE`；端口随后已释放。一次同命令重跑在 Vite/UnoCSS setup 因缺失 `oxc-parser@0.124.0` binding 失败，测试文件未开始执行。 |

## Result Interpretation

### 可用信号

- Backend type/build/config/unit/scenario 当前可复现为通过。
- Web type 与 unit 当前通过，说明 Vue type lane 与 Node unit project 可运行。
- Cross-unit browser-to-Postgres journey 没有获得测试结果：system scenario 在 frontend server global setup 阶段失败。
- Backend/Web lint 的非 Biome 子层有实际信号，但默认 Biome 是 changed-file scope，当前各扫描 0 files。

### 阻塞与共同根因

1. 现有 install 缺少 Linux x64 GNU 的 `oxc-parser` native optional binding：
   - dead-code path 使用 `oxc-parser@0.135.0`；
   - Vite/UnoCSS path 使用 `oxc-parser@0.124.0`。
2. 该缺失同时阻断 dead-code、Web build 和 system scenario frontend startup；未按任务约束运行 install 或修复。
3. Security layer 还缺少 semgrep。由于命令设计为 report mode + skip，exit 0 不是验证成功。
4. 首次 system scenario 另遇瞬时 port collision；重跑已穿过该阶段并暴露更稳定的 native-binding blocker，所以端口碰撞不是当前最终根因。

### Gate Coverage 结论

- `PASS`: 8 项（backend lint/type/config/build/unit/scenario，web type/unit）。
- `PASS-WITH-FINDINGS`: 1 项（web lint）。
- `FAIL`: 3 项（dead-code、web build、system scenario）。
- `SKIPPED`: 1 项（security）。
- `NO-SIGNAL`: 1 项（format）。

这不是全绿基线；尤其不能把 `check:security` 的 exit 0 或 `check:format` 的 exit 0 描述为检查通过。

## Recheck Plan（不在本阶段执行）

| Blocker | 最低成本重查 | 预期区分 |
| --- | --- | --- |
| oxc native bindings | 在 owner 明确修复依赖安装后，依次重跑 `pnpm check:dead-code`、`pnpm check:build:web`、`pnpm test:scenario:system` | 区分 install/toolchain 缺口与源码/测试缺陷 |
| semgrep missing | 在 CI 或已有 semgrep 的受控环境重跑 `pnpm check:security` | 获得真实 security report，而非 skip |
| Biome 0 files | 若要做全仓基线，显式运行 durable guidance 指定的 all-repo commands；本任务未获授权扩大全仓 baseline | 区分 changed-scope 无信号与全仓质量 |
| system scenario port collision | 重跑前只读确认 allocated port 未被其他并发 task 占用；不得杀死未知共享进程 | 区分并发环境冲突与 scenario lifecycle 缺陷 |

## Canonical Runtime Boundary

- System scenario contract 是 `Playwright browser -> Vite frontend -> real backend HTTP -> isolated Postgres`，并由 Vitest global setup 管理临时 DB、迁移与 servers；见 `docs/20-product-tdd/test-platform.md:61-99`。
- Local portless dev servers 与 system scenario runtime 相互独立；本次没有执行 `pnpm dev:ensure` 或任何 raw dev server command；见 `docs/40-deployment/local-development.md:172-174`。
- CI gate ownership 与本地诊断矩阵并不完全相同：hosted backend/frontend/E2E gates 及 install boundaries 由 `docs/40-deployment/ci-gates.md:3-35` 定义。
