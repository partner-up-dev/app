# 4-5.3 Legacy Facade Closure Evidence

## Resolution

Deleted:

- `apps/backend/src/services/WeChatAuthSessionService.ts`
- `apps/backend/src/services/WeChatLoginService.ts`

The current authority remains `WeChatOAuthService` plus the WeChat controller and OAuth handoff contract.
`WECHAT_AUTH_SESSION_SECRET` remains in active FC configuration and is not a deletion target.

## Closed Local Evidence

- The pre-deletion current source, scripts, tests, CI descriptors, package exports, and generated Backend bundle
  inventory found no consumer of either facade; post-deletion search remains clear. The current Backend package is
  private and exposes type-only `.` and `./contracts` surfaces.
- The bundle has only the application entry and Caocao callback-router entry. FC packaging copies the current
  `dist` directory, and `fc-start.sh` starts `dist/index.js`.
- The deploy workflow runs for `develop` and `master`; neither facade is a runtime export or deployment entry.
- Targeted current-tree search, Backend type/build, four OAuth return-target unit tests, three OAuth handoff scenario
  tests, and the Knip report agree. Knip's unused-file baseline drops from 30 to 28 after deletion.

## Retained Boundary

Historical Git refs contain old source snapshots, and this repository cannot prove that no manually retained external
artifact exists. Those are not current deployment consumers and are not a reason to keep an otherwise unreferenced
private source facade. This record makes no claim about their retirement.
