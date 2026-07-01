# Local Dev Workspace Alignment

## Objective & Hypothesis

Align human VSCode tasks and agent dev-server workflows so they use idempotent `dev:ensure` entries, migrate the design-system workspace into WSL-native storage, and make backend local file storage work without a production `/mnt/oss` mount.

## Guardrails Touched

- Preserve the `/mnt/f/...` source workspaces.
- Prefer `/home/yyh/development/Anana/*` as active WSL-native workspaces.
- Keep VSCode and agent startup paths converged on ensure-style scripts.
- Do not expose or rewrite local secrets while editing `.env` files.
- Keep production FC `/mnt/oss` mount behavior unchanged.

## Current Understanding

- `fake-caocao-server` from the old `/mnt/f/.../mvp-HA` workspace was running and has been stopped.
- MVP VSCode frontend dev-server tasks need foreground console ownership and can still be used as `preLaunchTask` when configured as background tasks with a readiness problem matcher.
- MVP VSCode backend launch configs are not prelaunch tasks; they are independent debug launch targets that own the backend dev-server process and debugger lifecycle.
- MVP backend launch configs currently start `dev:portless:backend` directly.
- MVP `dev:ensure` timed out earlier when a LAN-mode portless proxy was active and the command expected `.localhost`; explicit `--lan --ip ...` worked.
- Design repo uses root `dev:ensure` scripts for `design-web.partner-up`; its VSCode Histoire task should keep console output in the terminal.
- Backend image/avatar defaults use `/mnt/oss/...` on non-Windows unless `IMAGES_DIR` / `AVATARS_DIR` are set.
- `dev:ensure` default mode is still the agent/headless readiness helper.
- `dev:ensure --foreground` is the human/VSCode console mode. It takes over configured portless routes so the current terminal owns stdout/stderr and lifecycle, then prints `DEV_ENSURE_FOREGROUND_READY` after HTTP readiness for VS Code background task problem matchers.
- `dev:ensure --only frontend --foreground` is the VSCode frontend prelaunch shape; it must not start or take over the backend route.
- `dev:ensure --only caocao` and `dev:ensure --only wechatpay` should ensure fake provider routes independently, without touching frontend/backend lifecycles.

## Verification

- Old `/mnt/f/...` `fake-caocao-server` process: stopped.
- MVP `scripts/portless.mjs` and `scripts/ensure-dev-servers.mjs` now explicitly set non-LAN launches to `PORTLESS_LAN=0` and LAN launches to `PORTLESS_LAN=1`.
- MVP local VSCode frontend dev-server tasks now call root `pnpm run dev:ensure -- --only frontend --foreground`; LAN task calls `pnpm run dev:ensure -- --lan --ip 172.29.144.156 --only frontend --foreground`.
- MVP local VSCode frontend launch configs use those foreground background tasks as `preLaunchTask`, with problem matchers that end on `DEV_ENSURE_FOREGROUND_READY`.
- MVP `pnpm dev:ensure --foreground` foreground mode added.
- `pnpm dev:ensure --lan --ip 172.29.144.156 --foreground`: kept frontend/backend logs attached, printed `DEV_ENSURE_FOREGROUND_READY`, and served:
  - `https://partner-up.local/`: HTTP 200
  - `https://api.partner-up.local/health`: HTTP 200
- Foreground Ctrl+C smoke: stopped frontend/backend app routes without leftovers.
- Default headless `pnpm dev:ensure --lan --ip 172.29.144.156 --timeout-seconds=90 --poll-interval-seconds=2`: passed and exited after readiness.
- Corrected VSCode launch/task relationship:
  - `Backend` / `Backend(lan,wsl)` launch configs own backend dev-server startup directly.
  - `Frontend` / `Frontend(lan,mac)` prelaunch tasks start only frontend via `--only frontend`.
  - Simulated frontend prelaunch while backend route `api.partner-up.local` was already active at PID `1056945`: frontend route started, printed `DEV_ENSURE_FOREGROUND_READY`, and backend PID stayed unchanged.
- Corrected foreground VSCode task problem matchers:
  - `start-frontend-dev-server` and `start-frontend-dev-server:lan` now use a non-matching problem pattern (`a^`) so dev-server output does not create VSCode Problems.
  - Background readiness still ends on `DEV_ENSURE_FOREGROUND_READY`, so launch can continue without `Errors exist after running preLaunchTask`.
- `pnpm dev:ensure --lan --ip 172.29.144.156 --only backend --timeout-seconds=20 --poll-interval-seconds=2`: passed by reusing the active backend route.
- Fake provider ensure work:
  - Added `/health` readiness endpoints for fake Caocao and fake WeChatPay.
  - Added fake provider route definitions to `scripts/ensure-dev-servers.mjs`.
  - Updated VSCode `start-caocao-dev-server` / `start-wechatpay-dev-server` to use `dev:ensure --only ... --foreground` and non-problem-producing problem matchers.
  - Added LAN variants for both fake provider tasks.
- `pnpm dev:ensure --lan --ip 172.29.144.156 --only caocao --foreground`: printed `DEV_ENSURE_FOREGROUND_READY`; `curl -k -I https://caocao.partner-up.local/health` returned HTTP 200; validation route was stopped afterward.
- `pnpm dev:ensure --lan --ip 172.29.144.156 --only wechatpay --foreground`: printed `DEV_ENSURE_FOREGROUND_READY`; `curl -k -I https://wechatpay.partner-up.local/health` returned HTTP 200; validation route was stopped afterward.
- VSCode JSON and fake-provider problem matcher smoke checks passed; fake-provider task matchers do not turn normal dev-server output into VSCode Problems.
- MVP backend local `.env` now sets:
  - `IMAGES_DIR=.dev-server/mnt/oss/images`
  - `AVATARS_DIR=.dev-server/mnt/oss/avatars`
- MVP backend local storage dirs created under `apps/backend/.dev-server/mnt/oss/`.
- `pnpm check:type:backend`: passed.
- `pnpm check:type:frontend`: passed.
- `pnpm dev:ensure --lan --ip 172.29.144.156`: passed.
- `curl -k -I --max-time 5 https://partner-up.local/`: HTTP 200.
- `curl -k -I --max-time 5 https://api.partner-up.local/health`: HTTP 200.
- Design repo copied to `/home/yyh/development/Anana/design`, installed, foreground-mode updated, and verified. Details live in `/home/yyh/development/Anana/design/tasks/migrate-wsl-home-worktree/README.md`.
- Fake-provider validation routes were stopped after checks; `portless list` still shows the pre-existing frontend/backend/design routes.
- The root-owned LAN portless proxy remains running and still owns two old `avahi-publish-address` children for `partner-up.local` and `api.partner-up.local`. Non-interactive sudo is unavailable in this session, so stopping the root proxy requires a human terminal command if full cleanup is desired.

## Current Step

Summarize final state. Fake-provider validation routes are stopped; pre-existing frontend/backend/design routes are preserved.
