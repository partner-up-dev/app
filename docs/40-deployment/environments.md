# Environments

## Local Portless Development

The default local development entry is portless-managed:

- ensure frontend and backend are available: `pnpm dev:ensure`
- foreground dev console: `pnpm dev:ensure --foreground`
- foreground single dev server: `pnpm dev:ensure --only frontend --foreground`
- fake Caocao only: `pnpm dev:ensure --only caocao`
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

Fixed local ports remain available for compatibility workflows through package
env files and helper scripts. They are local fallback inputs, while portless is
the default developer workflow.

When the frontend Vite dev server runs inside WSL against a Windows-mounted
repository path such as `/mnt/c/...` or `/mnt/f/...`, the frontend Vite config
enables polling for file watching. This compensates for WSL file event delivery
limits on Windows filesystems. Projects stored directly in the WSL filesystem
such as `/home/<user>/...` keep Vite's normal watcher behavior.

Fake integration servers use provider-scoped portless names under the app
namespace:

- Caocao: `caocao.partner-up`
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

The backend development script loads `apps/backend/.env` when the file exists,
so portless and fixed-port local backend starts share the same local runtime
inputs.

For local backend file uploads on WSL/Linux, set `IMAGES_DIR` and `AVATARS_DIR`
in `apps/backend/.env` to package-local paths under `apps/backend/.dev-server/`
instead of relying on the production `/mnt/oss` mount. The production FC runtime
continues to mount OSS at `/mnt/oss`.

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
VS Code frontend launch tasks should scope foreground ensure to the frontend with
`--only frontend`; backend debug launches own the backend dev server directly so
compound frontend/backend debugging keeps separate task, process, and debugger
lifecycles.

System scenario tests are a separate local runtime. The `system-scenario` Vitest project
allocates isolated frontend and backend HTTP ports for the test process,
independent of the developer portless server.

## Backend Runtime

The backend is deployed to Aliyun Function Compute using Serverless Devs.

Current runtime facts:

- runtime: `custom.debian12`
- production FC HTTP server listens on port `3000`; backend local and test
  processes may override the listener through `PORT`
- backend code package is built into `apps/backend/.fc-package`
- production `node_modules` are delivered through a separate FC layer
- `BACKEND_COMMIT_HASH` is injected by deploy/runtime config so build metadata remains available without `.git`
- OSS is mounted at `/mnt/oss`
- timezone is `Asia/Shanghai`

## WeChat Notification Template Sources

Subscription-message template ids for confirmation-reminder / activity-start-reminder /
new-partner / meeting-point-updated / waitlist-promoted / pr-message
are supplied only through backend `config` rows:

- `wechat.submsg_confirmation_reminder_template_id`
- `wechat.submsg_activity_start_reminder_template_id`
- `wechat.submsg_new_partner_template_id`
- `wechat.submsg_meeting_point_updated_template_id`
- `wechat.submsg_waitlist_promoted_template_id`
- `wechat.submsg_pr_message_template_id`

Backend runtime sends WeChat reminders through subscription messages only.
Template ids are owned by the `config` table.

## Backend Deploy Environment Contract

Backend FC deployment validates required environment variables through
`scripts/ci/fc/validate_backend_env.sh` before it touches migration or runtime
deploy steps.

Required GitHub Environment secrets:

- `ALIBABA_CLOUD_ACCESS_KEY_ID`
- `ALIBABA_CLOUD_ACCESS_KEY_SECRET`
- `ALIBABA_CLOUD_ACCOUNT_ID`
- `DATABASE_URL`
- `DATABASE_URL_FOR_MIGRATION`
- `AUTH_JWT_SECRET`
- `WECHAT_OFFICIAL_ACCOUNT_APP_ID`
- `WECHAT_OFFICIAL_ACCOUNT_APP_SECRET`
- `WECHAT_AUTH_SESSION_SECRET`
- `JOB_RUNNER_INTERNAL_TOKEN`
- optional by feature: `LLM_API_KEY` is required when `LLM_BASE_URL` is set

Required GitHub Environment variables:

- `ALIYUN_FC_REGION`
- `ALIYUN_FC_DB_MIGRATION_FUNCTION_NAME`
- `ALIYUN_FC_FUNCTION_NAME`
- `ALIYUN_FC_ROLE_ARN`
- `ALIYUN_FC_RESOURCE_GROUP_ID`
- `ALIYUN_FC_NODE_MODULES_LAYER_NAME`
- `ALIYUN_FC_LOG_PROJECT`
- `ALIYUN_FC_LOG_STORE`
- `ALIYUN_FC_VPC_ID`
- `ALIYUN_FC_SECURITY_GROUP_ID`
- `ALIYUN_FC_VSWITCH_ID_PRIMARY`
- `ALIYUN_FC_VSWITCH_ID_SECONDARY`
- `ALIYUN_FC_OSS_ENDPOINT`
- `ALIYUN_FC_OSS_BUCKET`
- `ALIYUN_FC_OSS_BUCKET_PATH`
- `ALIYUN_FC_PATH`
- `FRONTEND_URL`
- `PAYMENT_NOTIFY_BASE_URL`

Optional GitHub Environment variables that are passed to backend runtime when
configured:

- `IMAGES_DIR`
- `WECHAT_OAUTH_CALLBACK_URL`

`AUTH_JWT_SECRET` must be at least 32 characters for staging and production
deploys. Optional runtime env vars may be left empty; backend startup treats
empty optional values as absent.

