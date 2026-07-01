import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres, { type Sql } from "postgres";

export type MigrationKind = "schema" | "data";

export type SqlFileType = MigrationKind | "seed";

export const migrationEnvironments = ["production", "staging", "development"] as const;

export type MigrationEnvironment = (typeof migrationEnvironments)[number];

export interface SqlFileDefinition {
  absolutePath: string;
  checksum: string;
  environmentScoped: boolean;
  environments: MigrationEnvironment[];
  fileName: string;
  id: string;
  kind: SqlFileType;
  prefix: number;
  prefixText: string;
  relativePath: string;
  sql: string;
  transactional: boolean;
}

export interface AppliedMigrationRow {
  id: string;
  checksum: string;
}

export type MigrationSkipReason = "already-applied" | "environment";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveBackendRoot(): string {
  const overrideRoot = process.env.DB_SCRIPT_ROOT?.trim();
  if (overrideRoot) {
    return path.resolve(overrideRoot);
  }

  return path.resolve(__dirname, "../../..");
}

export const backendRoot = resolveBackendRoot();
export const drizzleDir = path.join(backendRoot, "drizzle");
export const dataMigrationsDir = path.join(backendRoot, "data-migrations");
export const seedsDir = path.join(backendRoot, "seeds");

export const MIGRATION_TABLE_NAME = "app_migrations";
export const MIGRATION_LOCK_NAMESPACE = 41001;
export const MIGRATION_LOCK_KEY = 1;

const migrationFilePattern = /^(\d+)_([A-Za-z0-9_]+)\.sql$/;
const noTransactionHeader = "-- migration: no-transaction";
const environmentsHeaderPrefix = "environments=";
const migrationHeaderLinePattern = /^-- migration:\s*(.*)$/gm;
const allMigrationEnvironments = [...migrationEnvironments];

export function createSqlClient(connectionString: string): Sql {
  const quietNotices = process.env.DB_MIGRATE_LOG_LEVEL === "silent";
  return postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 30,
    onnotice: quietNotices ? () => undefined : undefined,
  });
}

export async function loadMigrationFiles(): Promise<SqlFileDefinition[]> {
  const schemaFiles = await readSqlDirectory(drizzleDir, "schema");
  const dataFiles = await readSqlDirectory(dataMigrationsDir, "data");
  const files = [...schemaFiles, ...dataFiles].sort(compareSqlFiles);
  validateOrderedPrefixes(files, ["schema", "data"]);
  return files;
}

export async function loadSeedFiles(): Promise<SqlFileDefinition[]> {
  const files = (await readSqlDirectory(seedsDir, "seed")).sort(compareSqlFiles);
  validateOrderedPrefixes(files, ["seed"]);
  return files;
}

export async function lintMigrationFiles(): Promise<void> {
  await loadMigrationFiles();
}

export async function lintSeedFiles(): Promise<void> {
  await loadSeedFiles();
}

export async function ensureMigrationLedger(sql: Sql): Promise<void> {
  await sql.unsafe(`
    create table if not exists ${quoteIdentifier(MIGRATION_TABLE_NAME)} (
      id text primary key,
      kind text not null check (kind in ('schema', 'data')),
      checksum text not null,
      applied_at timestamptz not null default now(),
      duration_ms integer not null check (duration_ms >= 0)
    )
  `);
}

export async function acquireMigrationLock(sql: Sql): Promise<void> {
  const rows = await sql<{ locked: boolean }[]>`
    select pg_try_advisory_lock(${MIGRATION_LOCK_NAMESPACE}, ${MIGRATION_LOCK_KEY}) as locked
  `;
  const locked = rows[0]?.locked ?? false;
  if (!locked) {
    throw new Error(
      "Could not acquire migration advisory lock. Another migration runner may already be active.",
    );
  }
}

export async function releaseMigrationLock(sql: Sql): Promise<void> {
  await sql`
    select pg_advisory_unlock(${MIGRATION_LOCK_NAMESPACE}, ${MIGRATION_LOCK_KEY})
  `;
}

