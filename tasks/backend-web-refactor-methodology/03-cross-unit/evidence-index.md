# Cross-unit Evidence Index

## Protocol

- `Fact` 可直接进入本 workstream freeze/baseline；`Open` 只能作为待 owner 判定的张力；`Command` 是当前 runtime observation。
- Confidence 评价“证据是否直接支持 claim”，不评价产品/实现是否理想。
- 所有命令工作目录均为 `/home/yyh/development/Anana/mvp-HA`。

| id | type | claim | source / command | result | confidence | recheck cost |
| --- | --- | --- | --- | --- | --- | --- |
| XU-001 | Fact | Backend owns domain rules, authoritative persistence, auth/session, jobs/outbox/notification/analytics/operation logs；Web owns route/page/browser orchestration。 | `docs/20-product-tdd/unit-topology.md:5-35` | 直接 owner statement。 | High | Low |
| XU-002 | Fact | Browser/Web caches、local state 与 share replay 非产品真相；canonical reads 提供跨 surface entity facts。 | `docs/20-product-tdd/system-state-and-authority.md:57-74` | 直接 authority rule。 | High | Low |
| XU-003 | Fact | Backend exports `AppType`，Web 以 `hc<AppType>()` 消费；runtime 仍经 HTTP。 | `docs/20-product-tdd/cross-unit-contracts.md:22-30` | 直接 typed HTTP contract。 | High | Low |
| XU-004 | Fact | Expected API errors use RFC 9457 Problem Details；Frontend branches on status + stable code，Backend owns localized explanation。 | `docs/20-product-tdd/cross-unit-contracts.md:80-91` | 直接 error contract。 | High | Low |
| XU-005 | Fact | OAuth handoff 使用 short-lived signed cookie + nonce，禁止 token 进入 route query；bootstrap/share 在 nonce pending 时受 gate。 | `docs/20-product-tdd/cross-unit-contracts.md:68-68`; `docs/30-unit-tdd/wechat-oauth-handoff.md:14-50` | Cross-unit 与 Unit TDD 一致。 | High | Low |
| XU-006 | Fact | PR durable status 集合固定，`FULL` 仅派生展示。 | `docs/10-prd/behavior/rules-and-invariants.md:67-75`; `docs/20-product-tdd/pr-lifecycle-contracts.md:5-12` | PRD/TDD 直接一致。 | High | Low |
| XU-007 | Fact | PR 只拥有一个 place mode；location/route 互斥。 | `docs/10-prd/behavior/rules-and-invariants.md:12-15`; `docs/20-product-tdd/pr-lifecycle-contracts.md:26-31` | PRD/TDD 直接一致。 | High | Low |
| XU-008 | Fact | PR preview facts 通过 `GET /api/pr/:id` canonical read 水合，不由 list caller 复制。 | `docs/20-product-tdd/pr-lifecycle-contracts.md:41-48` | 直接 focused contract。 | High | Low |
| XU-009 | Fact | `/e/:eventId` 是 canonical event landing；Form zero-candidate auto-create 是 system-owned `OPEN` PR；dummy 在 detail intent 前是 browser transient candidate。 | `docs/10-prd/behavior/rules-and-invariants.md:40-61`; `docs/20-product-tdd/event-context-contracts.md:19-38,49-66` | PRD/TDD 直接一致。 | High | Low |
| XU-010 | Fact | PR messages 只对 current active participants 可见；read marker 显式推进；operator system message 是独立 admin capability。 | `docs/10-prd/behavior/rules-and-invariants.md:95-96`; `docs/20-product-tdd/pr-messaging-contracts.md:13-36` | 直接行为与 contract。 | High | Low |
| XU-011 | Fact | Notification owns opportunities/waves/deliveries/jobs；`PR_MESSAGE` 每 unread wave 最多一次并在 dispatch revalidate。 | `docs/20-product-tdd/notification-contracts.md:18-29,62-112` | 直接 notification owner。 | High | Low |
| XU-012 | Fact | API success 不等价于 outbox/job 副作用已完成。 | `docs/20-product-tdd/cross-unit-contracts.md:133-138` | 直接 coordination assumption。 | High | Low |
| XU-013 | Fact | PR-attached commerce spine 为 PR Page -> `/order/new` -> Order Detail；PR attachment 与 quote/provider truth 分层。 | `docs/20-product-tdd/ecommerce-contracts.md:180-203,241-258,290-329` | 直接 commerce contract。 | High | Medium |
| XU-014 | Fact | Payment provider owns gateway lifecycle；Backend owns Order/Bill/local execution slot，不持久化 provider transaction mirror 作为产品真相。 | `docs/20-product-tdd/system-state-and-authority.md:113-118`; `docs/20-product-tdd/ecommerce-contracts.md:107-151` | 两份 owner 文档一致。 | High | Medium |
| XU-015 | Fact | PR public route/share/revisit 是产品承诺；canonical metadata 后端拥有，active share session/replay 前端拥有。 | `docs/10-prd/behavior/rules-and-invariants.md:184-194`; `docs/20-product-tdd/pr-lifecycle-contracts.md:74-88` | PRD/TDD 直接一致。 | High | Low |
| XU-016 | Fact | Staging/production DB evolution 与 recovery forward-only；migration 在 backend deploy 前。 | `docs/40-deployment/backend-runtime.md:130-145`; `docs/40-deployment/recovery.md:3-56`; `docs/40-deployment/rollout.md:15-29` | Deployment owners 一致。 | High | Low |
| XU-017 | Fact | Scale-to-zero delayed work 使用 DB jobs + external tick，不依赖 long-lived scheduler。 | `docs/20-product-tdd/unit-topology.md:63-68`; `docs/40-deployment/backend-runtime.md:147-180` | Product TDD 与 runtime owner 一致。 | High | Low |
| XU-018 | Fact | System scenario runtime 是 real browser/frontend/backend HTTP/isolated Postgres，并由 project lifecycle 管理。 | `docs/20-product-tdd/test-platform.md:61-99`; `docs/20-product-tdd/cross-unit-contracts.md:141-152` | 直接 test-platform contract。 | High | Low |
| XU-019 | Open | 匿名 create 行为在 PRD 与 Product TDD 间冲突。 | `docs/10-prd/behavior/rules-and-invariants.md:20-23`; `docs/10-prd/behavior/workflows/core-pr.md:4-11`; `docs/20-product-tdd/pr-lifecycle-contracts.md:17-25` | PRD: anonymous creates DRAFT；TDD: user create requires authenticated and publishes inline。 | High | Medium（owner decision + one journey） |
| XU-020 | Open | Domain response session payload 规则与 waitlist response 描述冲突。 | `docs/20-product-tdd/cross-unit-contracts.md:62-68`; `docs/20-product-tdd/pr-lifecycle-contracts.md:55-55` | 前者禁止 auth/accessToken/role/userId，后者写 refreshed view plus auth payload。 | High | Low（typed response + consumers） |
| XU-021 | Command | Environment/worktree snapshot。 | `git rev-parse HEAD`; `git branch --show-current`; `git status --short`; `node --version`; `pnpm exec node --version`; `pnpm --version`; `uname -srmo`; env file existence-only `stat` | HEAD `a8cf2d7c...`, `develop`, dirty worktree；shell Node 22.22.3，project Node 22.23.1，pnpm 11.13.0，WSL2；两 env files 存在。 | High | Low |
| XU-022 | Command | Format changed-scope 没有产生验证信号。 | `pnpm check:format` | exit 0, 2s；Biome checked 0 files。Result: NO-SIGNAL。 | High | Low |
| XU-023 | Command | Backend lint 当前通过；Biome 子层无 changed files。 | `pnpm check:lint:backend` | exit 0, 5s；Biome 0 files；AST structure 与 Problem Details lint 通过。 | High | Low |
| XU-024 | Command | Web lint 当前通过但有 report-only naming findings。 | `pnpm check:lint:web` | exit 0, 3s；token strict clean；2 medium weak-name findings；Biome 0 files。 | High | Low |
| XU-025 | Command | Backend/Web type lanes 当前通过。 | `pnpm check:type:backend`; `pnpm check:type:web` | exit 0 / 0；7s / 29s。 | High | Low |
| XU-026 | Command | Backend DB artifacts/config 当前一致。 | `pnpm check:config:backend` | exit 0, 4s；db lint pass；Drizzle check fine。 | High | Low |
| XU-027 | Command | Dead-code 当前被 native optional dependency 阻断。 | `pnpm check:dead-code` | exit 1, 2s；缺 `@oxc-parser/binding-linux-x64-gnu`，路径为 `oxc-parser@0.135.0`。 | High | Medium（dependency owner fix） |
| XU-028 | Command | Security report 当前未执行。 | `pnpm check:security` | exit 0, 1s；semgrep absent，明确 skip。Result: SKIPPED。 | High | Medium（具备 semgrep 的环境） |
| XU-029 | Command | Backend build 当前通过。 | `pnpm check:build:backend` | exit 0, 3s；backend + FC db-migrate bundles built。 | High | Low |
| XU-030 | Command | Web build 当前失败于 Vite/UnoCSS 的 oxc native binding。 | `pnpm check:build:web`; 根复核 session `88826` | definitive exit 1，约 28s；vue-tsc pass 后缺 `oxc-parser@0.124.0` binding。 | High | Medium（dependency owner fix） |
| XU-031 | Command | Backend/Web unit 当前通过。 | `pnpm test:unit:backend`; `pnpm test:unit:web` | exit 0 / 0；68 files/314 tests，38 files/162 tests；7s / 6s。 | High | Low |
| XU-032 | Command | Backend scenario 当前通过。 | `pnpm test:scenario:backend` | exit 0, 16s；26 files/82 tests。 | High | Medium |
| XU-033 | Command | System scenario 当前未进入 tests，frontend global setup 失败。 | `pnpm test:scenario:system`（一次重跑） | first exit 1, 7s, `EADDRINUSE:43925`；retry exit 1, 8s, missing `oxc-parser@0.124.0` binding。 | High | Medium（dependency fix 后重跑） |
| XU-034 | Command | Task-local markdown whitespace 自验。 | `git diff --check -- tasks/backend-web-refactor-methodology/03-cross-unit`; 对 untracked files 补充逐文件 `git diff --no-index --check -- /dev/null <file>` | requested command exit 0；补充检查 0 个 whitespace diagnostic files。 | High | Low |
| XU-035 | Command | Durable 引用存在且引用行号未越界。 | 只读 Node scanner：扫描本目录所有 `docs/**/*.md:<ranges>` 引用并对照文件行数 | 135 references；0 missing paths；0 invalid ranges。 | High | Low |
| XU-036 | Command | Gate 命令与结果一一对应。 | `rg` 核对 `verification-runtime-baseline.md` canonical matrix | 14 requested gates 对应 14 rows；PASS/FAIL/SKIPPED/NO-SIGNAL 明确区分。 | High | Low |

## Evidence Gaps

- 本轮未得到任何 system-scenario test assertion result；不能声称跨 browser/Postgres journey 通过。
- Security 是 skip，不是 clean report。
- Changed-scope format 与两条 Biome lint 子命令扫描 0 files；不能替代 all-repo baseline。
- 两个 Open question 必须由 durable owner 判定；当前实现只能作为 additional reality evidence，不能自行改写 intent。
