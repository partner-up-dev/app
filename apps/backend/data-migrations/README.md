# Data Migrations

This folder contains forward-only data migrations executed by the custom database runner.

Rules:

- Use `<global-prefix>_<name>.sql` file names.
- Prefixes are shared with `apps/backend/drizzle/`.
- Files in this folder are applied through `pnpm db:migrate` and recorded in `app_migrations`.
- Use `pnpm db:next-migration data-migrations` to get the next numeric prefix.
- If a file contains `CONCURRENTLY`, it must include `-- migration: no-transaction`.
- Staging and production are forward-only. Do not put reset logic here.

## Environment Metadata

Data migrations may be scoped to explicit environments with:

```sql
-- migration: environments=development
```

Allowed values are `production`, `staging`, and `development`. Multiple values
are comma-separated. Files without `environments=` are universal and run in all
environments.

The migration runner defaults to `production`. Local development-only data
migrations should be applied through:

```bash
pnpm db:migrate:dev
pnpm db:reset:dev
```

Do not hand-type `PARTNERUP_ENVIRONMENT=development` for ordinary local work.

Development-only migrations are still committed and packaged. Keep them limited
to stable fake/local baseline data. Do not put per-run test PRs, orders, cleanup
SQL, scenario fixtures, real secrets, or real user/provider credentials here.

Schema migrations in `apps/backend/drizzle/` must not use environment metadata.
Seed files in `apps/backend/seeds/` must not use `-- migration:` metadata.
