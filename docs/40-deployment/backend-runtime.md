# Backend Runtime

## Backend FC Runtime

The backend is deployed to Aliyun Function Compute using Serverless Devs.

Current runtime facts:

- runtime: `custom.debian12`
- production FC HTTP server listens on port `3000`; backend local and test
  processes may override the listener through `PORT`
- backend code package is built into `apps/backend/.fc-package`
- production `node_modules` are delivered through a separate FC layer
- `BACKEND_COMMIT_HASH` is injected by deploy/runtime config so build metadata
  remains available without `.git`
- OSS is mounted at `/mnt/oss`
- timezone is `Asia/Shanghai`

Evidence anchors:

- workflow: `.github/workflows/backend-fc-deploy.yml`
- validator: `scripts/ci/fc/validate_backend_env.sh`
- runtime template: `apps/backend/s.yaml`
- migration template: `apps/backend/fc-db-migrate/s.yaml`

## Backend Deploy Environment Contract

Backend FC deployment validates required environment variables through
`scripts/ci/fc/validate_backend_env.sh` before it touches migration or runtime
deploy steps.

### Deploy Credentials

| Variable | GitHub source | Required by | Runtime destination |
| --- | --- | --- | --- |
| `ALIBABA_CLOUD_ACCESS_KEY_ID` | secret | validator / deploy scripts | Aliyun CLI / Serverless Devs credential |
| `ALIBABA_CLOUD_ACCESS_KEY_SECRET` | secret | validator / deploy scripts | Aliyun CLI / Serverless Devs credential |
| `ALIBABA_CLOUD_ACCOUNT_ID` | secret | validator / deploy scripts | Aliyun CLI / Serverless Devs credential |
| `ALIYUN_FC_REGION` | variable | validator / templates | Serverless Devs region |

### Backend FC Deploy Variables

| Variable | GitHub source | Required by | Runtime destination |
| --- | --- | --- | --- |
| `ALIYUN_FC_FUNCTION_NAME` | variable | validator / `apps/backend/s.yaml` | FC function name |
| `ALIYUN_FC_ROLE_ARN` | variable | validator / templates | FC role |
| `ALIYUN_FC_RESOURCE_GROUP_ID` | variable | validator / templates | FC resource group |
| `ALIYUN_FC_NODE_MODULES_LAYER_NAME` | variable | validator / layer scripts | layer lookup / publish |
| `ALIYUN_FC_NODE_MODULES_LAYER_ARN` | resolved by deploy script | `apps/backend/s.yaml` | backend FC layer |
| `ALIYUN_FC_LOG_PROJECT` | variable | validator / `apps/backend/s.yaml` | FC log config |
| `ALIYUN_FC_LOG_STORE` | variable | validator / `apps/backend/s.yaml` | FC log config |
| `ALIYUN_FC_VPC_ID` | variable | validator / templates | VPC config |
| `ALIYUN_FC_SECURITY_GROUP_ID` | variable | validator / templates | VPC config |
| `ALIYUN_FC_VSWITCH_ID_PRIMARY` | variable | validator / templates | VPC config |
| `ALIYUN_FC_VSWITCH_ID_SECONDARY` | variable | validator / templates | VPC config |
| `ALIYUN_FC_OSS_ENDPOINT` | variable | validator / `apps/backend/s.yaml` | OSS mount |
| `ALIYUN_FC_OSS_BUCKET` | variable | validator / `apps/backend/s.yaml` | OSS mount |
| `ALIYUN_FC_OSS_BUCKET_PATH` | variable | validator / `apps/backend/s.yaml` | OSS mount |
| `ALIYUN_FC_PATH` | variable | validator / `apps/backend/s.yaml` | backend runtime `PATH` |

### Backend Runtime Variables

| Variable | GitHub source | Required by validator | FC runtime destination |
| --- | --- | --- | --- |
| `DATABASE_URL` | secret | yes | `DATABASE_URL` |
| `BACKEND_COMMIT_HASH` | `github.sha` | yes | `BACKEND_COMMIT_HASH` |
| `PARTNERUP_ENVIRONMENT` | branch mapping | yes, as migration/runtime value | `PARTNERUP_ENVIRONMENT` |
| `FRONTEND_URL` | variable | yes | `FRONTEND_URL` |
| `PAYMENT_NOTIFY_BASE_URL` | variable | yes | `PAYMENT_NOTIFY_BASE_URL` |
| `AUTH_JWT_SECRET` | secret | yes, minimum 32 characters | `AUTH_JWT_SECRET` |
| `WECHAT_OFFICIAL_ACCOUNT_APP_ID` | secret | yes | `WECHAT_OFFICIAL_ACCOUNT_APP_ID` |
| `WECHAT_OFFICIAL_ACCOUNT_APP_SECRET` | secret | yes | `WECHAT_OFFICIAL_ACCOUNT_APP_SECRET` |
| `WECHAT_AUTH_SESSION_SECRET` | secret | yes | `WECHAT_AUTH_SESSION_SECRET` |
| `JOB_RUNNER_INTERNAL_TOKEN` | secret | yes | `JOB_RUNNER_INTERNAL_TOKEN` |
| `WECHAT_OAUTH_CALLBACK_URL` | variable | no | `WECHAT_OAUTH_CALLBACK_URL`, empty string when unset |
| `FIXED_IP_HTTP_PROXY` | secret | no | `FIXED_IP_HTTP_PROXY`, empty string when unset |
| `LLM_API_KEY` | secret | required only when `LLM_BASE_URL` is set | `LLM_API_KEY`, empty string when unset |
| `LLM_BASE_URL` | variable | no | `LLM_BASE_URL`, empty string when unset |
| `LLM_DEFAULT_MODEL` | variable | no | `LLM_DEFAULT_MODEL`, empty string when unset |
| `WECOM_TOKEN` | secret | no | `WECOM_TOKEN`, empty string when unset |
| `WECOM_ENCODING_AES_KEY` | secret | no | `WECOM_ENCODING_AES_KEY`, empty string when unset |
| `WECOM_CORP_ID` | secret | no | `WECOM_CORP_ID`, empty string when unset |
| `WECOM_APP_AGENT_ID` | secret | no | `WECOM_APP_AGENT_ID`, empty string when unset |
| `WECOM_APP_SECRET` | secret | no | `WECOM_APP_SECRET`, empty string when unset |

