import { z } from "zod";
import { meetingPointConfigSchema } from "./meeting-point";

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

export const prStatusSchema = z.enum(["DRAFT", "OPEN", "READY", "ACTIVE", "CLOSED", "EXPIRED"]);
export type PRStatus = z.infer<typeof prStatusSchema>;

export const prStatusManualSchema = z.enum(["OPEN", "READY", "ACTIVE", "CLOSED"]);
export type PRStatusManual = z.infer<typeof prStatusManualSchema>;

export const visibilityStatusSchema = z.enum(["VISIBLE", "HIDDEN"]);
export type VisibilityStatus = z.infer<typeof visibilityStatusSchema>;

export const createPRStructuredStatusSchema = z.literal("DRAFT");
export type CreatePRStructuredStatus = z.infer<typeof createPRStructuredStatusSchema>;

export const createStructuredPRSchema = partnerRequestFieldsSchema;

export const createNaturalLanguagePRSchema = z.object({
  rawText: z.string().min(1).max(2000),
  nowIso: instantDateTimeSchema,
  nowWeekday: weekdayLabelSchema.nullable().optional(),
});