export async function readAppliedMigrations(sql: Sql): Promise<Map<string, AppliedMigrationRow>> {
  const rows = await sql<AppliedMigrationRow[]>`
    select id, checksum
    from app_migrations
  `;
  return new Map(rows.map((row) => [row.id, row]));
}

export async function applyMigrationFile(
  sql: Sql,
  file: SqlFileDefinition,
  options: { environment: MigrationEnvironment },
): Promise<{
  durationMs: number;
  skipped: boolean;
  skipReason?: MigrationSkipReason;
}> {
  const appliedMigrations = await readAppliedMigrations(sql);
  const existingRow = appliedMigrations.get(file.id);
  if (existingRow) {
    if (existingRow.checksum !== file.checksum) {
      throw new Error(
        `Applied migration ${file.id} checksum mismatch. Expected ${existingRow.checksum}, found ${file.checksum}.`,
      );
    }

    return { durationMs: 0, skipped: true, skipReason: "already-applied" };
  }

  if (!file.environments.includes(options.environment)) {
    return { durationMs: 0, skipped: true, skipReason: "environment" };
  }

  const startedAt = Date.now();
  if (file.transactional) {
    await sql.begin(async (tx) => {
      await tx.unsafe(file.sql);
      const durationMs = Date.now() - startedAt;
      await tx.unsafe(
        `insert into app_migrations (id, kind, checksum, duration_ms)
         values ($1, $2, $3, $4)`,
        [file.id, mapKindToLedgerKind(file.kind), file.checksum, durationMs],
      );
    });
  } else {
    await sql.unsafe(file.sql);
    const durationMs = Date.now() - startedAt;
    await sql.unsafe(
      `insert into app_migrations (id, kind, checksum, duration_ms)
       values ($1, $2, $3, $4)`,
      [file.id, mapKindToLedgerKind(file.kind), file.checksum, durationMs],
    );
  }

  return { durationMs: Date.now() - startedAt, skipped: false };
}

export async function applySeedFile(sql: Sql, file: SqlFileDefinition): Promise<number> {
  const startedAt = Date.now();
  await sql.begin(async (tx) => {
    await tx.unsafe(file.sql);
  });
  return Date.now() - startedAt;
}

export async function computeNextMigrationPrefix(): Promise<string> {
  const files = await loadMigrationFiles();
  const highestPrefix = files.reduce((maxPrefix, file) => {
    return Math.max(maxPrefix, file.prefix);
  }, 0);
  const width = Math.max(4, String(highestPrefix + 1).length);
  return String(highestPrefix + 1).padStart(width, "0");
}

export function resolveMigrationEnvironment(
  input: { argv?: string[]; env?: NodeJS.ProcessEnv } = {},
): MigrationEnvironment {
  const argv = input.argv ?? process.argv.slice(2);
  const env = input.env ?? process.env;
  const cliEnvironment = readEnvironmentArg(argv);
  const rawEnvEnvironment = env.PARTNERUP_ENVIRONMENT;
  const envEnvironment = rawEnvEnvironment === undefined ? undefined : rawEnvEnvironment.trim();
  if (rawEnvEnvironment !== undefined && envEnvironment?.length === 0) {
    throw new Error("PARTNERUP_ENVIRONMENT requires a non-empty value.");
  }

  if (cliEnvironment && envEnvironment && cliEnvironment !== envEnvironment) {
    throw new Error(
      `Conflicting migration environments: --environment=${cliEnvironment} and PARTNERUP_ENVIRONMENT=${envEnvironment}.`,
    );
  }

  // Production is the safe default for any path that forgot to pass an
  // explicit environment. Development-only data must opt in through
  // db:migrate:dev / db:reset:dev or --environment=development.
  return parseMigrationEnvironment(cliEnvironment ?? envEnvironment ?? "production");
}

export function assertMigrationEnvironment(value: string): asserts value is MigrationEnvironment {
  parseMigrationEnvironment(value);
}

