# Database Operations

## Runtime Topology

Staging and production use a self-managed PostgreSQL 18 instance on the
existing Shenzhen ECS. The database is independent from the Supabase stack on
the same host:

- service: `postgresql-18.service`
- listener: public TCP `55432`, TLS required, SCRAM authentication
- data directory: `/srv/partnerup-postgres18/data/pgdata`
- TLS material: `/srv/partnerup-postgres18/tls`
- resource boundary: one CPU and 1 GiB systemd memory limit
- staging database and owner: `partnerup_staging`
- production database and owner: `partnerup_production`

The existing Supabase PostgreSQL 15 container and the rest of the Supabase
containers remain a separate runtime. Do not treat them as the application
database or modify their data during PartnerUp database maintenance.

Aliyun Function Compute remains in Hangzhou and reaches PostgreSQL through the
ECS public endpoint. `DATABASE_URL` and `DATABASE_URL_FOR_MIGRATION` in each
GitHub Environment own the current host and credentials; both URLs must select
the environment-specific database and include `sslmode=require`. Security group
port `55432` is the only application database ingress required by FC.

The backend migration function still runs before every FC backend deployment.
It uses the same PostgreSQL endpoint as the target environment, so a successful
migration invocation is also the first network, TLS, and credential check for a
rollout.

## Service Operations

Use Cloud Assistant or an authenticated ECS shell for host operations. Useful
checks are:

```bash
systemctl status postgresql-18
systemctl show postgresql-18 -p MemoryCurrent -p MemoryMax -p CPUQuotaPerSecUSec
ss -ltnp | grep 55432
sudo -u postgres /usr/pgsql-18/bin/pg_isready --port 55432
journalctl -u postgresql-18 --since today
df -h /srv/partnerup-postgres18
```

Database credentials are stored root-only in
`/root/deployment/partnerup-postgres18/.env`. Do not print this file or copy its
values into task artifacts, logs, or durable documentation.

## Logical Backups

Nightly logical backups are owned by these host units:

- executable: `/usr/local/sbin/partnerup-postgres-backup`
- service: `partnerup-postgres-backup.service`
- timer: `partnerup-postgres-backup.timer`
- schedule: daily at 03:30 Asia/Shanghai with up to 20 minutes randomized delay
- local staging directory: `/srv/partnerup-postgres18/backups`
- local retention: 7 days
- OSS destination: `oss://mvp-ha/database-backups/partnerup/<database>/`
- OSS retention: 30 days through the bucket lifecycle rule
- upload identity: ECS RAM role `partnerup-ecs-db-backup`

Each run creates a PostgreSQL custom-format dump, validates it with
`pg_restore --list`, and uploads it only after validation. The backup timer and
latest objects can be checked with:

```bash
systemctl list-timers partnerup-postgres-backup.timer
systemctl show partnerup-postgres-backup.service -p Result -p ExecMainStatus
journalctl -u partnerup-postgres-backup.service --since yesterday
ossutil ls oss://mvp-ha/database-backups/partnerup/ \
  --mode EcsRamRole \
  --ecs-role-name partnerup-ecs-db-backup \
  --endpoint oss-cn-hangzhou.aliyuncs.com
```

Run `systemctl start partnerup-postgres-backup.service` after a material data
migration and verify that new objects exist for both databases.

## Restore Procedure

Restores are destructive to the selected target database. Resolve the exact
environment and backup object before proceeding, keep the other database and
Supabase untouched, and stop or redirect application writes when consistency
requires it.

1. Download the selected custom-format dump from the environment-specific OSS
   prefix into the root-only backup directory.
2. Validate it with `/usr/pgsql-18/bin/pg_restore --list <dump>`.
3. Recreate only the selected database with its existing owner role:

   ```bash
   sudo -u postgres /usr/pgsql-18/bin/dropdb --port 55432 <database>
   sudo -u postgres /usr/pgsql-18/bin/createdb \
     --port 55432 --owner <owner> <database>
   ```

4. Restore as the environment owner with `--no-owner`, `--no-privileges`, and
   `--exit-on-error`.
5. Compare source/expected table counts, run a real environment-specific API
   database probe, and retain the displaced source until the rollback window
   closes.

Do not restore a staging dump into production or share owner credentials across
the two environments.

## RDS Rollback Boundary

Aliyun RDS is no longer the canonical application database. The former staging
and production instances may remain temporarily paused during a migration
rollback window, but normal deployments and migrations must use the ECS URLs
owned by GitHub Environments. Reverting to RDS is an explicit rollback requiring
fresh consistency analysis and a coordinated secret/deploy change; do not
silently repoint one URL while leaving the migration URL on another database.
