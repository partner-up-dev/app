import { bigserial, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { type PRRoute, prRouteSchema } from "../domains/pr/contracts/partner-request";
import { prTypeConfigs } from "./pr-type-config";
import { type UserId, users } from "./user";

export const prTypeRouteApplicationStatusSchema = z.enum(["PENDING", "ACCEPTED", "REJECTED"]);
export type PRTypeRouteApplicationStatus = z.infer<typeof prTypeRouteApplicationStatusSchema>;

export const prTypeRouteApplications = pgTable("pr_type_route_applications", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  type: text("type")
    .notNull()
    .references(() => prTypeConfigs.type, { onDelete: "cascade" }),
  route: jsonb("route").$type<PRRoute>().notNull(),
  status: text("status").$type<PRTypeRouteApplicationStatus>().notNull().default("PENDING"),
  submittedByUserId: uuid("submitted_by_user_id")
    .$type<UserId | null>()
    .references(() => users.id, { onDelete: "set null" }),
  reviewedByUserId: uuid("reviewed_by_user_id")
    .$type<UserId | null>()
    .references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  rejectReason: text("reject_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPRTypeRouteApplicationSchema = createInsertSchema(prTypeRouteApplications, {
  route: prRouteSchema,
  status: prTypeRouteApplicationStatusSchema.optional(),
});

export const selectPRTypeRouteApplicationSchema = createSelectSchema(prTypeRouteApplications, {
  route: prRouteSchema,
  status: prTypeRouteApplicationStatusSchema,
});

export type PRTypeRouteApplication = typeof prTypeRouteApplications.$inferSelect;
export type NewPRTypeRouteApplication = typeof prTypeRouteApplications.$inferInsert;
export type PRTypeRouteApplicationId = PRTypeRouteApplication["id"];
