# Migrate WSL Home Worktree

## Objective & Hypothesis

Move a usable copy of the current PartnerUp MVP-HA workspace from the Windows-mounted WSL path `/mnt/f/CODING/Project/Anana/mvp-HA` to the WSL-native path `/home/yyh/development/Anana/mvp-HA`.

Hypothesis: keeping the active development worktree on the WSL filesystem removes the Vite/HMR file-event limitation seen on `/mnt/f`, while preserving the `/mnt/f` copy as requested.

## Guardrails Touched

- Source `/mnt/f/...` workspace must be preserved.
- New `/home/...` workspace should preserve current source state, `.git`, and local env files.
- Dependencies should be reinstalled in the new location rather than copied from the Windows-mounted workspace.
- Dev server validation must use repository dev workflow (`pnpm dev:ensure` / portless).

## Verification

- Copy completed without overwriting an existing target.
- `.git`, local env files, and current working tree state were preserved.
- `node_modules`, `.codex-tmp`, `dist`, `build`, and browser/runtime caches were not copied.
- `pnpm install --frozen-lockfile`: passed in `/home/yyh/development/Anana/mvp-HA`.
- `pnpm check:type:frontend`: passed.
- `pnpm check:type:backend`: passed.
- Initial `pnpm dev:ensure` inherited/used an active LAN-mode portless proxy while waiting for default `.localhost` routes, so it timed out despite starting services.
- `pnpm dev:ensure --lan --ip 172.29.144.156`: passed.
- `curl -k -I --max-time 5 https://partner-up.local/`: HTTP 200.
- `curl -k -I --max-time 5 https://api.partner-up.local/health`: HTTP 200.
- New workspace watcher condition assertion:
  - `cwd`: `/home/yyh/development/Anana/mvp-HA`
  - `isWsl`: `true`
  - `isWindowsMount`: `false`
  - `shouldUsePolling`: `false`
- Active portless routes:
  - frontend: `https://partner-up.local` -> `localhost:4514`
  - backend: `https://api.partner-up.local` -> `localhost:4155`

## Current Step

Migration validated. Use `/home/yyh/development/Anana/mvp-HA` as the WSL-native development workspace.
