# Diagnose WSL Vite Watch

## Objective & Hypothesis

Observed reality: frontend DevServer does not reflect code changes in the browser after refresh; restarting the DevServer applies the changes.

Initial classification: `Reality`.

Active mode: `Diagnose`.

Leading hypothesis: Vite is running inside WSL against a repository stored on a Windows-mounted filesystem (`/mnt/f/...`), so native filesystem change events are not reliably delivered to Vite's watcher.

## Guardrails Touched

- Runtime/dev-environment behavior only.
- Frontend Vite dev server configuration may be touched if evidence supports a bounded fix.
- Existing dirty business changes under frontend/backend source are unrelated and must not be reverted.

## Current Understanding

- Repository path is `/mnt/f/CODING/Project/Anana/mvp-HA`, which is a Windows filesystem mount inside WSL.
- `apps/frontend/package.json` runs frontend development through `vite`.
- `apps/frontend/vite.config.ts` currently configures host, port, strict port, and API proxy under `server`, but does not configure `server.watch`.
- `scripts/portless.mjs` and `scripts/ensure-dev-servers.mjs` manage local routes/process launch, not Vite file watcher behavior.
- Vite official docs identify WSL2 file-change detection as a known condition and point to `server.watch.usePolling`.
- Microsoft WSL docs recommend storing Linux-tool projects in the WSL filesystem for fastest performance, and identify `/mnt/...` paths as mounted Windows drives.

## Confirmed Constraints

- Use `pnpm dev:ensure` / portless entrypoints for browser validation when local services are needed.
- Avoid touching unrelated dirty files.
- No durable modification without evidence.

## Verification

Evidence to collect or confirm:

- Official Vite documentation for WSL2 file watching and `server.watch.usePolling`: confirmed.
- Local Vite config absence of watcher polling before the fix: confirmed.
- Fix applied: `apps/frontend/vite.config.ts` enables `server.watch.usePolling` only when Vite runs inside WSL on a Windows-mounted `/mnt/<drive>/...` path.
- Durable runtime note added to `docs/40-deployment/environments.md`.
- Environment assertion under the current workspace:
  - `platform`: `linux`
  - `cwd`: `/mnt/f/CODING/Project/Anana/mvp-HA`
  - `/proc/version` includes `microsoft`
  - `shouldUsePolling`: `true`
- `pnpm check:type:frontend`: passed.
- `pnpm --filter @partner-up-dev/frontend exec vite build --outDir ../../.codex-tmp/frontend-vite-build --emptyOutDir true`: passed.
- `pnpm exec biome format apps/frontend/vite.config.ts docs/40-deployment/environments.md tasks/diagnose-wsl-vite-watch/00-task-packet.md`: passed for the checked TS file; Markdown files were not included by Biome in this invocation.
- Attempts to inspect resolved Vite config through `resolveConfig`, `loadConfigFromFile`, and `vite --debug config` did not produce a clean bounded output in this environment, so verification used the isolated environment assertion plus type/build checks.

## Next Step

Restart the frontend dev server once so the changed Vite config is loaded; subsequent edits under the current WSL `/mnt/f/...` workspace should be detected without server restarts.
