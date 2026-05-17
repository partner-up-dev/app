import {
  bigserial,
  bigint,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { anchorEvents } from "./anchor-event";
import { prRouteSchema, type PRRoute } from "./partner-request";
import { users, type UserId } from "./user";

export const anchorEventRouteApplicationStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
]);
export type AnchorEventRouteApplicationStatus = z.infer<
  typeof anchorEventRouteApplicationStatusSchema
>;

export const anchorEventRouteApplications = pgTable(
  "anchor_event_route_applications",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    anchorEventId: bigint("anchor_event_id", { mode: "number" })
      .notNull()
      .references(() => anchorEvents.id, { onDelete: "cascade" }),
    route: jsonb("route").$type<PRRoute>().notNull(),
    status: text("status")
      .$type<AnchorEventRouteApplicationStatus>()
      .notNull()
      .default("PENDING"),
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
  },
);

export const insertAnchorEventRouteApplicationSchema = createInsertSchema(
  anchorEventRouteApplications,
  {
    route: prRouteSchema,
    status: anchorEventRouteApplicationStatusSchema.optional(),
  },
);

export const selectAnchorEventRouteApplicationSchema = createSelectSchema(
  anchorEventRouteApplications,
  {
    route: prRouteSchema,
    status: anchorEventRouteApplicationStatusSchema,
  },
);

export type AnchorEventRouteApplication =
  typeof anchorEventRouteApplications.$inferSelect;
export type NewAnchorEventRouteApplication =
  typeof anchorEventRouteApplications.$inferInsert;
export type AnchorEventRouteApplicationId = AnchorEventRouteApplication["id"];
