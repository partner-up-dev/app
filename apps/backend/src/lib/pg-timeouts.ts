import { sql } from "drizzle-orm";

interface SqlExecutor {
  execute(query: unknown): Promise<unknown>;
}

const STATEMENT_TIMEOUT_ERROR_CODE = "57014";

const normalizePositiveTimeoutMs = (timeoutMs: number | undefined): number | null => {
  if (timeoutMs === undefined) {
    return null;
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return null;
  }
  return Math.floor(timeoutMs);
};

export async function applyLocalStatementTimeout(
  executor: SqlExecutor,
  timeoutMs: number | undefined,
): Promise<number | null> {
  const normalizedTimeoutMs = normalizePositiveTimeoutMs(timeoutMs);
  if (normalizedTimeoutMs === null) {
    return null;
  }

  await executor.execute(sql.raw(`set local statement_timeout = ${normalizedTimeoutMs}`));
  return normalizedTimeoutMs;
}

export const isStatementTimeoutError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const pgError = error as { code?: unknown; message?: unknown };
  if (pgError.code === STATEMENT_TIMEOUT_ERROR_CODE) {
    return true;
  }

  if (typeof pgError.message !== "string") {
    return false;
  }

  return pgError.message.toLowerCase().includes("statement timeout");
};