export function assertSupportedNextMigrationFolder(folder: string): void {
  if (folder !== "drizzle" && folder !== "data-migrations") {
    throw new Error(
      `Unsupported migration folder \"${folder}\". Expected one of: drizzle, data-migrations.`,
    );
  }
}

export function getDatabaseNameFromUrl(connectionString: string): string {
  const databaseUrl = new URL(connectionString);
  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ""));
  if (!databaseName) {
    throw new Error("DATABASE_URL must include a database name in the path.");
  }

  return databaseName;
}

export function getAdminDatabaseUrl(connectionString: string): string {
  const databaseUrl = new URL(connectionString);
  databaseUrl.pathname = "/postgres";
  return databaseUrl.toString();
}

export function assertLocalResetAllowed(connectionString: string): void {
  const databaseUrl = new URL(connectionString);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const nodeEnv = process.env.NODE_ENV ?? "development";

  if (nodeEnv === "production" || !localHosts.has(databaseUrl.hostname)) {
    throw new Error(
      "db:reset is restricted to local development databases on localhost/127.0.0.1/::1.",
    );
  }
}

export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export function isMainModule(moduleUrl: string): boolean {
  const entryPath = process.argv[1];
  if (!entryPath) {
    return false;
  }

  return path.resolve(fileURLToPath(moduleUrl)) === path.resolve(entryPath);
}

export async function readSqlDirectory(
  dirPath: string,
  kind: SqlFileType,
): Promise<SqlFileDefinition[]> {
  const directoryEntries = await readDirectoryIfExists(dirPath);
  const sqlFiles = directoryEntries.filter((entryName) => entryName.endsWith(".sql"));
  const files = await Promise.all(
    sqlFiles.map(async (fileName) => {
      const match = migrationFilePattern.exec(fileName);
      if (!match) {
        throw new Error(
          `Invalid ${kind} file name ${fileName}. Expected <number>_<name>.sql format.`,
        );
      }

      const prefixText = match[1];
      const prefix = Number.parseInt(prefixText, 10);
      const absolutePath = path.join(dirPath, fileName);
      const sql = await fs.readFile(absolutePath, "utf8");
      const relativePath = normalizeRelativePath(path.relative(backendRoot, absolutePath));
      const metadata = parseSqlFileMetadata(sql, kind, relativePath);

      return {
        absolutePath,
        checksum: createHash("sha256").update(sql).digest("hex"),
        environmentScoped: metadata.environmentScoped,
        environments: metadata.environments,
        fileName,
        id: `${kind}:${fileName}`,
        kind,
        prefix,
        prefixText,
        relativePath,
        sql,
        transactional: metadata.transactional,
      } satisfies SqlFileDefinition;
    }),
  );

  return files;
}

function compareSqlFiles(a: SqlFileDefinition, b: SqlFileDefinition): number {
  if (a.prefix !== b.prefix) {
    return a.prefix - b.prefix;
  }

  return a.fileName.localeCompare(b.fileName);
}