`PAYMENT_NOTIFY_BASE_URL` must be the public HTTPS backend API origin that
WeChatPay can reach for unauthenticated payment callbacks. Do not point it at
the frontend origin unless that origin also routes `/api/payment/*` to the
backend.

## CaoCao Callback Edge Routing

CaoCao order-status callbacks use a fixed callback URL configured on the CaoCao
side. When that registered URL cannot be changed quickly, route staging and
production through one public callback edge instead of asking CaoCao to switch
addresses during rollout.

New CaoCao orders must include a signed pass-through `callback_info` value:

```text
pu.rhc.v1.<routing-token>.<provider-instance-id>
```

Current routing tokens:

- `stg`: staging backend
- `prod`: production backend
- `dev`: local or non-shared development callbacks

The edge must preserve the original form body. `callback_info` participates in
CaoCao's callback signature, so the edge may read it only for routing and must
not rewrite, remove, or append form fields. The target backend still verifies
the CaoCao signature, validates that `callback_info` matches its own
environment, loads the concrete provider instance, resolves `ext_order_id`, and
checks the stored provider binding before mutating any RideHailing order state.

Plain URI-only nginx routing is insufficient for this topology because the
environment discriminator is in the POST form body. On `ec1.sz.partner-up.host`,
public ride-hailing traffic enters system nginx `1.20.1`; that nginx has no
enabled Lua/njs body-inspection module. The selected deployment shape is
therefore a backend-owned callback router behind an exact nginx location:

```nginx
location = /api/v1/service_provider/caocao/callback/order {
    client_max_body_size 16k;
    proxy_pass http://127.0.0.1:6080;
    proxy_set_header Host $host;
    include nginxconfig.io/proxy.conf;
}
```

The repo-owned implementation lives under the backend package:

- router entry: `apps/backend/src/scripts/ride-hailing/caocao-callback-router.ts`
- nginx snippet: `apps/backend/deploy/nginx/caocao-callback-router.location.conf`
- systemd template:
  `apps/backend/deploy/systemd/caocao-callback-router.service.example`

The router binds only to `127.0.0.1:6080`, accepts only
`POST /api/v1/service_provider/caocao/callback/order`, reads
`callback_info`, and forwards the original body to:

- `pu.rhc.v1.stg.*`: `https://test.api-app.partner-up.cn`
- `pu.rhc.v1.prod.*`: `https://api-app.partner-up.cn`
- missing `callback_info`: `https://api-app.partner-up.cn`
- present but invalid `callback_info`: `400 Bad Request`

During the compatibility window, callbacks with no `callback_info` may continue
to default to production if there are already CaoCao orders created before this
contract was deployed. New staging test orders must carry `stg` so the edge can
send them to staging and production data remains isolated.

## Environment Split

### `develop`

- deploy target: staging environment in GitHub Actions
- FC behavior: deploy to function `LATEST`
- migrations run before deploy

### `master`

- deploy target: production environment in GitHub Actions
- FC behavior: deploy to `LATEST`, then publish immutable function version, then update `production` alias
- migrations run before deploy
- backend GitHub Release is created only after production alias publication succeeds

## Database Environment Model

- schema source of truth: Drizzle entities + committed SQL artifacts
- forward-only schema/data migration model in staging and production
- migration execution happens through a dedicated FC migration function inside the VPC
- migration environment is controlled by `PARTNERUP_ENVIRONMENT`
- the runner defaults to `production` if no explicit environment is provided
- backend deploy maps `develop` to `staging` and `master` to `production`
- schema migrations are environment-neutral; only data migrations may declare
  `-- migration: environments=...`
- local development-only data migrations use `pnpm db:migrate:dev` or
  `pnpm db:reset:dev`

## Job Runner Trigger Environment

There is a separate FC deployment for the external job-runner trigger function:

- deployed from `apps/backend/fc-job-runner-trigger`
- calls the backend internal maintenance tick endpoint with cron expression
  `CRON_TZ=Asia/Shanghai 0 0/30 8-23 ? * ?`
- has its own GitHub Actions workflow and FC function name/URL variables

## Frontend Deployment Truth

The frontend is deployed to Aliyun ESA.

Current durable facts we can state:

- deployment target: Aliyun ESA
- repo deployment descriptor: `apps/frontend/esa.jsonc`
- frontend builds to `apps/frontend/dist`
- canonical hosted deploy workflow:
  `.github/workflows/frontend-esa-deploy.yml`
- canonical executable deploy path: `scripts/ci/esa/deploy_frontend.sh`
- backend runtime depends on `FRONTEND_URL` for share link generation
- WeChat OAuth callback defaults to the backend `/api/wechat/oauth/callback` URL inferred from the OAuth start request and forwarded public host / protocol headers

Required GitHub Environment secrets:

- `ALIBABA_CLOUD_ACCESS_KEY_ID`
- `ALIBABA_CLOUD_ACCESS_KEY_SECRET`
- `VITE_TENCENT_LBS_JS_KEY`

Required GitHub Environment variables:

- `VITE_API_URL`
- `ALIYUN_ESA_PROJECT_NAME`

Frontend deploys map `develop` to the GitHub `staging` environment and
`master` to the GitHub `production` environment. Each GitHub Environment should
point `ALIYUN_ESA_PROJECT_NAME` at its own ESA project. The deploy script always
publishes to ESA environment `production` inside the selected project.

Frontend GitHub Releases are created only after successful `master` production
ESA deployment. The general Release Please workflow still owns frontend release
PRs and source release metadata updates, but it skips frontend GitHub Release
creation.
