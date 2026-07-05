# db-migrate (Aliyun FC Internal Function)

This function runs the backend database migration runner inside Aliyun FC, so
the migration execution happens from the VPC instead of the GitHub Actions
runner.

Durable deployment sequencing and recovery truth lives in
`docs/40-deployment/backend-rollout.md`,
`docs/40-deployment/backend-runtime.md`, and `docs/40-deployment/recovery.md`.

## Files

- handler entry: `db-migrate-handler.cjs`
- bundled migration runtime: `.fc-package/db-migrate.js`
- FC template: `s.yaml`

## Environment Variables

- `DATABASE_URL` (required)
  Database connection string used by the migration runner.
- `PARTNERUP_ENVIRONMENT` (required)
  Migration environment allowlist value. Backend deploy maps `develop` to
  `staging` and `master` to `production`. The FC deploy path accepts only
  `staging` or `production`; `development` is a local runner environment.
- `DB_SCRIPT_ROOT` (set by handler)
  Points the shared migration loader at the packaged `drizzle/` and
  `data-migrations/` directories.

## Runtime Behavior

1. load the bundled migration runtime from the current deployment package
2. point the migration loader at the packaged repository root
3. run the same `runMigrations()` implementation used by local
   `pnpm db:migrate`
4. return success only when every pending migration has either been applied or
   skipped safely

## Packaging

The deployment package is prepared by
`scripts/ci/fc/prepare_fc_db_migrate_package.sh`.

It contains:

- `db-migrate-handler.cjs`
- `db-migrate.js`
- `package.json`
- `drizzle/`
- `data-migrations/`
