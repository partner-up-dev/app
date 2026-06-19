# Backend Portless 8443 Diagnosis

## Objective & Hypothesis

Diagnose why the backend portless development route appears on port `8443` instead of the expected HTTPS default port `443`, then restore a LAN-capable `.local` workflow for debugging the WSL-hosted app from another LAN device.

Initial hypothesis: portless owns the public HTTPS route while the backend process only listens on the injected `PORT`; `8443` may be a portless proxy/listener fallback caused by privileged-port binding, an existing listener on `443`, or tool-level configuration outside this repository.

## Guardrails Touched

- Input route: Reality
- Active mode: Diagnose -> Execute
- Durable owners inspected: `docs/40-deployment/environments.md`, `docs/20-product-tdd/cross-unit-contracts.md`
- Runtime owners inspected: `portless.json`, `scripts/portless.mjs`, `scripts/ensure-dev-servers.mjs`, `apps/backend/package.json`, `apps/backend/src/lib/env.ts`, `apps/backend/src/index.ts`

## Verification

- Repository contract:
  - `scripts/ensure-dev-servers.mjs` probes `.localhost` routes through HTTPS on `127.0.0.1:443`.
  - `docs/40-deployment/environments.md` says portless injects `PORTLESS_URL`, `HOST`, and `PORT`; backend reads `PORT`.
- Tool/runtime evidence:
  - `portless --version`: `0.13.0`.
  - `portless list` currently returns `https://api.partner-up.localhost:8443 -> localhost:4430`.
  - `portless get api.partner-up` returns `https://api.partner-up.localhost:8443`.
  - Active proxy processes include:
    - root-owned `portless proxy start --foreground --port 443 --https --lan --ip ... --skip-trust`
    - user-owned `portless proxy start --foreground --port 8443 --https --skip-trust`
  - Active listeners include `*:443`, `*:8443`, and backend child `*:4430`.
  - `https://api.partner-up.localhost:8443/health` returns backend JSON.
  - `http://127.0.0.1:4430/health` returns backend JSON.
  - `https://api.partner-up.localhost/health` on default port `443` returns portless 404.
  - `https://api.partner-up.local/health` on default port `443` returns backend JSON from the LAN-mode proxy.
- Follow-up operation on 2026-06-18:
  - `sudo -n kill -TERM 5967` failed because sudo requires a password.
  - `portless proxy stop -p 443` detected the root-owned proxy and failed because sudo requires a terminal/password.
  - A mistaken `portless proxy stop --help` invocation stopped the user-owned `8443` proxy because this CLI treats it as `proxy stop`.
  - Restored the user-owned proxy with `portless proxy start -p 8443 --https --skip-trust`.
  - Final verification: root `443` LAN proxy remains, user `8443` proxy is running, and `https://api.partner-up.localhost:8443/health` returns backend JSON.
- Follow-up operation on 2026-06-19:
  - Stopped the root-owned LAN proxy process on `443` with sudo.
  - Stopped the user-owned `8443` proxy.
  - Restarted the `443` proxy with explicit user state: `PORTLESS_STATE_DIR=/home/yyh/.portless`.
  - Confirmed no `avahi-publish-address` partner-up `.local` processes remain.
  - Confirmed active `.localhost` routes are now served without `:8443`.
  - Confirmed `https://api.partner-up.localhost/health` returns HTTP `200`.
  - Confirmed a missing `.localhost` host still returns portless HTTP `404`.
  - Fixed `scripts/ensure-dev-servers.mjs` so readiness:
    - parses the actual registered URL from `portless list`, including optional fallback ports
    - probes frontend `/` and backend `/health`
    - sends the path to `https.request`
    - accepts only `2xx`/`3xx`, preventing portless route-miss `404` from passing
  - Verification passed:
    - `node --check scripts/ensure-dev-servers.mjs`
    - `pnpm exec biome format --write scripts/ensure-dev-servers.mjs`
    - `pnpm dev:ensure --timeout-seconds=30 --poll-interval-seconds=2`
