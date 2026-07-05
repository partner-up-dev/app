# Seeds

This folder contains local bootstrap SQL executed by `pnpm db:seed` and `pnpm db:reset`.

Rules:

- Use `<prefix>_<name>.sql` file names.
- Seed files run every time the seed command is executed, so they must be idempotent.
- Prefer `insert ... on conflict do update` or `insert ... on conflict do nothing`.
- Do not put staging or production migration logic here.
- Seed files are not recorded in `app_migrations`.

Current local operator baseline:

- `0001_anchor_event_bootstrap.sql`: Anchor Event, POI, support config, and
  rental catalog rows for local reset and manual validation.
- `0002_admin_user_bootstrap.sql`: local admin and analytics account entrypoints.

Current local account bootstrap:

These credentials are local developer entrypoints only. Do not reuse these
passwords, hashes, or account bootstrap paths for staging or production.

- Admin UUID: `00000000-0000-0000-0000-000000000001`
- Admin password: `admin123`
- Analytics UUID: `00000000-0000-0000-0000-000000000002`
- Analytics code: `2026zcb`
