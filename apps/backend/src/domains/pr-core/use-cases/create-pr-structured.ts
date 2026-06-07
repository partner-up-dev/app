import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type {
  AnchorEventId,
  PRJoinGateConfig,
} from "../../../entities";
import type {
  PartnerRequestFields,
  PRAllowEditAfterReady,
  PRStatus,
} from "../../../entities/partner-request";
import { initializeSlotsForPR } from "../services/slot-management.service";
import {
  assertManualPartnerBoundsValid,
  normalizeAutomaticPartnerBounds,
} from "../services/partner-bounds.service";
import { assertPRTimeWindowAvailableAtLocation } from "../services/poi-availability.service";
import {
  resolveDraftCreator,
  type CreatorIdentityInput,
} from "../services/creator-identity.service";
import { operationLogService } from "../../../infra/operation-log";
import {
  finalizeCreatedPR,
  type CreatePRCommandResult,
} from "./create-pr.shared";
import { materializeEventDefaultsForPR } from "../services/event-default-materialization.service";
import { assertUserPRCreationAllowedForAnchorEvent } from "../services/event-pr-creation-policy.service";
import { normalizePartnerRequestFieldsForPersistence } from "../services/pr-place-mode.service";
import { assertPRStartTimeHasNotPassed } from "../services/pr-time-window-guard.service";

const prRepo = new PartnerRequestRepository();

export type StructuredCreateSource =
  | "FORM"
  | "EVENT_ASSISTED"
  | "EVENT_DUMMY"
  | "NATURAL_LANGUAGE"
  | "AUTO_EXPANSION";

type PartnerBoundsMode = "manual" | "automatic";
type PublicationMode = "finalize-by-creator-identity" | "create-open";

type StructuredCreateOptions = {
  anchorEventId?: AnchorEventId;
  createSource?: StructuredCreateSource;
  joinGateConfig?: PRJoinGateConfig;
  partnerBoundsMode?: PartnerBoundsMode;
  publicationMode?: PublicationMode;
  bypassUserCreationPolicyGuard?: boolean;
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
    return normalizeAutomaticPartnerBounds(
      fields.minPartners,
      fields.maxPartners,
      0,
    );
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
    case "EVENT_ASSISTED":
      return "pr.create_event_assisted";
    case "EVENT_DUMMY":
      return "pr.materialize_event_dummy";
    case "NATURAL_LANGUAGE":
      return "pr.create_from_nl";
    case "AUTO_EXPANSION":
      return "pr.auto_create";
    case "FORM":
      return "pr.create_structured";
  }
};

export async function createPRFromStructured(
  fields: PartnerRequestFields,
  creatorIdentity: CreatorIdentityInput,
  options: StructuredCreateOptions = {},
): Promise<CreatePRCommandResult> {
  const normalizedFields = normalizePartnerRequestFieldsForPersistence(fields);
  assertPRStartTimeHasNotPassed(normalizedFields.time);
  const partnerBounds = resolvePartnerBounds(
    normalizedFields,
    options.partnerBoundsMode ?? "manual",
  );
  if (!options.bypassUserCreationPolicyGuard) {
    await assertUserPRCreationAllowedForAnchorEvent({
      anchorEventId: options.anchorEventId,
      type: normalizedFields.type,
    });
  }
  await assertPRTimeWindowAvailableAtLocation({
    location: normalizedFields.location,
    timeWindow: normalizedFields.time,
  });

  const creator = await resolveDraftCreator(creatorIdentity);
  const createdBy = creator?.id ?? null;
  const createSource = options.createSource ?? "FORM";
  const publicationMode = options.publicationMode ?? "finalize-by-creator-identity";
  const initialStatus: PRStatus =
    publicationMode === "create-open" ? "OPEN" : "DRAFT";

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
    allowEditAfterReady: options.allowEditAfterReady ?? null,
  });

  await initializeSlotsForPR(
    request.id,
    null,
  );

  await materializeEventDefaultsForPR({
    prId: request.id,
    anchorEventId: options.anchorEventId,
    type: request.type,
    location: request.location,
    timeWindow: request.time,
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
      status: initialStatus,
      ...(options.operationLog?.detail ?? {}),
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