- Follow-up diagnosis on 2026-06-19 for LAN/state mismatch:
  - Active root proxy process:
    - `root ... /usr/bin/portless proxy start --foreground --port 443 --https --lan --ip 172.29.144.156 --skip-trust`
  - Active listeners include `*:443` and `*:80`.
  - User-visible route state:
    - `portless list` under `yyh` initially showed only `https://design-web.localhost -> localhost:4805`.
    - `/home/yyh/.portless/routes.json` is the user route store.
  - Non-user route state:
    - `/var/lib/portless-mvp-ha/routes.json` exists and is `[]`.
    - The active root proxy responds on `443`, but does not see routes registered into `/home/yyh/.portless/routes.json`.
    - `sudo -n` is unavailable, so the exact active root proxy state dir (`/root/.portless` vs `/var/lib/portless-mvp-ha`) could not be confirmed from `/proc/500336/fd`.
  - Reproduction:
    - `pnpm dev:ensure --timeout-seconds=20 --poll-interval-seconds=2` started frontend/backend wrappers but timed out.
    - The wrappers registered:
      - `api.partner-up.localhost -> localhost:4438`
      - `partner-up.localhost -> localhost:4336`
      in `/home/yyh/.portless/routes.json`.
    - Direct app probes succeeded:
      - `http://127.0.0.1:4438/health` returned HTTP `200`.
      - `http://127.0.0.1:4336/` returned HTTP `200`.
    - Public proxy probes failed:
      - `https://api.partner-up.localhost/health` returned portless HTTP `404`.
      - `https://partner-up.localhost/` returned portless HTTP `404`.
    - The 404 pages said no app was registered for those hostnames, confirming the active proxy was not reading the user route store.
  - Exact reported error reproduced:
    - `PORTLESS_LAN=1 portless --name api.partner-up --force -- pnpm --filter @partner-up-dev/backend dev`
    - Result: `Proxy is already running on port 443 with a different config. - requested LAN mode, but the running proxy is not using LAN mode`
  - `portless proxy start --https --lan --ip 172.29.144.156` also reproduced a config mismatch:
    - requested LAN mode vs non-LAN
    - requested LAN IP `172.29.144.156` vs auto-detected LAN mode
    - requested HTTPS vs HTTP
  - Source read from installed `portless@0.13.0`:
    - without `PORTLESS_STATE_DIR`, app runs resolve the route store to `USER_STATE_DIR` (`~/.portless`).
    - proxy discovery can notice a listener on `443`, but then reads current proxy config markers from the resolved user state dir.
    - because the active `443` proxy is root-side while the app run uses user state, marker lookup from `~/.portless` reports the wrong LAN/TLS state.
  - Cleanup:
    - Stopped only the frontend/backend process groups created by this diagnostic run.
    - Confirmed `portless list` returned to only `design-web.localhost`.
- LAN hard-constraint implementation on 2026-06-19:
  - User constraint: the development workflow must use `.local`; falling back to `.localhost` is not acceptable because the frontend must be opened from another LAN device.
  - Updated `scripts/ensure-dev-servers.mjs` to:
    - accept `--lan` and `--ip <address>` as ensure-level inputs
    - expect `partner-up.local` and `api.partner-up.local` when `PORTLESS_LAN=1` or `--lan` is used
  - Updated `apps/frontend/vite.config.ts` so the Vite `/api` proxy derives the backend portless host and proxy port from the actual frontend `PORTLESS_URL`, producing `api.partner-up.local` in LAN mode and preserving fallback ports such as `:1355`.
  - Static verification passed:
    - `node --check scripts/portless.mjs`
    - `node --check scripts/ensure-dev-servers.mjs`
    - `pnpm exec biome check scripts/portless.mjs scripts/ensure-dev-servers.mjs apps/frontend/vite.config.ts`
    - `pnpm check:type:frontend`
  - Runtime verification:
    - With `PORTLESS_STATE_DIR=/mnt/f/CODING/Project/Anana/mvp-HA/.codex-tmp/portless-lan-test`, `PORTLESS_PORT=1355`, and LAN mode, portless registered `.local` routes but public requests returned portless `404`; the route file existed, so the likely cause is unreliable `fs.watch` route-cache refresh on the mounted Windows workspace path.
    - With `PORTLESS_STATE_DIR=/home/yyh/.portless-codex-lan-test`, `PORTLESS_PORT=1355`, and `pnpm dev:ensure --lan --ip 172.29.144.156 --timeout-seconds=60 --poll-interval-seconds=2`, readiness passed for:
      - `https://partner-up.local`
      - `https://api.partner-up.local`
    - `portless list` under that state showed:
      - `https://api.partner-up.local:1355 -> localhost:4771`
      - `https://partner-up.local:1355 -> localhost:4817`
    - HTTP verification passed through the temporary proxy:
      - `https://partner-up.local:1355/` returned HTTP `200`.
      - `https://api.partner-up.local:1355/health` returned backend health JSON.
      - `https://partner-up.local:1355/api/meta/build` returned backend JSON through the frontend Vite `/api` proxy.
    - Cleaned up the temporary `1355` proxy, frontend/backend dev process groups, and `/home/yyh/.portless-codex-lan-test`.
