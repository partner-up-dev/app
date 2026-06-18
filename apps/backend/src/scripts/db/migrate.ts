import {
  acquireMigrationLock,
  applyMigrationFile,
  createSqlClient,
  ensureMigrationLedger,
  isMainModule,
  lintMigrationFiles,
  loadMigrationFiles,
  type MigrationEnvironment,
  releaseMigrationLock,
  resolveMigrationEnvironment,
} from "./shared";

function readDatabaseUrlFromEnv(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim().length === 0) {
    throw new Error("Missing required env var: DATABASE_URL");
  }

  return databaseUrl;
}

export async function runMigrations(
  connectionString: string,
  options: { environment?: MigrationEnvironment } = {},
): Promise<void> {
  await lintMigrationFiles();

  const environment = options.environment ?? resolveMigrationEnvironment();
  const shouldLog = process.env.DB_MIGRATE_LOG_LEVEL !== "silent";
  const sql = createSqlClient(connectionString);
  try {
    await ensureMigrationLedger(sql);
    await acquireMigrationLock(sql);

    const migrations = await loadMigrationFiles();
    let appliedCount = 0;
    let skippedCount = 0;

    for (const migration of migrations) {
      const result = await applyMigrationFile(sql, migration, { environment });
      if (result.skipped) {
        skippedCount += 1;
        if (shouldLog) {
          const skipPrefix = result.skipReason === "environment" ? "skip-env" : "skip";
          console.info(`[db:migrate] ${skipPrefix} ${migration.relativePath}`);
        }
      } else {
        appliedCount += 1;
        if (shouldLog) {
          console.info(`[db:migrate] apply ${migration.relativePath} (${result.durationMs}ms)`);
        }
      }
    }

    if (shouldLog) {
      console.info(
        `[db:migrate] complete. environment=${environment} applied=${appliedCount} skipped=${skippedCount}`,
      );
    }
  } finally {
    try {
      await releaseMigrationLock(sql);
    } finally {
      await sql.end({ timeout: 5 });
    }
  }
}

async function main(): Promise<void> {
  await runMigrations(readDatabaseUrlFromEnv(), {
    environment: resolveMigrationEnvironment(),
  });
}

if (isMainModule(import.meta.url)) {
  await main();
}
