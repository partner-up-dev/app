import {
  bigint,
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
  "SKIPPED",
  "CANCELED",
  "FAILED",
  "MISSED",
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const jobCreationModeSchema = z.enum(["ONCE", "ONCE_PER_CAUSE", "UNTIL_ACKNOWLEDGED"]);
export type JobCreationMode = z.infer<typeof jobCreationModeSchema>;

export const jobReservationStateSchema = z.enum(["HELD", "RELEASED"]);
export type JobReservationState = z.infer<typeof jobReservationStateSchema>;

export const jobExecutionDispositionSchema = z.enum([
  "SUCCEEDED",
  "SKIPPED",
  "RETRYABLE_FAILURE",
  "PERMANENT_FAILURE",
]);
export type JobExecutionDisposition = z.infer<typeof jobExecutionDispositionSchema>;

export const jobs = pgTable(
  "jobs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    jobType: text("job_type").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    jobVersion: integer("job_version").notNull().default(1),
    status: text("status").$type<JobStatus>().notNull().default("PENDING"),
    runAt: timestamp("run_at").notNull(),
    resolutionMs: integer("resolution_ms").notNull(),
    earlyToleranceUnits: integer("early_tolerance_units").notNull(),
    lateToleranceUnits: integer("late_tolerance_units").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    leaseUntil: timestamp("lease_until"),
    leasedBy: text("leased_by"),
    leaseToken: text("lease_token"),
    dedupeKey: text("dedupe_key"),
    creationMode: text("creation_mode").$type<JobCreationMode>().notNull().default("ONCE"),
    creationKey: text("creation_key"),
    reservationState: text("reservation_state").$type<JobReservationState>(),
    windowStartCursor: bigint("window_start_cursor", { mode: "number" }),
    highWaterCursor: bigint("high_water_cursor", { mode: "number" }),
    releasedAt: timestamp("released_at"),
    lastAttemptedAt: timestamp("last_attempted_at"),
    lastError: text("last_error"),
    lastDisposition: text("last_disposition").$type<JobExecutionDisposition>(),
    lastReason: text("last_reason"),
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
    oncePerCauseCreationKeyUq: uniqueIndex("jobs_once_per_cause_creation_key_uq")
      .on(table.jobType, table.creationKey)
      .where(sql`${table.creationMode} = 'ONCE_PER_CAUSE' and ${table.creationKey} is not null`),
    heldCreationReservationUq: uniqueIndex("jobs_held_creation_reservation_uq")
      .on(table.jobType, table.creationKey)
      .where(
        sql`${table.creationMode} = 'UNTIL_ACKNOWLEDGED' and ${table.reservationState} = 'HELD' and ${table.creationKey} is not null`,
      ),
    creationLookupIdx: index("jobs_creation_lookup_idx").on(
      table.jobType,
      table.creationMode,
      table.creationKey,
      table.reservationState,
    ),
  }),
);

export const insertJobSchema = createInsertSchema(jobs);
export const selectJobSchema = createSelectSchema(jobs);

export type JobRow = typeof jobs.$inferSelect;
export type NewJobRow = typeof jobs.$inferInsert;
