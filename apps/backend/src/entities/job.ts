import {
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { z } from "zod";

export const jobStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "RETRY",
  "SUCCEEDED",
  "FAILED",
  "MISSED",
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const jobs = pgTable(
  "jobs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    jobType: text("job_type").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: text("status").$type<JobStatus>().notNull().default("PENDING"),
    runAt: timestamp("run_at").notNull(),
    // Legacy rollout columns stay in schema until the later contract/drop slice.
    earlyToleranceMs: integer("early_tolerance_ms").notNull().default(0),
    lateToleranceMs: integer("late_tolerance_ms").notNull().default(0),
    resolutionMs: integer("resolution_ms").notNull(),
    earlyToleranceUnits: integer("early_tolerance_units").notNull(),
    lateToleranceUnits: integer("late_tolerance_units").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    leaseUntil: timestamp("lease_until"),
    leasedBy: text("leased_by"),
    dedupeKey: text("dedupe_key"),
    lastAttemptedAt: timestamp("last_attempted_at"),
    lastError: text("last_error"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    statusRunAtIdx: index("jobs_status_run_at_idx").on(table.status, table.runAt),
    leaseUntilIdx: index("jobs_lease_until_idx").on(table.leaseUntil),
    jobTypeStatusIdx: index("jobs_job_type_status_idx").on(table.jobType, table.status),
    activeDedupeKeyUq: uniqueIndex("jobs_active_dedupe_key_uq")
      .on(table.dedupeKey)
      .where(
        sql`${table.dedupeKey} is not null and ${table.status} in ('PENDING', 'RETRY', 'RUNNING')`,
      ),
  }),
);

export const insertJobSchema = createInsertSchema(jobs);
export const selectJobSchema = createSelectSchema(jobs);

export type JobRow = typeof jobs.$inferSelect;
export type NewJobRow = typeof jobs.$inferInsert;
