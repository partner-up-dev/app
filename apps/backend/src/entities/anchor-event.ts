import {
  pgTable,
  bigserial,
  text,
  jsonb,
  timestamp,
  integer,
  bigint,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  meetingPointConfigMapSchema,
  meetingPointConfigSchema,
  type MeetingPointConfig,
  type MeetingPointConfigMap,
} from "./meeting-point";
import {
  prJoinGateConfigSchema,
  type PRJoinGateConfig,
} from "./join-gate";
import {
  feedbackQuestionnaireTemplates,
  type FeedbackQuestionnaireTemplateId,
} from "./feedback-questionnaire";
import { prRouteSchema } from "./partner-request";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const anchorEventStatusSchema = z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]);
export type AnchorEventStatus = z.infer<typeof anchorEventStatusSchema>;
export const anchorEventPrCreationPolicySchema = z.enum([
  "USER_AND_ADMIN",
  "ADMIN_ONLY",
]);
export type AnchorEventPrCreationPolicy = z.infer<
  typeof anchorEventPrCreationPolicySchema
>;
export const anchorEventParticipationFrequencyLimitSchema = z
  .object({
    intervalPrCount: z.number().int().positive(),
  })
  .nullable();
export type AnchorEventParticipationFrequencyLimit = z.infer<
  typeof anchorEventParticipationFrequencyLimitSchema
>;
export const anchorEventFullPrExpansionPolicySchema = z.enum([
  "ENABLED",
  "DISABLED",
]);
export type AnchorEventFullPrExpansionPolicy = z.infer<
  typeof anchorEventFullPrExpansionPolicySchema
>;
export const anchorEventPrTimeWindowEditorDefaultModeSchema = z.enum([
  "NORMAL",
  "FUZZY",
  "ADVANCED",
]);
export type AnchorEventPrTimeWindowEditorDefaultMode = z.infer<
  typeof anchorEventPrTimeWindowEditorDefaultModeSchema
>;

/** A location entry: POI.name or a free-form location label. */
export const locationEntrySchema = z.string().trim().min(1);
export type LocationEntry = z.infer<typeof locationEntrySchema>;

type LegacyLocationEntry = {
  id?: unknown;
  key?: unknown;
  label?: unknown;
};

const normalizeLocationString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeLocationValue = (value: unknown): string | null => {
  const direct = normalizeLocationString(value);
  if (direct) {
    return direct;
  }

  if (typeof value === "object" && value !== null) {
    const entry = value as LegacyLocationEntry;
    const id = normalizeLocationString(entry.id);
    if (id) return id;
    const key = normalizeLocationString(entry.key);
    if (key) return key;
    const label = normalizeLocationString(entry.label);
    if (label) return label;
  }

  return null;
};

export const normalizeLocationPool = (rawPool: unknown): LocationEntry[] => {
  if (!Array.isArray(rawPool)) {
    return [];
  }

  const unique = new Set<LocationEntry>();
  for (const item of rawPool) {
    const normalized = normalizeLocationValue(item);
    if (!normalized) continue;
    unique.add(normalized);
  }

  return Array.from(unique);
};

export const anchorEventRoutePoolEntrySchema = z.object({
  id: z.string().trim().min(1).max(120),
  route: prRouteSchema,
});
export type AnchorEventRoutePoolEntry = z.infer<
  typeof anchorEventRoutePoolEntrySchema
>;

export const anchorEventRoutePoolSchema = z
  .array(anchorEventRoutePoolEntrySchema)
  .superRefine((entries, ctx) => {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      if (seen.has(entry.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Route pool entry id must be unique within the anchor event",
          path: [index, "id"],
        });
        return;
      }
      seen.add(entry.id);
    });
  });
export type AnchorEventRoutePool = z.infer<typeof anchorEventRoutePoolSchema>;

export const normalizeAnchorEventRoutePool = (
  rawPool: unknown,
): AnchorEventRoutePool => {
  if (!Array.isArray(rawPool)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: AnchorEventRoutePool = [];
  for (const item of rawPool) {
    const parsed = anchorEventRoutePoolEntrySchema.safeParse(item);
    if (!parsed.success) {
      continue;
    }

    if (seen.has(parsed.data.id)) {
      continue;
    }

    seen.add(parsed.data.id);
    normalized.push(parsed.data);
  }

  return normalized;
};

/** A time-window entry: [start, end] in the same format PR uses (ISO date or datetime, nullable) */
export const timeWindowEntrySchema = z.tuple([
  z.string().nullable(),
  z.string().nullable(),
]);
export type TimeWindowEntry = z.infer<typeof timeWindowEntrySchema>;

const isoDateTimeWithOffsetSchema = z.string().datetime({ offset: true });
const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);
const startRuleDescriptionMaxLength = 280;
const startRuleDescriptionSchema = z
  .string()
  .trim()
  .max(startRuleDescriptionMaxLength)
  .nullable()
  .default(null);

export const anchorEventAbsoluteStartRuleSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("ABSOLUTE"),
  startAt: isoDateTimeWithOffsetSchema,
  description: startRuleDescriptionSchema,
});
export type AnchorEventAbsoluteStartRule = z.infer<
  typeof anchorEventAbsoluteStartRuleSchema
>;

export const anchorEventRecurringStartRuleSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("RECURRING"),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  timeOfDay: timeOfDaySchema,
  description: startRuleDescriptionSchema,
});
export type AnchorEventRecurringStartRule = z.infer<
  typeof anchorEventRecurringStartRuleSchema
>;

export const anchorEventStartRuleSchema = z.discriminatedUnion("kind", [
  anchorEventAbsoluteStartRuleSchema,
  anchorEventRecurringStartRuleSchema,
]);
export type AnchorEventStartRule = z.infer<typeof anchorEventStartRuleSchema>;

export const anchorEventTimePoolConfigSchema = z
  .object({
    durationMinutes: z.number().int().positive().nullable(),
    earliestLeadMinutes: z.number().int().nonnegative().nullable(),
    startRules: z.array(anchorEventStartRuleSchema),
  })
  .superRefine((value, ctx) => {
    if (value.startRules.length > 0 && value.durationMinutes === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "durationMinutes is required when startRules are present",
        path: ["durationMinutes"],
      });
    }

    if (
      value.startRules.some((rule) => rule.kind === "RECURRING") &&
      value.earliestLeadMinutes === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "earliestLeadMinutes is required when recurring start rules are present",
        path: ["earliestLeadMinutes"],
      });
    }
  });
export type AnchorEventTimePoolConfig = z.infer<
  typeof anchorEventTimePoolConfigSchema
>;

const normalizeNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
};

const normalizePositiveIntegerValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
};

const normalizeRuleId = (
  value: unknown,
  fallback: string,
): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return fallback;
};

const normalizeTimeOfDayValue = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return timeOfDaySchema.safeParse(trimmed).success ? trimmed : null;
};

const normalizeIsoDateTimeWithOffset = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return isoDateTimeWithOffsetSchema.safeParse(trimmed).success ? trimmed : null;
};

const normalizeStartRuleDescription = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, startRuleDescriptionMaxLength);
};

const normalizeWeekdays = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const values = Array.from(
    new Set(
      value
        .flatMap((entry) => {
          if (typeof entry === "number" && Number.isInteger(entry)) {
            return [entry];
          }
          if (typeof entry === "string") {
            const parsed = Number(entry.trim());
            if (Number.isInteger(parsed)) {
              return [parsed];
            }
          }
          return [];
        })
        .filter((entry) => entry >= 0 && entry <= 6),
    ),
  );

  return values.sort((left, right) => left - right);
};

const normalizeStartRule = (
  value: unknown,
  index: number,
): AnchorEventStartRule | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const fallbackId = `rule-${index + 1}`;
  if (raw.kind === "ABSOLUTE") {
    const startAt = normalizeIsoDateTimeWithOffset(raw.startAt);
    if (!startAt) {
      return null;
    }
    return {
      id: normalizeRuleId(raw.id, fallbackId),
      kind: "ABSOLUTE",
      startAt,
      description: normalizeStartRuleDescription(raw.description),
    };
  }

  if (raw.kind === "RECURRING") {
    const timeOfDay = normalizeTimeOfDayValue(raw.timeOfDay);
    const weekdays = normalizeWeekdays(raw.weekdays);
    if (!timeOfDay || weekdays.length === 0) {
      return null;
    }
    return {
      id: normalizeRuleId(raw.id, fallbackId),
      kind: "RECURRING",
      weekdays,
      timeOfDay,
      description: normalizeStartRuleDescription(raw.description),
    };
  }

  return null;
};

export const emptyAnchorEventTimePoolConfig = (): AnchorEventTimePoolConfig => ({
  durationMinutes: null,
  earliestLeadMinutes: null,
  startRules: [],
});

