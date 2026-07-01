# DEPLOYMENT of PartnerUp MVP-HA Backend

- Aliyun RDS PostgreSQL (Serverless version)
- Aliyun FC + Custom Runtime + Custom Layer (with CICD)
- Aliyun FC internal migration function `db_migrate` (template: `apps/backend/fc-db-migrate/s.yaml`; runs DB migrations inside FC VPC)
- Aliyun FC timer function `job_runner_trigger` (template: `apps/backend/fc-job-runner-trigger/s.yaml`; calls backend `/internal/maintenance/tick`; cron: `CRON_TZ=Asia/Shanghai 0 0/30 8-23 ? * ?`; supports comma-separated multi URL via `ALIYUN_FC_JOB_RUNNER_TICK_URL`)
- Aliyun OSS (Auto-cleanup)

## Database Migration Workflow

- Schema SQL is generated from Drizzle entities into `apps/backend/drizzle/` and committed in the same PR as the schema change.
- Forward-only data migrations live in `apps/backend/data-migrations/` and share the same numeric prefix sequence as schema migrations.
- The deploy pipeline deploys and invokes a dedicated FC migration function before backend FC deploy, and records applied migrations in `app_migrations`.
- The migration runner uses `PARTNERUP_ENVIRONMENT`; deploy maps `develop` to
  `staging` and `master` to `production`. Development-only data migrations are
  applied locally through `pnpm db:migrate:dev` or `pnpm db:reset:dev`.
- The migration job takes a Postgres advisory lock so only one migration runner applies changes per deploy.
- Staging and production are forward-only. If a migration fails, deploy stops and recovery is done with a forward fix, not reset.
- Local production-semantic resets use `pnpm db:reset`, which recreates the
  local database, applies universal and production data migrations, and then
  runs idempotent seeds from `apps/backend/seeds/`. Local resets that need
  development-only data migrations use `pnpm db:reset:dev`.
