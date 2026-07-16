import { z } from "zod";
import { prJoinGateConfigSchema } from "../../entities/join-gate";
import {
  meetingPointConfigMapSchema,
  meetingPointConfigSchema,
} from "../../entities/meeting-point";
import {
  prTypeConfigAuthoringCreationPolicySchema,
  prTypeConfigFullCapacityExpansionPolicySchema,
  prTypeConfigLocationPoolSchema,
  prTypeConfigParticipationFrequencyLimitSchema,
  prTypeConfigRoutePoolSchema,
  prTypeConfigTimePoolConfigSchema,
  prTypeConfigTimeWindowEditorDefaultModeSchema,
  prTypeConfigTypeSchema,
} from "../../entities/pr-type-config";
import { prTypePreferenceTagModerationStatusSchema } from "../../entities/pr-type-preference-tag";

const nullableText = z.string().trim().max(20000).nullable();
const nonNegativeInteger = z.number().int().nonnegative();
const nullablePositiveInteger = z.number().int().positive().nullable();

export const adminPRTypeConfigAuthoringSchema = z
  .object({
    locationPool: prTypeConfigLocationPoolSchema,
    routePool: prTypeConfigRoutePoolSchema,
    timePoolConfig: prTypeConfigTimePoolConfigSchema,
    timeWindowEditorDefaultMode: prTypeConfigTimeWindowEditorDefaultModeSchema.default("NORMAL"),
    defaultMinPartners: nullablePositiveInteger,
    defaultMaxPartners: nullablePositiveInteger,
    defaultNotes: nullableText,
    authoringCreationPolicy: prTypeConfigAuthoringCreationPolicySchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.locationPool.length > 0 && value.routePool.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only one PR place pool may be configured",
        path: ["routePool"],
      });
    }
    const { defaultMinPartners: min, defaultMaxPartners: max } = value;
    if (max !== null && max < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "defaultMaxPartners must be at least 2",
        path: ["defaultMaxPartners"],
      });
    }
    if (min !== null && max !== null && max < min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "defaultMaxPartners must be greater than or equal to defaultMinPartners",
        path: ["defaultMaxPartners"],
      });
    }
  });

export const adminPRTypeConfigDiscoverySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: nullableText,
    coverImage: z.string().trim().max(2000).nullable(),
    communityQrCode: z.string().trim().max(2000).nullable().default(null),
    viewRatios: z
      .object({
        FORM: nonNegativeInteger,
        CARD: nonNegativeInteger,
        LIST: nonNegativeInteger,
      })
      .strict(),
  })
  .strict();

export const adminPRTypeConfigParticipationSchema = z
  .object({
    defaultConfirmationEnabled: z.boolean(),
    defaultConfirmationStartOffsetMinutes: nonNegativeInteger,
    defaultConfirmationEndOffsetMinutes: nonNegativeInteger,
    defaultJoinLockOffsetMinutes: nonNegativeInteger,
    joinGateConfig: prJoinGateConfigSchema,
    participationFrequencyLimit: prTypeConfigParticipationFrequencyLimitSchema,
    fullCapacityExpansionPolicy: prTypeConfigFullCapacityExpansionPolicySchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.defaultConfirmationEnabled &&
      (value.defaultConfirmationStartOffsetMinutes <= value.defaultConfirmationEndOffsetMinutes ||
        value.defaultJoinLockOffsetMinutes < value.defaultConfirmationEndOffsetMinutes)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Confirmation offsets must satisfy start > end and join lock >= end",
        path: [],
      });
    }
  });

export const adminPRTypeConfigCoordinationSchema = z
  .object({
    meetingPoint: meetingPointConfigSchema.nullable(),
    locationMeetingPoints: meetingPointConfigMapSchema,
  })
  .strict();

export const adminPRTypeConfigCompletionSchema = z
  .object({
    feedbackQuestionnaireTemplateId: z.number().int().positive().nullable(),
  })
  .strict();

const adminPRTypeConfigBodyObjectSchema = z
  .object({
    authoring: adminPRTypeConfigAuthoringSchema,
    discovery: adminPRTypeConfigDiscoverySchema,
    participation: adminPRTypeConfigParticipationSchema,
    coordination: adminPRTypeConfigCoordinationSchema,
    completion: adminPRTypeConfigCompletionSchema,
  })
  .strict();

export const adminPRTypeConfigBodySchema = adminPRTypeConfigBodyObjectSchema;

export const adminPRTypeConfigCreateSchema = adminPRTypeConfigBodyObjectSchema.extend({
  type: prTypeConfigTypeSchema,
});

export const adminPRTypeConfigTypeParamSchema = z.object({
  type: prTypeConfigTypeSchema,
});

export const adminPRTypePreferenceTagModerationSchema = z
  .object({
    moderationStatus: prTypePreferenceTagModerationStatusSchema,
  })
  .strict();

export const adminPRTypePreferenceTagParamSchema = z.object({
  type: prTypeConfigTypeSchema,
  tagId: z.coerce.number().int().positive(),
});

export const adminPRTypePreferenceTagListQuerySchema = z.object({
  moderationStatus: prTypePreferenceTagModerationStatusSchema.optional(),
});

export type AdminPRTypeConfigAuthoring = z.infer<typeof adminPRTypeConfigAuthoringSchema>;
export type AdminPRTypeConfigDiscovery = z.infer<typeof adminPRTypeConfigDiscoverySchema>;
export type AdminPRTypeConfigParticipation = z.infer<typeof adminPRTypeConfigParticipationSchema>;
export type AdminPRTypeConfigCoordination = z.infer<typeof adminPRTypeConfigCoordinationSchema>;
export type AdminPRTypeConfigCompletion = z.infer<typeof adminPRTypeConfigCompletionSchema>;
export type AdminPRTypeConfigCreateInput = z.infer<typeof adminPRTypeConfigCreateSchema>;

export type AdminPRTypeConfigCatalogItem = {
  type: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  viewRatios: AdminPRTypeConfigDiscovery["viewRatios"];
};

export type AdminPRTypeConfigDetail = {
  type: string;
  authoring: AdminPRTypeConfigAuthoring;
  discovery: AdminPRTypeConfigDiscovery;
  participation: AdminPRTypeConfigParticipation;
  coordination: AdminPRTypeConfigCoordination;
  completion: AdminPRTypeConfigCompletion;
};

export type AdminPRTypePreferenceTagView = {
  id: number;
  type: string;
  label: string;
  description: string;
  moderationStatus: z.infer<typeof prTypePreferenceTagModerationStatusSchema>;
  createdAt: string;
  updatedAt: string;
};
