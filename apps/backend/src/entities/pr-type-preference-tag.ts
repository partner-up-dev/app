import { sql } from "drizzle-orm";
import { bigserial, check, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { prTypeConfigs } from "./pr-type-config";

export const prTypePreferenceTagModerationStatusSchema = z.enum([
  "PENDING",
  "PUBLISHED",
  "REJECTED",
]);
export type PRTypePreferenceTagModerationStatus = z.infer<
  typeof prTypePreferenceTagModerationStatusSchema
>;

export const prTypePreferenceTagLabelSchema = z.string().trim().min(1).max(80);
export const prTypePreferenceTagDescriptionSchema = z.string().trim().max(280);

export const prTypePreferenceTags = pgTable(
  "pr_type_preference_tags",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    type: text("type")
      .notNull()
      .references(() => prTypeConfigs.type, { onDelete: "cascade" }),
    label: text("label").notNull(),
    description: text("description").notNull().default(""),
    moderationStatus: text("moderation_status")
      .$type<PRTypePreferenceTagModerationStatus>()
      .notNull()
      .default("PENDING"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("pr_type_preference_tags_type_label_uidx").on(table.type, table.label),
    check("pr_type_preference_tags_label_nonempty_chk", sql`length(btrim(${table.label})) > 0`),
    check(
      "pr_type_preference_tags_moderation_status_chk",
      sql`${table.moderationStatus} IN ('PENDING', 'PUBLISHED', 'REJECTED')`,
    ),
  ],
);

export const insertPRTypePreferenceTagSchema = createInsertSchema(prTypePreferenceTags, {
  label: prTypePreferenceTagLabelSchema,
  description: prTypePreferenceTagDescriptionSchema,
  moderationStatus: prTypePreferenceTagModerationStatusSchema,
});

export const selectPRTypePreferenceTagSchema = createSelectSchema(prTypePreferenceTags, {
  label: prTypePreferenceTagLabelSchema,
  description: prTypePreferenceTagDescriptionSchema,
  moderationStatus: prTypePreferenceTagModerationStatusSchema,
});

export type PRTypePreferenceTag = typeof prTypePreferenceTags.$inferSelect;
export type NewPRTypePreferenceTag = typeof prTypePreferenceTags.$inferInsert;
export type PRTypePreferenceTagId = PRTypePreferenceTag["id"];