`PAYMENT_NOTIFY_BASE_URL` must be the public HTTPS backend API origin that
WeChatPay can reach for unauthenticated payment callbacks. Do not point it at
the frontend origin unless that origin also routes `/api/payment/*` to the
backend.

`IMAGES_DIR` and `AVATARS_DIR` are local development upload fallbacks. They are
not currently passed by `apps/backend/s.yaml`; production FC uses the OSS mount
at `/mnt/oss`.

## Legacy Resource Names

The GitHub repository was renamed to `partner-up-dev/app`, but backend Aliyun
runtime resources and external provider credentials remain independent runtime
resources. Keep legacy names unless an explicit Aliyun/provider migration is
planned and verified.

Legacy names that are intentionally retained:

- Serverless/FC template tag value `mvp-HA` in backend runtime, DB migration,
  and job-runner trigger templates.
- `partner-up-mvp-ha` inside `FIXED_IP_HTTP_PROXY` credentials when supplied by
  the proxy provider.
- OSS bucket URL hostnames such as `mvp-ha.oss-cn-hangzhou.aliyuncs.com` when
  stored seed data points at existing hosted assets.

These names are runtime resource or credential identifiers, not current
repository identity. Do not change them only to match the GitHub repository
name.

## WeChat Notification Template Sources

Subscription-message template ids for confirmation-reminder, activity-start
reminder, new-partner, meeting-point-updated, waitlist-promoted, and pr-message
are supplied only through backend `config` rows:

- `wechat.submsg_confirmation_reminder_template_id`
- `wechat.submsg_activity_start_reminder_template_id`
- `wechat.submsg_new_partner_template_id`
- `wechat.submsg_meeting_point_updated_template_id`
- `wechat.submsg_waitlist_promoted_template_id`
- `wechat.submsg_pr_message_template_id`

Backend runtime sends WeChat reminders through subscription messages only.
Template ids are owned by the `config` table.

## Database Environment Model

- schema source of truth: Drizzle entities + committed SQL artifacts
- forward-only schema/data migration model in staging and production
- migration execution happens through a dedicated FC migration function inside
  the VPC
- migration environment is controlled by `PARTNERUP_ENVIRONMENT`
- the runner defaults to `production` if no explicit environment is provided
- backend deploy maps `develop` to `staging` and `master` to `production`
- schema migrations are environment-neutral; only data migrations may declare
  `-- migration: environments=...`
- local development-only data migrations use `pnpm db:migrate:dev` or
  `pnpm db:reset:dev`

Runtime code that needs to separate staging and production behavior must use
`PARTNERUP_ENVIRONMENT`, not `NODE_ENV`, because both deployed backend runtimes
use `NODE_ENV=production`.

## Job Runner Trigger Runtime

There is a separate FC deployment for the external job-runner trigger function:

- workflow: `.github/workflows/job-runner-trigger-fc-deploy.yml`
- template: `apps/backend/fc-job-runner-trigger/s.yaml`
- package directory: `apps/backend/fc-job-runner-trigger`
- handler: `job-runner-trigger.cjs`
- target endpoint source: `ALIYUN_FC_JOB_RUNNER_TICK_URL`
- auth token source: `JOB_RUNNER_INTERNAL_TOKEN`
- cron source: `ALIYUN_FC_JOB_RUNNER_TRIGGER_CRON`

The workflow fallback for `ALIYUN_FC_JOB_RUNNER_TRIGGER_CRON` is:

```text
0 */30 * * * *
```

That fallback means every 30 minutes, all day, when the selected GitHub
Environment does not define `ALIYUN_FC_JOB_RUNNER_TRIGGER_CRON`.

If staging or production should run only during Asia/Shanghai business hours,
set `ALIYUN_FC_JOB_RUNNER_TRIGGER_CRON` in the selected GitHub Environment. The
previous business-hour value remains a valid explicit environment value:

```text
CRON_TZ=Asia/Shanghai 0 0/30 8-23 ? * ?
```

The template deploys whatever cron expression the workflow provides. The
workflow fallback is actual runtime truth unless the GitHub Environment override
is present.
