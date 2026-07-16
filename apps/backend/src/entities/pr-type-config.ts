import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { feedbackQuestionnaireTemplates } from "./feedback-questionnaire";
import { prJoinGateConfigSchema } from "./join-gate";
import { meetingPointConfigMapSchema, meetingPointConfigSchema } from "./meeting-point";
import { prRouteSchema } from "./partner-request";

/** Discovery assignment weights. Consumers resolve an all-zero tuple to LIST. */
export const prTypeConfigDiscoveryRatioSchema = z.number().int().nonnegative();
export const prTypeConfigTypeSchema = z.string().trim().min(1);
export const prTypeConfigLocationEntrySchema = z.string().trim().min(1);
export const prTypeConfigLocationPoolSchema = z
  .array(prTypeConfigLocationEntrySchema)
  .superRefine((entries, ctx) => {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      if (seen.has(entry)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Location pool entries must be unique within the PR type",
          path: [index],
        });
        return;
      }
      seen.add(entry);
    });
  });

export const prTypeConfigRoutePoolSchema = z
  .array(
    z.object({
      id: z.string().trim().min(1).max(120),
      route: prRouteSchema,
    }),
  )
  .superRefine((entries, ctx) => {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      if (seen.has(entry.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Route pool entry id must be unique within the PR type",
          path: [index, "id"],
        });
        return;
      }
      seen.add(entry.id);
    });
  });

const isoDateTimeWithOffsetSchema = z.string().datetime({ offset: true });
const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/);
const startRuleDescriptionSchema = z.string().trim().max(280).nullable().default(null);

const prTypeConfigAbsoluteStartRuleSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("ABSOLUTE"),
  startAt: isoDateTimeWithOffsetSchema,
  description: startRuleDescriptionSchema,
});

const prTypeConfigRecurringStartRuleSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.literal("RECURRING"),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  timeOfDay: timeOfDaySchema,
  description: startRuleDescriptionSchema,
});

const prTypeConfigStartRuleSchema = z.discriminatedUnion("kind", [
  prTypeConfigAbsoluteStartRuleSchema,
  prTypeConfigRecurringStartRuleSchema,
]);

export const prTypeConfigTimePoolConfigSchema = z
  .object({
    durationMinutes: z.number().int().positive().nullable(),
    earliestLeadMinutes: z.number().int().nonnegative().nullable(),
    startRules: z.array(prTypeConfigStartRuleSchema),
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
        message: "earliestLeadMinutes is required when recurring start rules are present",
        path: ["earliestLeadMinutes"],
      });
    }
  });

export const prTypeConfigParticipationFrequencyLimitSchema = z
  .object({ intervalPrCount: z.number().int().positive() })
  .nullable();
export const prTypeConfigAuthoringCreationPolicySchema = z.enum(["USER_AND_ADMIN", "ADMIN_ONLY"]);
export const prTypeConfigFullCapacityExpansionPolicySchema = z.enum(["ENABLED", "DISABLED"]);
export const prTypeConfigTimeWindowEditorDefaultModeSchema = z.enum([
  "NORMAL",
  "FUZZY",
  "ADVANCED",
]);
export type PRTypeConfigTimeWindowEditorDefaultMode = z.infer<
  typeof prTypeConfigTimeWindowEditorDefaultModeSchema
>;

