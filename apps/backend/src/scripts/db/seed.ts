import { env } from "../../lib/env";
import {
  applySeedFile,
  createSqlClient,
  isMainModule,
  lintSeedFiles,
  loadSeedFiles,
} from "./shared";

export async function runSeeds(connectionString: string): Promise<void> {
  await lintSeedFiles();

  const sql = createSqlClient(connectionString);
  try {
    const seedFiles = await loadSeedFiles();
    if (seedFiles.length === 0) {
      console.info("[db:seed] no seed files found");
      return;
    }

    for (const seedFile of seedFiles) {
      const durationMs = await applySeedFile(sql, seedFile);
      console.info(`[db:seed] apply ${seedFile.relativePath} (${durationMs}ms)`);
    }

    console.info(`[db:seed] complete. applied=${seedFiles.length}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main(): Promise<void> {
  await runSeeds(env.DATABASE_URL);
}

if (isMainModule(import.meta.url)) {
  await main();
}
