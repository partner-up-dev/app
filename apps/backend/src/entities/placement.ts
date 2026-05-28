import { bigserial, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { ButtonPlacementCreative, PlacementSlotKey, PlacementTarget, PlacementType } from "../domains/merchandising";

export type PlacementStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

export const placements = pgTable(
  "placements",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    status: text("status").$type<PlacementStatus>().notNull().default("DRAFT"),
    slotKey: text("slot_key").$type<PlacementSlotKey>().notNull(),
    placementType: text("placement_type").$type<PlacementType>().notNull(),
    matchingRule: jsonb("matching_rule").$type<unknown>().notNull(),
    priority: integer("priority").notNull().default(0),
    creative: jsonb("creative").$type<ButtonPlacementCreative>().notNull(),
    target: jsonb("target").$type<PlacementTarget>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slotStatusPriorityIdx: index("placements_slot_status_priority_idx").on(
      table.slotKey,
      table.status,
      table.priority,
    ),
  }),
);

export type Placement = typeof placements.$inferSelect;
export type NewPlacement = typeof placements.$inferInsert;
export type PlacementId = Placement["id"];
