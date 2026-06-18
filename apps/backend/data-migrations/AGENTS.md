# AGENTS.md for Backend Data Migrations

- This folder is for forward-only, ledgered SQL data migrations.
- File names must use the shared global migration prefix:
  `<number>_<name>.sql`.
- Data migrations may use:
  - `-- migration: no-transaction`
  - `-- migration: environments=production,staging,development`
- Environment metadata is an allowlist, not a runtime condition inside SQL.
- Files without `environments=` are universal and run in all environments.
- Development-only data migrations must be stable local baseline data only.
  Do not put per-run PRs, orders, cleanup scripts, scenario-test fixtures,
  production secrets, or real user/provider credentials here.
- If development-only baseline data changes after a migration was applied,
  add a new forward migration. Do not edit an applied SQL file.
- Schema migrations in `drizzle/` must never use environment gating.
- Local one-off SQL for manual testing belongs under `tasks/`, not here.
