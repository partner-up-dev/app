# Backend Portless 8443 Diagnosis

## Objective & Hypothesis

Diagnose why the backend portless development route appears on port `8443` instead of the expected HTTPS default port `443`.

Initial hypothesis: portless owns the public HTTPS route while the backend process only listens on the injected `PORT`; `8443` may be a portless proxy/listener fallback caused by privileged-port binding, an existing listener on `443`, or tool-level configuration outside this repository.

## Guardrails Touched

- Input route: Reality
- Active mode: Diagnose
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

## Current Understanding

- Root `dev:portless:backend` invokes `scripts/portless.mjs --name api.partner-up -- pnpm --filter @partner-up-dev/backend dev`.
- `scripts/portless.mjs` delegates directly to the installed `portless` binary.
- `apps/backend` dev script loads `.env`; `.env.example` documents `PORT` as a fixed-port fallback when not managed by portless.
- Backend runtime listens on `env.PORT` and logs `http://localhost:${env.PORT}`.
- `scripts/ensure-dev-servers.mjs` checks public portless readiness via HTTPS on `127.0.0.1:443` with `Host: api.partner-up.localhost`.
- Current `443` is occupied by a LAN-mode `.local` portless proxy, not the current `.localhost` proxy.
- Current `.localhost` portless proxy is on `8443`, so backend's public `.localhost` route includes `:8443`; the backend child itself listens on `4430`.

## Confirmed Constraints

- Do not modify code during diagnosis without evidence.
- Do not expose local secrets from `.env`.

## Next Step

Likely cause is confirmed and remediated. Remaining code change is in `scripts/ensure-dev-servers.mjs`; it should prevent recurrence of the false-ready case where portless itself returns HTTP `404`.
