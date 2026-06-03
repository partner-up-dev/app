import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../entities";
import { env } from "./env";

const POSTGRES_TIMESTAMPTZ_OID = 1184;

const client = postgres(env.DATABASE_URL, {
  connect_timeout: env.DB_CONNECT_TIMEOUT_SECONDS,
});
export const db = drizzle(client, { schema });

// Drizzle's postgres-js driver resets timestamp parsers to identity so typed
// column decoders can run. Raw db.execute() has no column decoder, so restore
// timestamptz as the system boundary type for instant values.
client.options.parsers[POSTGRES_TIMESTAMPTZ_OID] = (value: unknown) =>
  value instanceof Date ? value : new Date(String(value));

export const closeDb = async (): Promise<void> => {
  await client.end({ timeout: 5 });
};