export const prTypeConfigs = pgTable(
  "pr_type_configs",
  {
    type: text("type").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    locationPool: jsonb("location_pool").$type<string[]>().notNull(),
    routePool: jsonb("route_pool")
      .$type<z.infer<typeof prTypeConfigRoutePoolSchema>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    timePoolConfig: jsonb("time_pool_config")
      .$type<z.infer<typeof prTypeConfigTimePoolConfigSchema>>()
      .notNull(),
    authoringTimeWindowEditorDefaultMode: text("authoring_time_window_editor_default_mode")
      .$type<z.infer<typeof prTypeConfigTimeWindowEditorDefaultModeSchema>>()
      .notNull()
      .default("NORMAL"),
    defaultMinPartners: integer("default_min_partners"),
    defaultMaxPartners: integer("default_max_partners"),
    defaultNotes: text("default_notes"),
    defaultConfirmationEnabled: boolean("default_confirmation_enabled").notNull().default(true),
    defaultConfirmationStartOffsetMinutes: integer("default_confirmation_start_offset_minutes")
      .notNull()
      .default(120),
    defaultConfirmationEndOffsetMinutes: integer("default_confirmation_end_offset_minutes")
      .notNull()
      .default(30),
    defaultJoinLockOffsetMinutes: integer("default_join_lock_offset_minutes").notNull().default(30),
    meetingPoint: jsonb("meeting_point")
      .$type<z.infer<typeof meetingPointConfigSchema> | null>()
      .default(null),
    joinGateConfig: jsonb("join_gate_config")
      .$type<z.infer<typeof prJoinGateConfigSchema>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    participationFrequencyLimit: jsonb("participation_frequency_limit")
      .$type<z.infer<typeof prTypeConfigParticipationFrequencyLimitSchema>>()
      .default(null),
    feedbackQuestionnaireTemplateId: bigint("feedback_questionnaire_template_id", {
      mode: "number",
    })
      .$type<number | null>()
      .references(() => feedbackQuestionnaireTemplates.id, {
        onDelete: "set null",
      }),
    locationMeetingPoints: jsonb("location_meeting_points")
      .$type<z.infer<typeof meetingPointConfigMapSchema>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    coverImage: text("cover_image"),
    communityQrCode: text("community_qr_code"),
    authoringCreationPolicy: text("authoring_creation_policy")
      .$type<z.infer<typeof prTypeConfigAuthoringCreationPolicySchema>>()
      .notNull()
      .default("USER_AND_ADMIN"),
    fullCapacityExpansionPolicy: text("full_capacity_expansion_policy")
      .$type<z.infer<typeof prTypeConfigFullCapacityExpansionPolicySchema>>()
      .notNull()
      .default("DISABLED"),
    discoveryFormRatio: integer("discovery_form_ratio").notNull().default(50),
    discoveryCardRatio: integer("discovery_card_ratio").notNull().default(50),
    discoveryListRatio: integer("discovery_list_ratio").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check("pr_type_configs_type_nonempty_chk", sql`length(btrim(${table.type})) > 0`),
    check(
      "pr_type_configs_place_pool_chk",
      sql`jsonb_array_length(${table.locationPool}) = 0 OR jsonb_array_length(${table.routePool}) = 0`,
    ),
    check(
      "pr_type_configs_default_partner_bounds_chk",
      sql`(${table.defaultMinPartners} IS NULL OR ${table.defaultMinPartners} >= 1)
        AND (${table.defaultMaxPartners} IS NULL OR ${table.defaultMaxPartners} >= 2)
        AND (${table.defaultMinPartners} IS NULL OR ${table.defaultMaxPartners} IS NULL OR ${table.defaultMaxPartners} >= ${table.defaultMinPartners})`,
    ),
    check(
      "pr_type_configs_default_participation_offsets_chk",
      sql`${table.defaultConfirmationStartOffsetMinutes} >= 0
        AND ${table.defaultConfirmationEndOffsetMinutes} >= 0
        AND ${table.defaultJoinLockOffsetMinutes} >= 0
        AND (NOT ${table.defaultConfirmationEnabled}
          OR (${table.defaultConfirmationStartOffsetMinutes} > ${table.defaultConfirmationEndOffsetMinutes}
            AND ${table.defaultJoinLockOffsetMinutes} >= ${table.defaultConfirmationEndOffsetMinutes}))`,
    ),
    check(
      "pr_type_configs_authoring_creation_policy_chk",
      sql`${table.authoringCreationPolicy} IN ('USER_AND_ADMIN', 'ADMIN_ONLY')`,
    ),
    check(
      "pr_type_configs_full_capacity_expansion_policy_chk",
      sql`${table.fullCapacityExpansionPolicy} IN ('ENABLED', 'DISABLED')`,
    ),
    check(
      "pr_type_configs_discovery_form_ratio_nonnegative_chk",
      sql`${table.discoveryFormRatio} >= 0`,
    ),
    check(
      "pr_type_configs_discovery_card_ratio_nonnegative_chk",
      sql`${table.discoveryCardRatio} >= 0`,
    ),
    check(
      "pr_type_configs_discovery_list_ratio_nonnegative_chk",
      sql`${table.discoveryListRatio} >= 0`,
    ),
  ],
);

export const insertPRTypeConfigSchema = createInsertSchema(prTypeConfigs, {
  type: prTypeConfigTypeSchema,
  locationPool: prTypeConfigLocationPoolSchema,
  routePool: prTypeConfigRoutePoolSchema,
  timePoolConfig: prTypeConfigTimePoolConfigSchema,
  authoringTimeWindowEditorDefaultMode: prTypeConfigTimeWindowEditorDefaultModeSchema,
  meetingPoint: meetingPointConfigSchema.nullable(),
  joinGateConfig: prJoinGateConfigSchema,
  participationFrequencyLimit: prTypeConfigParticipationFrequencyLimitSchema,
  locationMeetingPoints: meetingPointConfigMapSchema,
  communityQrCode: z.string().trim().max(2000).nullable(),
  authoringCreationPolicy: prTypeConfigAuthoringCreationPolicySchema,
  fullCapacityExpansionPolicy: prTypeConfigFullCapacityExpansionPolicySchema,
  discoveryFormRatio: prTypeConfigDiscoveryRatioSchema,
  discoveryCardRatio: prTypeConfigDiscoveryRatioSchema,
  discoveryListRatio: prTypeConfigDiscoveryRatioSchema,
});

export const selectPRTypeConfigSchema = createSelectSchema(prTypeConfigs, {
  type: prTypeConfigTypeSchema,
  locationPool: prTypeConfigLocationPoolSchema,
  routePool: prTypeConfigRoutePoolSchema,
  timePoolConfig: prTypeConfigTimePoolConfigSchema,
  authoringTimeWindowEditorDefaultMode: prTypeConfigTimeWindowEditorDefaultModeSchema,
  meetingPoint: meetingPointConfigSchema.nullable(),
  joinGateConfig: prJoinGateConfigSchema,
  participationFrequencyLimit: prTypeConfigParticipationFrequencyLimitSchema,
  locationMeetingPoints: meetingPointConfigMapSchema,
  communityQrCode: z.string().trim().max(2000).nullable(),
  authoringCreationPolicy: prTypeConfigAuthoringCreationPolicySchema,
  fullCapacityExpansionPolicy: prTypeConfigFullCapacityExpansionPolicySchema,
  discoveryFormRatio: prTypeConfigDiscoveryRatioSchema,
  discoveryCardRatio: prTypeConfigDiscoveryRatioSchema,
  discoveryListRatio: prTypeConfigDiscoveryRatioSchema,
});

export type PRTypeConfig = typeof prTypeConfigs.$inferSelect;
export type NewPRTypeConfig = typeof prTypeConfigs.$inferInsert;
