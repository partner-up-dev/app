import type { PRJoinGateConfig } from "../../../entities";
import type {
  PartnerRequestFields,
  PRAllowEditAfterReady,
  PRStatus,
} from "../../../entities/partner-request";
import { operationLogService } from "../../../infra/operation-log";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { type CreatorIdentityInput } from "../services/creator-identity.service";
import {
  type PRCreationAuthority,
  resolvePRCreationCreator,
} from "../services/pr-creation-guard.service";
export type { PRCreationAuthority } from "../services/pr-creation-guard.service";
import {
  assertManualPartnerBoundsValid,
  normalizeAutomaticPartnerBounds,
} from "../services/partner-bounds.service";
import { assertPRTimeWindowAvailableAtLocation } from "../services/poi-availability.service";
import { normalizePartnerRequestFieldsForPersistence } from "../services/pr-place-mode.service";
import { assertPRStartTimeHasNotPassed } from "../services/pr-time-window-guard.service";
import {
  canonicalizePartnerRequestFieldsTime,
  canonicalizePRAllowEditAfterReady,
} from "../services/pr-time-window-instant.service";
import { materializePRTypeConfigurationAtCreation } from "../services/pr-type-creation-materialization.service";
import { assertPRTypeCreationAllowed } from "../services/pr-type-creation-policy.service";
import { initializeSlotsForPR } from "../services/slot-management.service";
import { type CreatePRCommandResult, finalizeCreatedPR } from "./create-pr.shared";

const prRepo = new PartnerRequestRepository();

export type StructuredCreateSource =
  | "STRUCTURED_FORM"
  | "NATURAL_LANGUAGE"
  | "PR_DISCOVERY"
  | "ADMIN"
  | "CAPACITY_EXPANSION";

type PartnerBoundsMode = "manual" | "automatic";
type PublicationMode = "finalize-by-creator-identity" | "create-open";

export type StructuredCreateOptions = {
  createSource?: StructuredCreateSource;
  creationAuthority?: PRCreationAuthority;
  joinGateConfig?: PRJoinGateConfig;
  partnerBoundsMode?: PartnerBoundsMode;
  publicationMode?: PublicationMode;
  operationLog?: {
    action?: string;
    detail?: Record<string, string | number | boolean | null>;
  };
  confirmationEnabled?: boolean;
  confirmationStartOffsetMinutes?: number | null;
  confirmationEndOffsetMinutes?: number | null;
  joinLockOffsetMinutes?: number | null;
  allowEditAfterReady?: PRAllowEditAfterReady | null;
};

const resolvePartnerBounds = (
  fields: PartnerRequestFields,
  mode: PartnerBoundsMode,
): { minPartners: number; maxPartners: number | null } => {
  if (mode === "automatic") {
    return normalizeAutomaticPartnerBounds(fields.minPartners, fields.maxPartners, 0);
  }

  const minPartners = fields.minPartners;
  assertManualPartnerBoundsValid(minPartners, fields.maxPartners, 0);
  return {
    minPartners,
    maxPartners: fields.maxPartners,
  };
};

const resolveOperationAction = (source: StructuredCreateSource): string => {
  switch (source) {
    case "PR_DISCOVERY":
      return "pr.create_from_discovery";
    case "NATURAL_LANGUAGE":
      return "pr.create_from_nl";
    case "CAPACITY_EXPANSION":
      return "pr.create_capacity_expansion";
    case "ADMIN":
      return "pr.admin_create";
    case "STRUCTURED_FORM":
      return "pr.create_structured";
  }
};

export async function createPRFromStructured(
  fields: PartnerRequestFields,
  creatorIdentity: CreatorIdentityInput,
  options: StructuredCreateOptions = {},
): Promise<CreatePRCommandResult> {
  const normalizedFields = normalizePartnerRequestFieldsForPersistence(
    canonicalizePartnerRequestFieldsTime(fields),
  );
  const allowEditAfterReady = canonicalizePRAllowEditAfterReady(options.allowEditAfterReady);
  assertPRStartTimeHasNotPassed(normalizedFields.time);
  const partnerBounds = resolvePartnerBounds(
    normalizedFields,
    options.partnerBoundsMode ?? "manual",
  );
  const creationAuthority = options.creationAuthority ?? "USER";
  const creator = await resolvePRCreationCreator({
    authority: creationAuthority,
    identity: creatorIdentity,
  });
  if (creationAuthority === "USER") {
    await assertPRTypeCreationAllowed({ type: normalizedFields.type });
  }
  await assertPRTimeWindowAvailableAtLocation({
    location: normalizedFields.location,
    timeWindow: normalizedFields.time,
  });

  const createdBy = creator?.id ?? null;
  const createSource = options.createSource ?? "STRUCTURED_FORM";
  const publicationMode = options.publicationMode ?? "finalize-by-creator-identity";
  const initialStatus: PRStatus = publicationMode === "create-open" ? "OPEN" : "DRAFT";

  const request = await prRepo.create({
    title: normalizedFields.title,
    type: normalizedFields.type,
    time: normalizedFields.time,
    location: normalizedFields.location,
    route: normalizedFields.route,
    minPartners: partnerBounds.minPartners,
    maxPartners: partnerBounds.maxPartners,
    budget: normalizedFields.budget,
    preferences: normalizedFields.preferences,
    notes: normalizedFields.notes,
    meetingPoint: normalizedFields.meetingPoint ?? null,
    joinGateConfig: options.joinGateConfig ?? [],
    status: initialStatus,
    createdBy,
    confirmationEnabled: options.confirmationEnabled,
    confirmationStartOffsetMinutes: options.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: options.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: options.joinLockOffsetMinutes,
    allowEditAfterReady,
  });

  await initializeSlotsForPR(request.id, null);

  await materializePRTypeConfigurationAtCreation({
    prId: request.id,
    type: request.type,
    prNotes: request.notes,
    prJoinGateConfig: options.joinGateConfig,
  });

  operationLogService.log({
    actorId: createdBy,
    action: options.operationLog?.action ?? resolveOperationAction(createSource),
    aggregateType: "partner_request",
    aggregateId: String(request.id),
    detail: {
      source: createSource,
      creationAuthority,
      status: initialStatus,
      ...options.operationLog?.detail,
    },
  });

  if (publicationMode === "create-open") {
    return {
      id: request.id,
      createdBy,
      status: request.status,
      canonicalPath: `/pr/${request.id}`,
    };
  }

  return finalizeCreatedPR({
    id: request.id,
    createdBy,
    creatorIdentity,
  });
}
