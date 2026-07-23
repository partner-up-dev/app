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
import {
  type FeedbackQuestionnaireInstanceId,
  feedbackQuestionnaireInstances,
} from "./feedback-questionnaire";
import { type PRJoinGateConfig, prJoinGateConfigSchema } from "./join-gate";
import { type MeetingPointConfig, meetingPointConfigSchema } from "./meeting-point";
import type { TradeOrderId } from "./trade-order";
import { type UserId, users } from "./user";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const instantDateTimeSchema = z.string().datetime({ offset: true });
const naturalLanguageDateOrInstantSchema = z.union([instantDateTimeSchema, isoDateSchema]);
const partnerSlotIdSchema = z.number().int().positive();
const weekdayLabelSchema = z.string().trim().min(1).max(32);
export type WeekdayLabel = z.infer<typeof weekdayLabelSchema>;
export const coordinatePairSchema = z.tuple([z.number(), z.number()]);
export type CoordinatePair = z.infer<typeof coordinatePairSchema>;
export const prRoutePointSchema = z
  .object({
    wgs84: coordinatePairSchema.nullable(),
    bd09: coordinatePairSchema.nullable(),
    gcj02: coordinatePairSchema.nullable(),
    name: z.string().trim().min(1),
    full_address: z.string().trim().nullable(),
  })
  .superRefine((point, ctx) => {
    if (point.wgs84 !== null || point.bd09 !== null || point.gcj02 !== null) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Route point requires at least one coordinate pair",
      path: ["gcj02"],
    });
  });
export type PRRoutePoint = z.infer<typeof prRoutePointSchema>;
export const prRouteSchema = z.array(prRoutePointSchema).min(2);
export type PRRoute = z.infer<typeof prRouteSchema>;

export const prAllowEditAfterReadySchema = z
  .object({
    timeWindow: z.tuple([instantDateTimeSchema, instantDateTimeSchema]).optional(),
    location: z.literal(true).optional(),
    route: z.literal(true).optional(),
  })
  .strict();
export type PRAllowEditAfterReady = z.infer<typeof prAllowEditAfterReadySchema>;

// Partner request fields (from LLM / client edits)
export const partnerRequestFieldsObjectSchema = z.object({
  title: z.string().optional(),
  type: z.string(),
  time: z.tuple([instantDateTimeSchema.nullable(), instantDateTimeSchema.nullable()]),
  location: z.string().nullable(),
  route: prRouteSchema.nullable().default(null),
  minPartners: z.number().int().nonnegative().nullable(),
  maxPartners: z.number().int().nonnegative().nullable(),
  partners: z.array(partnerSlotIdSchema).default([]),
  budget: z.string().nullable(),
  preferences: z.array(z.string()),
  notes: z.string().nullable(),
  meetingPoint: meetingPointConfigSchema.nullable().optional(),
});

export const partnerRequestFieldsSchema = partnerRequestFieldsObjectSchema.superRefine(
  (fields, ctx) => {
    const hasLocation = (fields.location?.trim() ?? "").length > 0;
    if (hasLocation && fields.route !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PartnerRequest must use either location or route",
        path: ["route"],
      });
    }
  },
);

export type PartnerRequestFields = z.infer<typeof partnerRequestFieldsSchema>;
export type PRTimeWindow = PartnerRequestFields["time"];

export const naturalLanguagePartnerRequestFieldsObjectSchema =
  partnerRequestFieldsObjectSchema.extend({
    time: z.tuple([
      naturalLanguageDateOrInstantSchema.nullable(),
      naturalLanguageDateOrInstantSchema.nullable(),
    ]),
  });

export const naturalLanguagePartnerRequestFieldsSchema =
  naturalLanguagePartnerRequestFieldsObjectSchema.superRefine((fields, ctx) => {
    const hasLocation = (fields.location?.trim() ?? "").length > 0;
    if (hasLocation && fields.route !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PartnerRequest must use either location or route",
        path: ["route"],
      });
    }
  });

export type NaturalLanguagePartnerRequestFields = z.infer<
  typeof naturalLanguagePartnerRequestFieldsSchema
>;

// Status enum
export const prStatusSchema = z.enum(["DRAFT", "OPEN", "READY", "ACTIVE", "CLOSED", "EXPIRED"]);
export type PRStatus = z.infer<typeof prStatusSchema>;
export const prStatusManualSchema = z.enum(["OPEN", "READY", "ACTIVE", "CLOSED"]);
export type PRStatusManual = z.infer<typeof prStatusManualSchema>;

/** Durable identity for one actual READY entry of a PartnerRequest. */
export const prReadyCycleIdSchema = z.string().uuid();
export type PRReadyCycleId = z.infer<typeof prReadyCycleIdSchema>;

export const visibilityStatusSchema = z.enum(["VISIBLE", "HIDDEN"]);
export type VisibilityStatus = z.infer<typeof visibilityStatusSchema>;

export const paymentModelSchema = z.enum(["A", "C"]);
export type PaymentModel = z.infer<typeof paymentModelSchema>;

export const createPRStructuredStatusSchema = z.literal("DRAFT");
export type CreatePRStructuredStatus = z.infer<typeof createPRStructuredStatusSchema>;

export const createStructuredPRSchema = partnerRequestFieldsSchema;

export const createNaturalLanguagePRSchema = z.object({
  rawText: z.string().min(1).max(2000),
  nowIso: instantDateTimeSchema,
  nowWeekday: weekdayLabelSchema.nullable().optional(),
});

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
