import { z } from "zod";
import type {
  PRTypeConfigAuthoring,
  PRTypeConfigCompletion,
  PRTypeConfigCoordination,
  PRTypeConfigCreateInput,
  PRTypeConfigDiscovery,
  PRTypeConfigOperatorCatalogItem,
  PRTypeConfigOperatorDetail,
  PRTypeConfigParticipation,
} from "../pr-type-config/contracts";
import {
  prTypeConfigAuthoringSchema,
  prTypeConfigCompletionSchema,
  prTypeConfigCoordinationSchema,
  prTypeConfigCreateSchema,
  prTypeConfigDiscoverySchema,
  prTypeConfigParticipationSchema,
} from "../pr-type-config/contracts";
import { prTypeConfigTypeSchema } from "../../entities/pr-type-config";
import { prTypePreferenceTagModerationStatusSchema } from "../../entities/pr-type-preference-tag";

/**
 * Admin is an HTTP/operator adapter. Core configuration validation is owned by the neutral PR Type Config
 * domain so command callers and HTTP callers cannot drift apart.
 */
export const adminPRTypeConfigAuthoringSchema = prTypeConfigAuthoringSchema;
export const adminPRTypeConfigDiscoverySchema = prTypeConfigDiscoverySchema;
export const adminPRTypeConfigParticipationSchema = prTypeConfigParticipationSchema;
export const adminPRTypeConfigCoordinationSchema = prTypeConfigCoordinationSchema;
export const adminPRTypeConfigCompletionSchema = prTypeConfigCompletionSchema;
export const adminPRTypeConfigBodySchema = prTypeConfigCreateSchema.omit({ type: true });
export const adminPRTypeConfigCreateSchema = prTypeConfigCreateSchema;

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

export type AdminPRTypeConfigAuthoring = PRTypeConfigAuthoring;
export type AdminPRTypeConfigDiscovery = PRTypeConfigDiscovery;
export type AdminPRTypeConfigParticipation = PRTypeConfigParticipation;
export type AdminPRTypeConfigCoordination = PRTypeConfigCoordination;
export type AdminPRTypeConfigCompletion = PRTypeConfigCompletion;
export type AdminPRTypeConfigCreateInput = PRTypeConfigCreateInput;
export type AdminPRTypeConfigCatalogItem = PRTypeConfigOperatorCatalogItem;
export type AdminPRTypeConfigDetail = PRTypeConfigOperatorDetail;

export type AdminPRTypePreferenceTagView = {
  id: number;
  type: string;
  label: string;
  description: string;
  moderationStatus: z.infer<typeof prTypePreferenceTagModerationStatusSchema>;
  createdAt: string;
  updatedAt: string;
};
