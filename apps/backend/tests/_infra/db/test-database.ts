import postgres from "postgres";
import { runMigrations } from "../../../src/scripts/db/migrate";

export const TEST_DATABASE_URL_ENV = "TEST_DATABASE_URL";
export const SCENARIO_DATABASE_ADMIN_URL_ENV = "SCENARIO_DATABASE_ADMIN_URL";

export type ScenarioDatabaseHandle = {
  databaseUrl: string;
  cleanup(): Promise<void>;
};

const quoteIdentifier = (identifier: string): string => `"${identifier.replace(/"/g, '""')}"`;

const buildTemporaryDatabaseName = (): string => `partnerup_scenario_${Date.now()}_${process.pid}`;

const buildDatabaseUrl = (adminUrl: string, databaseName: string): string => {
  const url = new URL(adminUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
};

export async function createScenarioDatabase(): Promise<ScenarioDatabaseHandle> {
  const explicitDatabaseUrl = process.env[TEST_DATABASE_URL_ENV]?.trim();
  if (explicitDatabaseUrl) {
    return {
      databaseUrl: explicitDatabaseUrl,
      cleanup: async () => undefined,
    };
  }

  const adminUrl = process.env[SCENARIO_DATABASE_ADMIN_URL_ENV]?.trim();
  if (!adminUrl) {
    throw new Error(
      `Missing required env var: ${TEST_DATABASE_URL_ENV} or ${SCENARIO_DATABASE_ADMIN_URL_ENV}`,
    );
  }

  const databaseName = buildTemporaryDatabaseName();
  const adminSql = postgres(adminUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 30,
  });

  try {
    await adminSql.unsafe(`create database ${quoteIdentifier(databaseName)}`);
  } catch (error) {
    await adminSql.end({ timeout: 5 });
    throw error;
  }

  let cleanedUp = false;

  return {
    databaseUrl: buildDatabaseUrl(adminUrl, databaseName),
    async cleanup() {
      if (cleanedUp) {
        return;
      }
      cleanedUp = true;

      try {
        await adminSql.unsafe(
          `
          select pg_terminate_backend(pid)
          from pg_stat_activity
          where datname = $1
            and pid <> pg_backend_pid()
        `,
          [databaseName],
        );
        await adminSql.unsafe(`drop database if exists ${quoteIdentifier(databaseName)}`);
      } finally {
        await adminSql.end({ timeout: 5 });
      }
    },
  };
}

export function installScenarioDatabaseEnv(databaseUrl: string): string {
  process.env.DATABASE_URL = databaseUrl;
  process.env.PARTNERUP_ENVIRONMENT = "staging";
  process.env.BACKEND_SCENARIO_DISABLE_BOOTSTRAP = "true";
  process.env.BACKEND_SCENARIO_DISABLE_REQUEST_TAIL = "true";
  process.env.DB_MIGRATE_LOG_LEVEL = "silent";
  return databaseUrl;
}

export async function resetAndMigrateTestDatabase(connectionString: string): Promise<void> {
  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 30,
  });

  try {
    await sql.unsafe("drop schema if exists public cascade");
    await sql.unsafe("create schema public");
  } finally {
    await sql.end({ timeout: 5 });
  }

  await runMigrations(connectionString);
}
