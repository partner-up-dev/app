import { z } from "zod";
import {
  meetingPointConfigMapSchema,
  meetingPointConfigSchema,
  prJoinGateConfigSchema,
  type MeetingPointConfig,
  type PRRoute,
} from "../pr/contracts";
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

const nullableText = z.string().trim().max(20_000).nullable();
const nonNegativeInteger = z.number().int().nonnegative();
const nullablePositiveInteger = z.number().int().positive().nullable();

export const prTypeConfigAuthoringSchema = z
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

export const prTypeConfigDiscoverySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: nullableText,
    coverImage: z.string().trim().max(2_000).nullable(),
    communityQrCode: z.string().trim().max(2_000).nullable().default(null),
    viewRatios: z
      .object({
        FORM: nonNegativeInteger,
        CARD: nonNegativeInteger,
        LIST: nonNegativeInteger,
      })
      .strict(),
  })
  .strict();

export const prTypeConfigParticipationSchema = z
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

export const prTypeConfigCoordinationSchema = z
  .object({
    meetingPoint: meetingPointConfigSchema.nullable(),
    locationMeetingPoints: meetingPointConfigMapSchema,
  })
  .strict();

export const prTypeConfigCompletionSchema = z
  .object({
    feedbackQuestionnaireTemplateId: z.number().int().positive().nullable(),
  })
  .strict();

const prTypeConfigBodySchema = z
  .object({
    authoring: prTypeConfigAuthoringSchema,
    discovery: prTypeConfigDiscoverySchema,
    participation: prTypeConfigParticipationSchema,
    coordination: prTypeConfigCoordinationSchema,
    completion: prTypeConfigCompletionSchema,
  })
  .strict();

export const prTypeConfigCreateSchema = prTypeConfigBodySchema.extend({
  type: prTypeConfigTypeSchema,
});

export type PRTypeConfigAuthoring = z.infer<typeof prTypeConfigAuthoringSchema>;
export type PRTypeConfigDiscovery = z.infer<typeof prTypeConfigDiscoverySchema>;
export type PRTypeConfigParticipation = z.infer<typeof prTypeConfigParticipationSchema>;
export type PRTypeConfigCoordination = z.infer<typeof prTypeConfigCoordinationSchema>;
export type PRTypeConfigCompletion = z.infer<typeof prTypeConfigCompletionSchema>;
export type PRTypeConfigCreateInput = z.infer<typeof prTypeConfigCreateSchema>;

export type PRTypeConfigDiscoveryCatalogPolicy = {
  type: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  locationPool: string[];
  routePool: Array<{ id: string; route: PRRoute }>;
};

export type PRTypeConfigDiscoveryPolicy = PRTypeConfigDiscoveryCatalogPolicy & {
  communityQrCode: string | null;
  viewRatios: PRTypeConfigDiscovery["viewRatios"];
};

export type PRTypeConfigAuthoringPolicy = {
  type: string;
  locationPool: string[];
  routePool: Array<{ id: string; route: PRRoute }>;
  timePoolConfig: PRTypeConfigAuthoring["timePoolConfig"];
  timeWindowEditorDefaultMode: PRTypeConfigAuthoring["timeWindowEditorDefaultMode"];
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  defaultNotes: string | null;
  authoringCreationPolicy: PRTypeConfigAuthoring["authoringCreationPolicy"];
};

export type PRTypeConfigCreationPolicy = {
  authoringCreationPolicy: PRTypeConfigAuthoring["authoringCreationPolicy"];
};

export type PRTypeConfigCreationDefaults = {
  defaultNotes: string | null;
  defaultConfirmationEnabled: boolean;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
  joinGateConfig: PRTypeConfigParticipation["joinGateConfig"];
  feedbackQuestionnaireTemplateId: number | null;
};

export type PRTypeConfigParticipationFrequencyPolicy = {
  participationFrequencyLimit: PRTypeConfigParticipation["participationFrequencyLimit"];
};

export type PRTypeConfigExpansionPolicy = {
  fullCapacityExpansionPolicy: PRTypeConfigParticipation["fullCapacityExpansionPolicy"];
  locationPool: string[];
};

export type PRTypeConfigMeetingPointPolicy = {
  meetingPoint: MeetingPointConfig | null;
  locationMeetingPoints: PRTypeConfigCoordination["locationMeetingPoints"];
};

/** Full operator projection; this is deliberately separate from public policy reads. */
export type PRTypeConfigOperatorDetail = {
  type: string;
  authoring: PRTypeConfigAuthoring;
  discovery: PRTypeConfigDiscovery;
  participation: PRTypeConfigParticipation;
  coordination: PRTypeConfigCoordination;
  completion: PRTypeConfigCompletion;
};

export type PRTypeConfigOperatorCatalogItem = {
  type: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  viewRatios: PRTypeConfigDiscovery["viewRatios"];
};
