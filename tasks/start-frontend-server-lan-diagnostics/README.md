# start-frontend-server:lan diagnostics

## Objective & Hypothesis

Diagnose why VS Code task `start-frontend-dev-server:lan` starts Vite but
`pnpm dev:ensure -- --lan --ip 172.29.144.156 --only frontend --foreground`
times out waiting for the frontend portless route.

Initial hypothesis: the foreground Vite child is healthy, but
`scripts/ensure-dev-servers.mjs` cannot mark the portless route ready. The likely
failure point is either route registration discovery from `portless list` or the
HTTPS HEAD readiness probe to the registered route.

## Guardrails Touched

- Runtime reality route: `docs/00-meta/input-reality.md`
- Local development origin contract:
  `docs/20-product-tdd/cross-unit-contracts.md#11-local-development-origin-contract`
- Deployment runtime notes: `docs/40-deployment/environments.md`

## Verification

- Read `.vscode/tasks.json`, `scripts/ensure-dev-servers.mjs`,
  `scripts/portless.mjs`, `portless.json`, and relevant durable docs.
- Reproduce with bounded foreground timeout and inspect `portless list`.

Observed evidence:

- `pnpm dev:ensure -- --lan --ip 172.29.144.156 --only frontend --foreground`
  starts Vite successfully.
- During the run, `portless list` with `PORTLESS_STATE_DIR=/home/yyh/.portless`
  shows `https://partner-up.local -> localhost:<vite-port>`.
- Direct Vite readiness succeeds: `curl -I http://127.0.0.1:<vite-port>/`
  returns `200`.
- Portless readiness fails: `curl -k -I https://partner-up.local/` returns a
  portless `404` page saying no app is registered for `partner-up.local`.
- The actual process listening on `:443` is root-owned, while
  `/home/yyh/.portless/proxy.pid` points to a stale, different pid.

Likely cause:

- The active privileged portless proxy and the app registration command are not
  using the same state directory. The frontend route is written to
  `/home/yyh/.portless/routes.json`, but the root-owned proxy serving `:443`
  is not reading that same route store.

Implemented guardrail:

- `scripts/ensure-dev-servers.mjs` now prints timeout diagnostics when route
  readiness fails:
  - selected portless state directory
  - state proxy pid and best-effort listener pid(s)
  - per-route expected URL, registered URL, and HEAD readiness result
  - a likely portless state drift explanation when the route is registered but
    portless returns `404` with `x-portless`
  - manual recovery commands

Verification after implementation:

- `node --check scripts/ensure-dev-servers.mjs`
- `pnpm exec biome check scripts/ensure-dev-servers.mjs`
- Reproduced the LAN task with a short timeout and confirmed the failure now
  reports `registered: https://partner-up.local`, `HTTP 404, x-portless=1`,
  the stale state proxy pid, and the manual recovery command.
