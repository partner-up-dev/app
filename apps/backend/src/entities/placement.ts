import { sql } from "drizzle-orm";
import { bigint, bigserial, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { offers, type OfferId } from "./offer";
import type {
  ButtonPlacementCreative,
  PlacementBindingRule,
  PlacementMatchingRuleJson,
  PlacementType,
} from "../domains/merchandising/model";

export type PlacementStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

export const placements = pgTable(
  "placements",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    status: text("status").$type<PlacementStatus>().notNull().default("DRAFT"),
    placementType: text("placement_type").$type<PlacementType>().notNull(),
    offerId: bigint("offer_id", { mode: "number" })
      .$type<OfferId>()
      .notNull()
      .references(() => offers.id, { onDelete: "restrict" }),
    matchingRule: jsonb("matching_rule").$type<PlacementMatchingRuleJson>().notNull(),
    priority: integer("priority").notNull().default(0),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    creative: jsonb("creative").$type<ButtonPlacementCreative>().notNull(),
    bindingRules: jsonb("binding_rules")
      .$type<PlacementBindingRule[]>()
      .notNull()
      .default(sql`'[
        {
          "fieldKey": "participantCount",
          "contextPath": "activeParticipantCount",
          "lock": true
        },
        {
          "fieldKey": "serviceStartAt",
          "contextPath": "time.startAt",
          "lock": true
        },
        {
          "fieldKey": "serviceEndAt",
          "contextPath": "time.endAt",
          "lock": true
        }
      ]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeStatusPriorityIdx: index("placements_type_status_priority_idx").on(
      table.placementType,
      table.status,
      table.priority,
    ),
  }),
);

export type Placement = typeof placements.$inferSelect;
export type NewPlacement = typeof placements.$inferInsert;
export type PlacementId = Placement["id"];