- Environment-neutral correction on 2026-06-19:
  - User rejected repo-level Linux path assumptions in scripts and set the acceptance bar to VS Code `All(mac)`.
  - External research:
    - portless official docs say LAN mode uses `--lan`, `.local`, optional `--ip`, and `PORTLESS_LAN=1`; Vite hosts are handled through `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS`.
    - portless GitHub issue #258 documents the auto-sudo split where the elevated proxy writes `/root/.portless` while app routes are registered in user `~/.portless`; the workaround is to export `PORTLESS_STATE_DIR=$HOME/.portless` before running portless.
  - Reverted script-level defaulting of `PORTLESS_STATE_DIR`; `scripts/portless.mjs` again only forwards the caller environment.
  - Kept `scripts/ensure-dev-servers.mjs --state-dir <path>` as an explicit caller-controlled override.
  - Updated `.vscode/launch.json`:
    - ordinary `Backend` no longer forces LAN mode, keeping `All` aligned with `.localhost`.
    - added `Backend(mac)` with `PORTLESS_LAN=1` and `PORTLESS_STATE_DIR=${userHome}/.portless`.
    - changed `All(mac)` to launch `Backend(mac)` plus `Frontend(mac)`.
  - Updated `.vscode/tasks.json`:
    - `start-frontend-dev-server:lan` now sets `PORTLESS_LAN=1` and `PORTLESS_STATE_DIR=${userHome}/.portless`.
    - `start-portless-proxy:lan` no longer hardcodes the WSL IP and also uses `${userHome}/.portless`.
  - Validation:
    - Parsed local VS Code JSONC config: `All(mac)` resolves to `Backend(mac),Frontend(mac)`.
    - Confirmed `Backend(mac)` and `start-frontend-dev-server:lan` both inject `PORTLESS_STATE_DIR=${userHome}/.portless`.
    - `node --check scripts/portless.mjs` passed.
    - `node --check scripts/ensure-dev-servers.mjs` passed.
    - `pnpm exec biome check scripts/portless.mjs scripts/ensure-dev-servers.mjs apps/frontend/vite.config.ts` passed.
    - `pnpm check:type:frontend` passed.
    - Runtime validation with temporary caller-controlled state passed:
      - `PORTLESS_PORT=1355 pnpm dev:ensure --lan --ip <current-lan-ip> --state-dir <tmp-state> --timeout-seconds=75 --poll-interval-seconds=2`
      - readiness reported `https://partner-up.local` and `https://api.partner-up.local`
      - `https://partner-up.local:1355/api/meta/build` returned backend build JSON through the frontend Vite `/api` proxy.
    - Cleaned up the temporary `1355` proxy, frontend/backend dev process groups, and temporary state directory.
