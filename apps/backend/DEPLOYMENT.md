# Backend Deployment Notes

This package-local file identifies backend deployment implementation entrypoints.
Durable runtime, rollout, observability, and recovery truth lives in
`docs/40-deployment/`.

## Implementation Entry Points

- backend FC template: `apps/backend/s.yaml`
- backend FC start script: `apps/backend/fc-start.sh`
- backend deploy script: `scripts/ci/fc/deploy_backend.sh`
- backend deploy workflow: `.github/workflows/backend-fc-deploy.yml`
- migration FC template: `apps/backend/fc-db-migrate/s.yaml`
- migration function README: `apps/backend/fc-db-migrate/README.md`
- job-runner trigger template: `apps/backend/fc-job-runner-trigger/s.yaml`
- job-runner trigger README: `apps/backend/fc-job-runner-trigger/README.md`

## Canonical Deployment Docs

- runtime contract: `docs/40-deployment/backend-runtime.md`
- backend rollout: `docs/40-deployment/backend-rollout.md`
- recovery: `docs/40-deployment/recovery.md`
- observability: `docs/40-deployment/observability.md`

## Local Migration Reminder

Schema SQL is generated from Drizzle entities into `apps/backend/drizzle/` and
committed in the same PR as the schema change. Forward-only data migrations live
in `apps/backend/data-migrations/` and share the same numeric prefix sequence as
schema migrations.

Local production-semantic resets use `pnpm db:reset`; local resets that need
development-only data migrations use `pnpm db:reset:dev`. These local reset
flows do not imply staging or production recovery options.
