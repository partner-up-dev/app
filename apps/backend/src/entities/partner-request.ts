import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { type PRJoinGateConfig, prJoinGateConfigSchema } from "../domains/pr/contracts/join-gate";
import {
  type MeetingPointConfig,
  meetingPointConfigSchema,
} from "../domains/pr/contracts/meeting-point";
import {
  type PRAllowEditAfterReady,
  prAllowEditAfterReadySchema,
  type PRRoute,
  prRouteSchema,
  type PRStatus,
  partnerRequestFieldsObjectSchema,
  prStatusSchema,
  type VisibilityStatus,
  visibilityStatusSchema,
} from "../domains/pr/contracts/partner-request";
import {
  type FeedbackQuestionnaireInstanceId,
  feedbackQuestionnaireInstances,
} from "./feedback-questionnaire";
import type { TradeOrderId } from "./trade-order";
import { type UserId, users } from "./user";

/** Durable identity for one actual READY entry of a PartnerRequest. */
export const prReadyCycleIdSchema = z.string().uuid();
export type PRReadyCycleId = z.infer<typeof prReadyCycleIdSchema>;

export const paymentModelSchema = z.enum(["A", "C"]);
export type PaymentModel = z.infer<typeof paymentModelSchema>;

// Compatibility surface: stable PR values are owned by the PR domain.
export {
  coordinatePairSchema,
  createNaturalLanguagePRSchema,
  createPRStructuredStatusSchema,
  createStructuredPRSchema,
  naturalLanguagePartnerRequestFieldsObjectSchema,
  naturalLanguagePartnerRequestFieldsSchema,
  partnerRequestFieldsObjectSchema,
  partnerRequestFieldsSchema,
  prAllowEditAfterReadySchema,
  prRoutePointSchema,
  prRouteSchema,
  prStatusManualSchema,
  prStatusSchema,
  visibilityStatusSchema,
} from "../domains/pr/contracts/partner-request";
export type {
  CoordinatePair,
  CreatePRStructuredStatus,
  NaturalLanguagePartnerRequestFields,
  PartnerRequestFields,
  PRAllowEditAfterReady,
  PRRoute,
  PRRoutePoint,
  PRStatus,
  PRStatusManual,
  PRTimeWindow,
  VisibilityStatus,
  WeekdayLabel,
} from "../domains/pr/contracts/partner-request";

// Poster cache schemas
export const xiaohongshuPosterSchema = z.object({
  caption: z.string(),
  posterStylePrompt: z.string(),
  posterUrl: z.string().url(),
  createdAt: z.string().datetime(),
});

export const wechatThumbnailSchema = z.object({
  style: z.number().int().nonnegative(),
  posterUrl: z.string().url(),
  createdAt: z.string().datetime(),
});

export type XiaohongshuPosterCache = z.infer<typeof xiaohongshuPosterSchema>;
export type WechatThumbnailCache = z.infer<typeof wechatThumbnailSchema>;

// Drizzle table definition
export const partnerRequests = pgTable("partner_requests", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: text("title"),
  type: text("type").notNull(),
  time: text("time_window")
    .array()
    .$type<[string | null, string | null]>()
    .notNull()
    .default(sql`ARRAY[NULL, NULL]::text[]`),
  location: text("location"),
  route: jsonb("route").$type<PRRoute | null>().default(null),
  status: text("status").$type<PRStatus>().notNull().default("OPEN"),
  /**
   * The last READY-entry cycle. It is authoritative for delayed PR-ready
   * work only while this request is currently READY or ACTIVE.
   */
  readyCycleId: uuid("ready_cycle_id").$type<PRReadyCycleId>(),
  visibilityStatus: text("visibility_status")
    .$type<VisibilityStatus>()
    .notNull()
    .default("VISIBLE"),
  confirmationEnabled: boolean("confirmation_enabled").notNull().default(true),
  confirmationStartOffsetMinutes: integer("confirmation_start_offset_minutes"),
  confirmationEndOffsetMinutes: integer("confirmation_end_offset_minutes"),
  joinLockOffsetMinutes: integer("join_lock_offset_minutes"),
  minPartners: integer("min_partners"),
  maxPartners: integer("max_partners"),
  budget: text("budget"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  preferences: text("preferences")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  notes: text("notes"),
  meetingPoint: jsonb("meeting_point").$type<MeetingPointConfig | null>().default(null),
  allowEditAfterReady: jsonb("allow_edit_after_ready")
    .$type<PRAllowEditAfterReady | null>()
    .default(null),
  joinGateConfig: jsonb("join_gate_config")
    .$type<PRJoinGateConfig>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  orders: uuid("orders")
    .array()
    .$type<TradeOrderId[]>()
    .notNull()
    .default(sql`ARRAY[]::uuid[]`),
  feedbackQuestionnaireInstanceId: bigint("feedback_questionnaire_instance_id", {
    mode: "number",
  })
    .$type<FeedbackQuestionnaireInstanceId | null>()
    .references(() => feedbackQuestionnaireInstances.id, {
      onDelete: "set null",
    }),
  createdBy: uuid("created_by")
    .$type<UserId | null>()
    .references(() => users.id, { onDelete: "set null" }),
  xiaohongshuPoster: jsonb("xiaohongshu_poster")
    .$type<XiaohongshuPosterCache | null>()
    .default(null),
  wechatThumbnail: jsonb("wechat_thumbnail").$type<WechatThumbnailCache | null>().default(null),
});

// Zod schemas for validation
export const insertPartnerRequestSchema = createInsertSchema(partnerRequests, {
  time: partnerRequestFieldsObjectSchema.shape.time,
  minPartners: partnerRequestFieldsObjectSchema.shape.minPartners,
  maxPartners: partnerRequestFieldsObjectSchema.shape.maxPartners,
  status: prStatusSchema,
  visibilityStatus: visibilityStatusSchema,
  route: prRouteSchema.nullable().optional(),
  meetingPoint: meetingPointConfigSchema.nullable().optional(),
  allowEditAfterReady: prAllowEditAfterReadySchema.nullable().optional(),
  joinGateConfig: prJoinGateConfigSchema.optional(),
});

export const selectPartnerRequestSchema = createSelectSchema(partnerRequests, {
  time: partnerRequestFieldsObjectSchema.shape.time,
  minPartners: partnerRequestFieldsObjectSchema.shape.minPartners,
  maxPartners: partnerRequestFieldsObjectSchema.shape.maxPartners,
  budget: partnerRequestFieldsObjectSchema.shape.budget,
  status: prStatusSchema,
  visibilityStatus: visibilityStatusSchema,
  route: prRouteSchema.nullable(),
  meetingPoint: meetingPointConfigSchema.nullable(),
  allowEditAfterReady: prAllowEditAfterReadySchema.nullable(),
  joinGateConfig: prJoinGateConfigSchema,
});

// Type inference
export type PartnerRequest = typeof partnerRequests.$inferSelect;
export type NewPartnerRequest = typeof partnerRequests.$inferInsert;
export type PRId = PartnerRequest["id"];
