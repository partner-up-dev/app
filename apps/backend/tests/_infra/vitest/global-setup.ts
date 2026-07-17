import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";
import {
  createScenarioDatabase,
  installScenarioDatabaseEnv,
  resetAndMigrateTestDatabase,
  type ScenarioDatabaseHandle,
} from "../db/test-database";
import { loadWorkspaceEnvFiles } from "../../../../../tests/scenario/_infra/environment/env-files";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

let database: ScenarioDatabaseHandle | null = null;

export async function setup(_project: TestProject): Promise<void> {
  loadWorkspaceEnvFiles(repoRoot);
  process.env.PAYMENT_NOTIFY_BASE_URL ??= "http://127.0.0.1:1";

  database = await createScenarioDatabase();
  const databaseUrl = installScenarioDatabaseEnv(database.databaseUrl);
  await resetAndMigrateTestDatabase(databaseUrl);
}

export async function teardown(): Promise<void> {
  let closeDbError: unknown;
  try {
    const { closeDb } = await import("../../../src/lib/db");
    await closeDb();
  } catch (error) {
    closeDbError = error;
  }

  await database?.cleanup();
  database = null;

  if (closeDbError) {
    throw closeDbError;
  }
}
