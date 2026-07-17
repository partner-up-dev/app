import { doublePrecision, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users, type UserId } from "./user";

export const userReliability = pgTable("user_reliability", {
  userId: uuid("user_id")
    .$type<UserId>()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  reliabilityJoinCount: integer("reliability_join_count").notNull().default(0),
  reliabilityConfirmCount: integer("reliability_confirm_count").notNull().default(0),
  reliabilityAttendCount: integer("reliability_attend_count").notNull().default(0),
  reliabilityReleaseCount: integer("reliability_release_count").notNull().default(0),
  joinToConfirmRatio: doublePrecision("join_to_confirm_ratio").notNull().default(0),
  confirmToAttendRatio: doublePrecision("confirm_to_attend_ratio").notNull().default(0),
  releaseFrequency: doublePrecision("release_frequency").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserReliabilitySchema = createInsertSchema(userReliability);
export const selectUserReliabilitySchema = createSelectSchema(userReliability);

export type UserReliability = typeof userReliability.$inferSelect;
export type NewUserReliability = typeof userReliability.$inferInsert;
