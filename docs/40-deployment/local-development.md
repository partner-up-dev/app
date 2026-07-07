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

- `apps/web`: `web-app`
- `apps/backend`: `api`

Portless injects runtime origin and listener values through `PORTLESS_URL`,
`HOST`, and `PORT`. The frontend Vite config detects `PORTLESS_URL`, exposes
that value as `import.meta.env.VITE_API_URL`, and proxies `/api` to the backend
portless app by deriving the backend host from the active frontend portless
origin. For example, `web-app.localhost` proxies `/api` to `api.localhost`, and
`web-app.partner-up.d.home.arpa` proxies to `api.partner-up.d.home.arpa`.

## LAN Mode

The default portless TLD is `.localhost`. LAN device debugging can run portless
in LAN mode, which uses `.local` routes unless an explicit TLD is provided:

```bash
pnpm dev:ensure --lan --ip <reachable-lan-ip>
```

Homelab DNS debugging should pass an explicit TLD instead of relying on mDNS:

```bash
PORTLESS_TLD=partner-up.d.home.arpa pnpm dev:ensure --lan --ip <reachable-lan-ip>
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

`pnpm dev:ensure` can optionally register ready routes in a Technitium DNS
server after portless readiness succeeds. The integration is off by default and
is configured by environment or CLI inputs:

```bash
TECHNITIUM_API_URL=http://<technitium-host>:5380 \
TECHNITIUM_API_TOKEN=<api-token> \
DEV_DNS_PROVIDER=technitium \
DEV_DNS_ZONE=partner-up.d.home.arpa \
PORTLESS_TLD=partner-up.d.home.arpa \
pnpm dev:ensure --lan --ip <reachable-lan-ip>
```

The DNS target IP comes from `--dns-ip`, `DEV_DNS_TARGET_IP`, `--ip`, or
`PORTLESS_LAN_IP`, in that order. DNS registration is warning-only by default;
set `DEV_DNS_STRICT=1` to fail the ensure command when registration fails.

For WSL-local resolution, set `DEV_HOSTS_SYNC=1` to write a managed
`PartnerUp dev hosts` block to `/etc/hosts`. This maps
`partner-up.d.home.arpa` and all known PartnerUp dev route hosts to
`DEV_HOSTS_IP`, defaulting to `127.0.0.1`. Set `DEV_HOSTS_STRICT=1` when a hosts
write failure should fail the ensure command.

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

- CaoCao: `caocao`
- WeChatPay: `wechatpay`

They follow the active portless proxy mode. In LAN mode they are reachable as
`caocao.local` and `wechatpay.local`; in local-only mode they use the same names
under `.localhost`. With `PORTLESS_TLD=partner-up.d.home.arpa`, they are
reachable as `caocao.partner-up.d.home.arpa` and
`wechatpay.partner-up.d.home.arpa`.

Use `pnpm dev:ensure --only caocao` or `pnpm dev:ensure --only wechatpay` to
start or reuse one fake provider without touching frontend/backend lifecycles.
VS Code fake-provider tasks use the same `--only` foreground ensure mode and
the `DEV_ENSURE_FOREGROUND_READY` readiness marker.

Non-production WeChatPay provider endpoints allow portless local hostnames
(`.localhost`, `.local`, and `.home.arpa`) in addition to raw loopback hosts and
the official WeChatPay API host. Production still requires the official
WeChatPay API host.

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