- WSL LAN IP correction on 2026-06-19:
  - User supplied the missing network-layer fact: in this WSL environment, the reachable LAN-mode address is the WSL subnet address `172.29.144.156`.
  - Confirmed `hostname -I` and `ip -4 addr show scope global` report `eth0 = 172.29.144.156/20`.
  - Updated `scripts/portless.mjs` so explicit LAN mode honors caller-provided `PORTLESS_LAN_IP` / `--ip` first, then makes a best-effort inference from the default-route network interface when no IP was supplied.
  - Updated local, gitignored VS Code config for acceptance:
    - `Backend(mac)` sets `PORTLESS_LAN=1`, `PORTLESS_LAN_IP=172.29.144.156`, and `PORTLESS_STATE_DIR=${userHome}/.portless`.
    - `Frontend(mac)` keeps `https://partner-up.local` and its prelaunch task now sets the same LAN IP and state dir.
    - `All(mac)` launches `Backend(mac)` plus `Frontend(mac)`.
  - Updated durable docs to record the explicit-LAN-IP override and wrapper inference behavior without hard-coding this machine's address into tracked contracts.
  - Validation:
    - `PORTLESS_PORT=1355 pnpm dev:ensure --lan --state-dir <tmp-state> --timeout-seconds=75 --poll-interval-seconds=2` passed without `--ip`.
    - `portless list` under the temporary state showed:
      - `https://api.partner-up.local:1355 -> localhost:4840`
      - `https://partner-up.local:1355 -> localhost:4297`
    - `https://partner-up.local:1355/api/meta/build` returned backend build JSON through the frontend Vite `/api` proxy.
    - Confirmed no active routes remain on the temporary proxy and manually cleared the temporary app process groups after the runtime check.
- Fake integration LAN bleed diagnosis on 2026-06-19:
  - User observed `fake-caocao.local (LAN: 172.29.144.156)` even though the VS Code task did not set `PORTLESS_LAN=1`.
  - Confirmed `/home/yyh/.portless/proxy.tld` is `local`, `/home/yyh/.portless/proxy.lan` is `172.29.144.156`, and the active proxy process is `portless proxy start --foreground --port 443 --https --lan --ip 172.29.144.156 --skip-trust`.
  - Confirmed `routes.json` registered `fake-caocao.local` into the same LAN proxy state as `partner-up.local` and `api.partner-up.local`.
  - Read installed `portless@0.13.0` behavior: when an app starts and discovers a running proxy, it adopts the running proxy's `tld` and `lanIp`; omitting `PORTLESS_LAN=1` on the app task is insufficient to keep it local-only.
  - Updated `scripts/portless.mjs` with `--project-local`, which forces `PORTLESS_LAN=0`, clears `PORTLESS_LAN_IP`, sets `.localhost`, and uses an isolated project state on local proxy port `9443`.
  - Updated root scripts so `dev:portless:fake-caocao` and `dev:portless:fake-wechatpay` use `--project-local`.
  - Updated fake WeChatPay CLI to print `PORTLESS_URL` as its `endpointBaseUrl`, matching fake Caocao.
  - Updated the dev Caocao fixture endpoint to `https://fake-caocao.localhost:9443`.
  - Validation:
    - `node --check scripts/portless.mjs && node --check scripts/ensure-dev-servers.mjs` passed.
    - `pnpm exec biome check scripts/portless.mjs scripts/ensure-dev-servers.mjs apps/frontend/vite.config.ts packages/fake-wechatpay-server/bin/fake-wechatpay-server.ts` passed.
    - `pnpm --filter @partner-up-dev/fake-wechatpay-server typecheck` passed.
    - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck` passed.
    - With the primary 443 LAN proxy still active, temporary `PORTLESS_LOCAL_STATE_DIR` and `PORTLESS_LOCAL_PORT=1456` launched both fake scripts as `.localhost`:
      - `https://fake-caocao.localhost:1456 -> localhost:4016`
      - `https://fake-wechatpay.localhost:1456 -> localhost:4212`
    - Both fake CLIs printed `.localhost:1456` `endpointBaseUrl` values and raw `listenOrigin` ports.
    - Cleaned up the temporary local-only proxy and fake process groups.
