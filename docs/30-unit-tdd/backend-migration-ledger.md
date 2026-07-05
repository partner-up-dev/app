# Backend Migration Ledger Unit TDD

## Role

The Backend Migration Ledger unit preserves local migration rules that protect
schema and data evolution across local development, CI, staging, and production.

Deployment docs own rollout and runtime behavior. This Unit TDD owns the local
ledger, naming, environment metadata, reset, seed, and verification rules that
are easy to violate while editing backend migrations.

## Durable Inputs

- Backend operational guidance: `apps/backend/AGENTS.md`
- Data migration local pointer: `apps/backend/data-migrations/AGENTS.md`
- Data migration README: `apps/backend/data-migrations/README.md`
- Backend deployment notes: `apps/backend/DEPLOYMENT.md`
- Deployment environments: `docs/40-deployment/environments.md`
- Deployment rollout: `docs/40-deployment/rollout.md`
- Test platform scenario fixture rule: `docs/20-product-tdd/test-platform.md`

## Local Invariants

- Drizzle schema remains the schema source of truth. Generated schema SQL lives
  under `apps/backend/drizzle/`.
- Hand-authored SQL data migrations live under
  `apps/backend/data-migrations/`.
- Schema and data migrations share one global numeric prefix sequence. Use
  `pnpm db:next-migration <drizzle|data-migrations>` to allocate the next
  prefix instead of guessing.
- Applied schema and data migrations are recorded in `app_migrations` by the
  custom migration runner.
- `pnpm db:migrate` defaults to production migration semantics.
- Routine local development data migrations use `pnpm db:migrate:dev` or
  `pnpm db:reset:dev`; do not hand-type `PARTNERUP_ENVIRONMENT=development`
  for ordinary local work.
- Only data migrations may use `-- migration: environments=...`.
- Environment metadata is an allowlist over `production`, `staging`, and
  `development`; it is not a runtime branch inside SQL.
- Files without `environments=` are universal and run in all environments.
- Schema migrations and seed files must not use migration environment metadata.
- Development-only data migrations must be stable local baseline data only.
  Do not put per-run PRs, orders, cleanup scripts, scenario-test fixtures,
  production secrets, or real user/provider credentials there.
- If a development-only baseline changes after a migration was applied, add a
  new forward migration. Do not edit the applied SQL file.
- Seed files are rerunnable local bootstrap data. They must be idempotent and
  are not recorded in `app_migrations`.
- If a migration contains `CONCURRENTLY`, it must include
  `-- migration: no-transaction`.
- Staging and production are forward-only. Do not add reset logic or
  environment-specific migration folders.
- Scenario test fixtures are created by scenario setup code, not by
  development-only data migrations.

## Failure / Drift Semantics

- Prefix collisions break migration ordering and can cause CI or deploy drift.
- Editing an already-applied migration creates different database histories for
  developers, CI, staging, and production.
- Putting scenario fixtures into data migrations pollutes developer baselines
  and can leak test-only assumptions into runtime environments.
- Using environment metadata in schema migrations makes the schema ledger
  environment-dependent, which conflicts with deploy and drift checks.
- Treating environment metadata as SQL branching hides which environments will
  apply a migration.
- Reset logic in migrations is unsafe for staging and production because those
  environments are forward-only.

## Verification Expectations

For changes in this unit:

- Use `pnpm db:next-migration <drizzle|data-migrations>` before creating a new
  migration file.
- Run `pnpm db:lint` when adding or editing migration or seed files.
- Run `pnpm db:check` when generated Drizzle schema SQL changes.
- Run the appropriate backend config or build check when migration runner,
  migration packaging, or deploy invocation code changes.
- For development-only baseline data, verify the intended local path with
  `pnpm db:migrate:dev` or `pnpm db:reset:dev` instead of overriding
  `PARTNERUP_ENVIRONMENT` manually.
- For scenario fixtures, verify the scenario setup path instead of placing
  fixture rows into data migrations.

## Local AGENTS Pointers To Keep

`apps/backend/data-migrations/AGENTS.md` should remain a concise local hazard
summary for migration authors. It should point to this Unit TDD doc for the
full ledger model instead of repeating every rule.
