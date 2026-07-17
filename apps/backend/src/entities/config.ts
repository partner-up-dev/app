import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const config = pgTable("config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const insertConfigSchema = createInsertSchema(config);
export const selectConfigSchema = createSelectSchema(config);

export type ConfigRow = typeof config.$inferSelect;
export type NewConfigRow = typeof config.$inferInsert;