- Fake integration naming correction on 2026-06-19:
  - User rejected the `9443` local-only proxy approach.
  - Reverted the fake Caocao `--project-local` behavior and removed the `9443` endpoint.
  - Kept the new fake WeChatPay portless script, but aligned it with the normal fake Caocao portless behavior.
  - Updated fake provider portless names to provider-scoped app names:
    - `caocao.partner-up`, yielding `https://caocao.partner-up.local` in LAN mode.
    - `wechatpay.partner-up`, yielding `https://wechatpay.partner-up.local` in LAN mode.
  - Updated the dev Caocao fixture endpoint to `https://caocao.partner-up.local`.
  - Updated non-production WeChatPay endpoint validation to allow portless local hostnames (`.localhost` and `.local`) while keeping production restricted to the official WeChatPay API host.
  - Validation:
    - `node --check scripts/portless.mjs && node --check scripts/ensure-dev-servers.mjs` passed.
    - `pnpm exec biome check scripts/portless.mjs scripts/ensure-dev-servers.mjs apps/frontend/vite.config.ts apps/backend/src/domains/payment/services/payment-provider.ts apps/backend/src/domains/payment/services/payment-provider.test.ts packages/fake-wechatpay-server/bin/fake-wechatpay-server.ts` passed.
    - `pnpm --filter @partner-up-dev/backend typecheck` passed.
    - `pnpm --filter @partner-up-dev/fake-wechatpay-server typecheck` passed.
    - `pnpm vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/domains/payment/services/payment-provider.test.ts` passed.
    - Runtime check under the active LAN proxy passed:
      - `https://caocao.partner-up.local -> localhost:4653`
      - `https://wechatpay.partner-up.local -> localhost:4099`
      - Both fake CLIs printed matching `.partner-up.local` `endpointBaseUrl` values.
    - Cleaned up the runtime-check fake process groups.
    - Cleaned up the stale 9443 fake Caocao process/proxy left from the rejected `--project-local` attempt.

## Current Understanding

- Root `dev:portless:backend` invokes `scripts/portless.mjs --name api.partner-up -- pnpm --filter @partner-up-dev/backend dev`.
- `scripts/portless.mjs` delegates directly to the installed `portless` binary.
- `apps/backend` dev script loads `.env`; `.env.example` documents `PORT` as a fixed-port fallback when not managed by portless.
- Backend runtime listens on `env.PORT` and logs `http://localhost:${env.PORT}`.
- `scripts/ensure-dev-servers.mjs` checks public portless readiness via HTTPS on `127.0.0.1:443` with `Host: api.partner-up.localhost`.
- Current `443` is occupied by a LAN-mode `.local` portless proxy, not the current `.localhost` proxy.
- Current `.localhost` portless proxy is on `8443`, so backend's public `.localhost` route includes `:8443`; the backend child itself listens on `4430`.
- Current follow-up understanding:
  - The immediate failing state is a split brain between:
    - active `443` root-side proxy state: exact dir not readable without sudo; `/var/lib/portless-mvp-ha` exists and `/root/.portless` is also possible
    - user app route state: `/home/yyh/.portless`
  - The app processes can start and listen on injected ports, but the public `.localhost` hosts fail because the active proxy reads a different `routes.json`.
  - The "running proxy is not using LAN mode" text is misleading in this state: the process argv shows the active root proxy was launched with `--lan --ip 172.29.144.156`; the mismatch text comes from reading proxy markers from the wrong state dir.
- LAN access requires two independent layers:
  - portless/application layer: proxy and app registrations must share one `PORTLESS_STATE_DIR`, and route URLs/Host headers must be `.local`.
  - launch layer: `All(mac)` must set `PORTLESS_STATE_DIR` explicitly through VS Code variables instead of requiring repo scripts to infer an OS/user path.
  - network layer: the IP published for `.local` must be reachable from the mac mini; when auto-detection picks an unreachable address, use portless `--ip` / `PORTLESS_LAN_IP` outside the repo contract. In this WSL environment, the intended address is `172.29.144.156`.
  - fake integration layer: fake third-party providers can follow the active portless proxy mode when they use provider-scoped app names under `partner-up`; the accepted LAN hostnames are `caocao.partner-up.local` and `wechatpay.partner-up.local`.

## Confirmed Constraints

- Do not modify code during diagnosis without evidence.
- Do not expose local secrets from `.env`.
- `.local` LAN mode is a hard user constraint for this workflow.

## Next Step

Likely cause is confirmed: portless state ownership is split between the root LAN proxy and user app registrations.

The clean remediation should make the active proxy and all app registrations use one state dir and one TLD mode.

Operational next step:

1. Use VS Code `All(mac)` as the acceptance path; it now injects LAN mode, the WSL LAN IP, and a shared `${userHome}/.portless` state dir.
2. If portless reports a 443 config mismatch, stop the stale proxy first, then launch `All(mac)` again.
3. Restart any fake integration tasks that were started with old names; old `fake-*.local` routes remain until those old processes stop.