export const normalizeAnchorEventTimePoolConfig = (
  rawConfig: unknown,
): AnchorEventTimePoolConfig => {
  if (typeof rawConfig !== "object" || rawConfig === null) {
    return emptyAnchorEventTimePoolConfig();
  }

  const raw = rawConfig as Record<string, unknown>;
  const startRules = Array.isArray(raw.startRules)
    ? raw.startRules
        .map((entry, index) => normalizeStartRule(entry, index))
        .filter((entry): entry is AnchorEventStartRule => entry !== null)
    : [];

  const normalized: AnchorEventTimePoolConfig = {
    durationMinutes: normalizePositiveIntegerValue(raw.durationMinutes),
    earliestLeadMinutes: normalizeNonNegativeInteger(raw.earliestLeadMinutes),
    startRules,
  };

  return anchorEventTimePoolConfigSchema.safeParse(normalized).success
    ? normalized
    : emptyAnchorEventTimePoolConfig();
};

// ---------------------------------------------------------------------------
// Drizzle table
// ---------------------------------------------------------------------------

export const anchorEvents = pgTable("anchor_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  locationPool: jsonb("location_pool")
    .$type<LocationEntry[]>()
    .notNull(),
  routePool: jsonb("route_pool")
    .$type<AnchorEventRoutePool>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  timePoolConfig: jsonb("time_pool_config")
    .$type<AnchorEventTimePoolConfig>()
    .notNull(),
  defaultMinPartners: integer("default_min_partners"),
  defaultMaxPartners: integer("default_max_partners"),
  defaultPrNotes: text("default_pr_notes"),
  defaultConfirmationEnabled: boolean("default_confirmation_enabled")
    .notNull()
    .default(true),
  defaultConfirmationStartOffsetMinutes: integer(
    "default_confirmation_start_offset_minutes",
  ),
  defaultConfirmationEndOffsetMinutes: integer(
    "default_confirmation_end_offset_minutes",
  ),
  defaultJoinLockOffsetMinutes: integer("default_join_lock_offset_minutes"),
  meetingPoint: jsonb("meeting_point")
    .$type<MeetingPointConfig | null>()
    .default(null),
  joinGateConfig: jsonb("join_gate_config")
    .$type<PRJoinGateConfig>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  participationFrequencyLimit: jsonb("participation_frequency_limit")
    .$type<AnchorEventParticipationFrequencyLimit>()
    .default(null),
  feedbackQuestionnaireTemplateId: bigint(
    "feedback_questionnaire_template_id",
    { mode: "number" },
  )
    .$type<FeedbackQuestionnaireTemplateId | null>()
    .references(() => feedbackQuestionnaireTemplates.id, {
      onDelete: "set null",
    }),
  locationMeetingPoints: jsonb("location_meeting_points")
    .$type<MeetingPointConfigMap>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  coverImage: text("cover_image"),
  betaGroupQrCode: text("beta_group_qr_code"),
  prCreationPolicy: text("pr_creation_policy")
    .$type<AnchorEventPrCreationPolicy>()
    .notNull()
    .default("USER_AND_ADMIN"),
  fullPrExpansionPolicy: text("full_pr_expansion_policy")
    .$type<AnchorEventFullPrExpansionPolicy>()
    .notNull()
    .default("DISABLED"),
  prTimeWindowEditorDefaultMode: text("pr_time_window_editor_default_mode")
    .$type<AnchorEventPrTimeWindowEditorDefaultMode>()
    .notNull()
    .default("NORMAL"),
  status: text("status").$type<AnchorEventStatus>().notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Drizzle-Zod
// ---------------------------------------------------------------------------

export const insertAnchorEventSchema = createInsertSchema(anchorEvents, {
  routePool: anchorEventRoutePoolSchema.optional(),
  timePoolConfig: anchorEventTimePoolConfigSchema,
  meetingPoint: meetingPointConfigSchema.nullable().optional(),
  joinGateConfig: prJoinGateConfigSchema.optional(),
  participationFrequencyLimit:
    anchorEventParticipationFrequencyLimitSchema.optional(),
  locationMeetingPoints: meetingPointConfigMapSchema.optional(),
  prTimeWindowEditorDefaultMode:
    anchorEventPrTimeWindowEditorDefaultModeSchema.optional(),
});
export const selectAnchorEventSchema = createSelectSchema(anchorEvents, {
  routePool: anchorEventRoutePoolSchema,
  timePoolConfig: anchorEventTimePoolConfigSchema,
  meetingPoint: meetingPointConfigSchema.nullable(),
  joinGateConfig: prJoinGateConfigSchema,
  participationFrequencyLimit: anchorEventParticipationFrequencyLimitSchema,
  locationMeetingPoints: meetingPointConfigMapSchema,
  prTimeWindowEditorDefaultMode:
    anchorEventPrTimeWindowEditorDefaultModeSchema,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnchorEvent = typeof anchorEvents.$inferSelect;
export type NewAnchorEvent = typeof anchorEvents.$inferInsert;
export type AnchorEventId = AnchorEvent["id"];