export function parseSqlFileMetadata(
  sql: string,
  kind: SqlFileType,
  relativePath: string,
): {
  environmentScoped: boolean;
  environments: MigrationEnvironment[];
  transactional: boolean;
} {
  const headerBodies = [...sql.matchAll(migrationHeaderLinePattern)].map(
    (match) => match[1]?.trim() ?? "",
  );

  if (kind === "seed") {
    if (headerBodies.length > 0) {
      throw new Error(`${relativePath}: seed files do not support -- migration metadata headers.`);
    }

    return {
      environmentScoped: false,
      environments: [...allMigrationEnvironments],
      transactional: true,
    };
  }

  let hasNoTransactionHeader = false;
  let environments: MigrationEnvironment[] | null = null;

  for (const headerBody of headerBodies) {
    if (headerBody === "no-transaction") {
      if (hasNoTransactionHeader) {
        throw new Error(`${relativePath}: duplicate ${noTransactionHeader} header.`);
      }
      hasNoTransactionHeader = true;
      continue;
    }

    if (headerBody.startsWith(environmentsHeaderPrefix)) {
      if (kind !== "data") {
        throw new Error(
          `${relativePath}: schema migrations must not declare migration environments.`,
        );
      }
      if (environments) {
        throw new Error(`${relativePath}: duplicate -- migration: environments=... header.`);
      }
      environments = parseMigrationEnvironmentList(
        headerBody.slice(environmentsHeaderPrefix.length),
        relativePath,
      );
      continue;
    }

    throw new Error(`${relativePath}: unsupported -- migration metadata header "${headerBody}".`);
  }

  const transactional = !hasNoTransactionHeader;
  if (/\bCONCURRENTLY\b/i.test(sql) && transactional) {
    throw new Error(
      `${relativePath}: migration file uses CONCURRENTLY but is missing the ${noTransactionHeader} header.`,
    );
  }

  return {
    environmentScoped: environments !== null,
    environments: environments ?? [...allMigrationEnvironments],
    transactional,
  };
}

function validateOrderedPrefixes(
  files: SqlFileDefinition[],
  allowedKinds: readonly SqlFileType[],
): void {
  const seenPrefixes = new Map<number, SqlFileDefinition>();

  for (const file of files) {
    if (!allowedKinds.includes(file.kind)) {
      throw new Error(`Unexpected SQL file kind ${file.kind}.`);
    }

    const existingFile = seenPrefixes.get(file.prefix);
    if (existingFile) {
      throw new Error(
        `Duplicate numeric prefix ${file.prefixText} found in ${existingFile.relativePath} and ${file.relativePath}.`,
      );
    }

    seenPrefixes.set(file.prefix, file);
  }
}

async function readDirectoryIfExists(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch (error) {
    if (isNodeErrorWithCode(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function mapKindToLedgerKind(kind: SqlFileType): MigrationKind {
  if (kind === "seed") {
    throw new Error("Seed files are not written to the migration ledger.");
  }
  return kind;
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function parseMigrationEnvironment(value: string): MigrationEnvironment {
  const normalized = value.trim();
  if (migrationEnvironments.includes(normalized as MigrationEnvironment)) {
    return normalized as MigrationEnvironment;
  }

  throw new Error(
    `Unsupported migration environment "${value}". Expected one of: ${migrationEnvironments.join(", ")}.`,
  );
}

function parseMigrationEnvironmentList(
  rawValue: string,
  relativePath: string,
): MigrationEnvironment[] {
  const rawEntries = rawValue.split(",").map((entry) => entry.trim());
  const environments = rawEntries.filter((entry) => entry.length > 0);
  if (environments.length === 0 || environments.length !== rawEntries.length) {
    throw new Error(
      `${relativePath}: -- migration: environments=... requires a comma-separated non-empty environment list.`,
    );
  }

  const seen = new Set<MigrationEnvironment>();
  return environments.map((environment) => {
    const parsed = parseMigrationEnvironment(environment);
    if (seen.has(parsed)) {
      throw new Error(`${relativePath}: duplicate migration environment "${parsed}".`);
    }
    seen.add(parsed);
    return parsed;
  });
}

function readEnvironmentArg(argv: string[]): string | undefined {
  let parsedEnvironment: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    let value: string | undefined;

    if (arg === "--environment") {
      if (argv[index + 1] === undefined) {
        throw new Error("--environment requires a non-empty value.");
      }
      value = argv[index + 1];
      index += 1;
    } else if (arg?.startsWith("--environment=")) {
      value = arg.slice("--environment=".length);
    }

    if (value === undefined) continue;
    if (value.trim().length === 0) {
      throw new Error("--environment requires a non-empty value.");
    }
    if (parsedEnvironment !== undefined) {
      throw new Error("--environment may only be provided once.");
    }
    parsedEnvironment = value.trim();
  }

  return parsedEnvironment;
}

function isNodeErrorWithCode(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
