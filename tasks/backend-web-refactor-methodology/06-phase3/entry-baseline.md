# Phase 3 Entry Baseline

> Planning snapshot before the large concurrent working-tree change. Slice 01's content digest, 465 Backend files,
> 404 Web files / 74,000 LOC and exact boundary fingerprints now live in
> `01-baseline-and-fitness/entry-delta.md`; do not treat the counts below as the current dirty-tree scope.

## Snapshot Identity

| Item | Current fact | Interpretation |
| --- | --- | --- |
| HEAD | `bda22b609e651f0daf6b36559d3fcdc283ac1fa1` | `feat(pr)!: migrate anchor event capabilities` |
| Backend production TS | 466 files / 51,506 LOC | Current comparison scope; LOC is not a quality score |
| Web production TS/Vue | 404 files / 76,220 LOC | Current comparison scope; excludes test/spec |
| Web route records | 43 | Current router `path:` count |
| Web transport tokens | `client.api=109`, `adminClient.api=78` | Text seam count, not endpoint count |
| External Backend `pr-core` consumers | 4 production files | Compatibility migration indicator |
| Worktree | package/lock/workspace modified; task dirs and root `vue` untracked | User/shared state; preserve |

## Current / Historical / Superseded

| State | Evidence |
| --- | --- |
| Current | PR Type Configuration, `/api/pr/authoring`, `/api/pr/discovery`, canonical `/prd`, ordinary PR create |
| Current | `05-toolchain-recovery`: both parser bindings load; Web build PASS; System 8/8, 33/33 PASS |
| Historical | `01`–`04` scale/topology snapshot at `a8cf2d7` |
| Superseded | Anchor Event identity, `/e/:eventId`, Event Form Mode owner and deleted repository/table evidence |
| Open | CF-01 anonymous DRAFT versus authenticated-first implementation/TDD |
| Open | CF-02 waitlist `auth payload` wording versus header-only runtime/session contract |

## Repeatable Commands

```bash
git rev-parse HEAD
git log -1 --oneline

find apps/backend/src -type f -name '*.ts' ! -name '*.test.ts' ! -name '*.spec.ts' -print | wc -l
find apps/backend/src -type f -name '*.ts' ! -name '*.test.ts' ! -name '*.spec.ts' -print0 |
  xargs -0 wc -l | tail -n 1

rg -n '^\s*path:' apps/web/src/app/router.ts | wc -l
rg -o '\bclient\.api\b' apps/web/src -g '*.{ts,vue}' -g '!**/*.{test,spec}.*' | wc -l
rg -o '\badminClient\.api\b' apps/web/src -g '*.{ts,vue}' -g '!**/*.{test,spec}.*' | wc -l
rg -l --glob '*.ts' --glob '!*.test.ts' --glob '!*.spec.ts' 'domains/pr-core' apps/backend/src | wc -l
```

Web files/LOC 使用 `02-web/evidence-index.md` 的 production inventory Node command 复跑，结果为
`404 / 76,220`；实际复核记录见 `verification-log.md`。

## Gate Interpretation

- `05-toolchain-recovery/verification-log.md` 是当前有效的 binding/Web build/System recovery 证据。
- `03-cross-unit/verification-runtime-baseline.md` 的 binding failures 是历史事实，不得继续作为 blocker。
- `check:dead-code` 仍是 PASS-WITH-FINDINGS/report-first；finding 不自动变成 Phase 3 失败。
- Security 未建立有效 Semgrep baseline；全仓 format 也没有当前有效 signal。任何后续报告必须继续写明。

## Drift Rule

每个 Execute slice 开始前重新记录 HEAD 与 focused status。若 HEAD 或 slice-owned paths 变化，先新建
该 slice 的 entry delta；不得用本页或旧 scorecard 假装当前基线未变。
