# Environments

## Local Portless Development

The default local development entry is portless-managed:

- full stack: `pnpm dev:portless`
- frontend only: `pnpm dev:portless:frontend`
- backend only: `pnpm dev:portless:backend`

Local app identity is stored in `portless.json`:

- `apps/frontend`: `partner-up`
- `apps/backend`: `api.partner-up`

Portless injects runtime origin and listener values through `PORTLESS_URL`,
`HOST`, and `PORT`. The frontend Vite config detects `PORTLESS_URL`, exposes
that value as `import.meta.env.VITE_API_URL`, and proxies `/api` to the backend
portless app with `Host: api.partner-up.localhost`.

Fixed local ports remain available for compatibility workflows through package
env files and helper scripts. They are local fallback inputs, while portless is
the default developer workflow.

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
