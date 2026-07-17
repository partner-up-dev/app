import { pgTable, bigserial, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const operationResultStatusSchema = z.enum(["success", "failure"]);
export type OperationResultStatus = z.infer<typeof operationResultStatusSchema>;

export const operationLogs = pgTable("operation_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: text("aggregate_id").notNull(),
  detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  resultStatus: text("result_status").$type<OperationResultStatus>().notNull().default("success"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOperationLogSchema = createInsertSchema(operationLogs);
export const selectOperationLogSchema = createSelectSchema(operationLogs);

export type OperationLogRow = typeof operationLogs.$inferSelect;
export type NewOperationLogRow = typeof operationLogs.$inferInsert;
