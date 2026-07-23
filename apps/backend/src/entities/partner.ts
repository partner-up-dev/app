import { bigint, boolean, bigserial, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { type UserId, users } from "./user";
import { type PRId, partnerRequests } from "./partner-request";

export const partnerIdSchema = z.number().int().positive();

export type PartnerId = z.infer<typeof partnerIdSchema>;

export const waitlistCycleIdSchema = z.string().uuid();

export type WaitlistCycleId = z.infer<typeof waitlistCycleIdSchema>;

export const admissionCycleIdSchema = z.string().uuid();

/**
 * Durable identity for one active admission of a reusable Partner slot.
 * Unlike a row ID, it changes on every direct re-entry or waitlist promotion.
 */
export type AdmissionCycleId = z.infer<typeof admissionCycleIdSchema>;

export const partnerStatusSchema = z.enum([
  "PENDING",
  "CANCELLED",
  "JOINED",
  "CONFIRMED",
  "EXITED",
  "RELEASED",
  "ATTENDED",
]);
export type PartnerStatus = z.infer<typeof partnerStatusSchema>;

export const partnerPaymentStatusSchema = z.enum(["NONE", "PENDING", "PAID", "FAILED"]);
export type PartnerPaymentStatus = z.infer<typeof partnerPaymentStatusSchema>;

export const partners = pgTable("partners", {
  id: bigserial("id", { mode: "number" }).$type<PartnerId>().primaryKey(),
  prId: bigint("pr_id", { mode: "number" })
    .$type<PRId>()
    .notNull()
    .references(() => partnerRequests.id, { onDelete: "cascade" }),
  status: text("status").$type<PartnerStatus>().notNull().default("JOINED"),
  userId: uuid("user_id")
    .$type<UserId>()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  waitlistedAt: timestamp("waitlisted_at"),
  /**
   * Durable identity for one waitlist entry. It survives that entry's
   * promotion so a delayed task can distinguish it from a later re-entry of
   * the same reusable Partner slot.
   */
  waitlistCycleId: uuid("waitlist_cycle_id").$type<WaitlistCycleId>(),
  /**
   * Retained after exit/release so delayed active-admission work can prove it
   * still belongs to the same membership lifecycle.
   */
  admissionCycleId: uuid("admission_cycle_id").$type<AdmissionCycleId>(),
  confirmedAt: timestamp("confirmed_at"),
  exitedAt: timestamp("exited_at"),
  releasedAt: timestamp("released_at"),
  releaseReason: text("release_reason"),
  alternativePrReminderOptIn: boolean("alternative_pr_reminder_opt_in").notNull().default(false),
  alternativePrReminderOptedInAt: timestamp("alternative_pr_reminder_opted_in_at"),
  attendedAt: timestamp("attended_at"),
  checkInAt: timestamp("check_in_at"),
  didAttend: boolean("did_attend"),
  paymentStatus: text("payment_status").$type<PartnerPaymentStatus>().notNull().default("NONE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPartnerSchema = createInsertSchema(partners);
export const selectPartnerSchema = createSelectSchema(partners);

export type Partner = typeof partners.$inferSelect;
export type NewPartner = typeof partners.$inferInsert;
