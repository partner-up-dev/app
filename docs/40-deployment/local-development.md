# Local Development Runtime

## Portless Entry

The default local development entry is portless-managed:

- ensure frontend and backend are available: `pnpm dev:ensure`
- foreground dev console: `pnpm dev:ensure --foreground`
- foreground single dev server: `pnpm dev:ensure --only frontend --foreground`
- fake CaoCao only: `pnpm dev:ensure --only caocao`
- fake WeChatPay only: `pnpm dev:ensure --only wechatpay`
- full stack: `pnpm dev:portless`
- frontend only: `pnpm dev:portless:frontend`
- backend only: `pnpm dev:portless:backend`

These root entries run through Node-based wrapper scripts so the same commands
work on macOS, Linux, and Windows. The wrapper preserves the Windows Git
OpenSSL PATH adjustment needed by portless without requiring PowerShell on
non-Windows environments.

Local app identity is stored in `portless.json`:

- `apps/frontend`: `partner-up`
- `apps/backend`: `api.partner-up`

Portless injects runtime origin and listener values through `PORTLESS_URL`,
`HOST`, and `PORT`. The frontend Vite config detects `PORTLESS_URL`, exposes
that value as `import.meta.env.VITE_API_URL`, and proxies `/api` to the backend
portless app by deriving the backend host from the active frontend portless
origin.

## LAN Mode

The default portless TLD is `.localhost`. LAN device debugging must run portless
in LAN mode, which forces `.local` routes:

```bash
pnpm dev:ensure --lan --ip <reachable-lan-ip>
```

For explicit LAN-mode launches, `scripts/portless.mjs` first honors
`PORTLESS_LAN_IP` or `--ip`, then makes a best-effort inference from the host's
default-route network interface. This keeps WSL LAN launches from depending on
portless's own auto-detection when the reachable address is the WSL subnet
address.

When a privileged proxy is involved, the elevated proxy and app registrations
must share one `PORTLESS_STATE_DIR`. VS Code LAN launch entries should set it
with an environment-neutral variable such as `${userHome}/.portless`; shell
users can set `PORTLESS_STATE_DIR` explicitly when they need to avoid a root/user
state split. If the other LAN device cannot route to the advertised address,
publish a reachable host LAN IP and forward TCP `443` into the dev environment,
or use a networking mode where the advertised IP is directly reachable.

## Local Fallbacks

Fixed local ports remain available for compatibility workflows through package
env files and helper scripts. They are local fallback inputs, while portless is
the default developer workflow.

When the frontend Vite dev server runs inside WSL against a Windows-mounted
repository path such as `/mnt/c/...` or `/mnt/f/...`, the frontend Vite config
enables polling for file watching. Projects stored directly in the WSL
filesystem such as `/home/<user>/...` keep Vite's normal watcher behavior.

The backend development script loads `apps/backend/.env` when the file exists,
so portless and fixed-port local backend starts share the same local runtime
inputs.

For local backend file uploads on WSL/Linux, set `IMAGES_DIR` and `AVATARS_DIR`
in `apps/backend/.env` to package-local paths under `apps/backend/.dev-server/`
instead of relying on the production `/mnt/oss` mount. The production FC runtime
continues to mount OSS at `/mnt/oss`; `IMAGES_DIR` is not currently passed by
`apps/backend/s.yaml`.

## Fake Providers

Fake integration servers use provider-scoped portless names under the app
namespace:

- CaoCao: `caocao.partner-up`
- WeChatPay: `wechatpay.partner-up`

They follow the active portless proxy mode. In LAN mode they are reachable as
`caocao.partner-up.local` and `wechatpay.partner-up.local`; in local-only mode
they use the same names under `.localhost`.

Use `pnpm dev:ensure --only caocao` or `pnpm dev:ensure --only wechatpay` to
start or reuse one fake provider without touching frontend/backend lifecycles.
VS Code fake-provider tasks use the same `--only` foreground ensure mode and
the `DEV_ENSURE_FOREGROUND_READY` readiness marker.

Non-production WeChatPay provider endpoints allow portless local hostnames
(`.localhost` and `.local`) in addition to raw loopback hosts and the official
WeChatPay API host. Production still requires the official WeChatPay API host.

## Agent And VS Code Runtime

Agents should use `pnpm dev:ensure` before browser or manual validation that
needs the local frontend/backend pair. The ensure command checks the stable
portless routes and starts only the missing services, which avoids duplicate
dev servers during repeated agent runs.

Human-facing terminal or VS Code workflows that need live dev-server output
should use `pnpm dev:ensure --foreground`. Foreground mode keeps the same stable
route contract, but starts the configured dev servers with inherited console
stdio and takes over existing routes so the current terminal owns the logs and
lifecycle. After the routes pass HTTP readiness, foreground mode prints
`DEV_ENSURE_FOREGROUND_READY`; VS Code background task problem matchers use that
marker to let debug launches continue while the dev-server task keeps running.
VS Code frontend launch tasks should scope foreground ensure to the frontend
with `--only frontend`; backend debug launches own the backend dev server
directly so compound frontend/backend debugging keeps separate task, process,
and debugger lifecycles.

System scenario tests are a separate local runtime. The `system-scenario`
Vitest project allocates isolated frontend and backend HTTP ports for the test
process, independent of the developer portless server.
