import type { db } from "../lib/db";

type TransactionCallback = Parameters<typeof db.transaction>[0];
type TransactionExecutor = Parameters<TransactionCallback>[0];

export type RepositoryExecutor = typeof db | TransactionExecutor;
