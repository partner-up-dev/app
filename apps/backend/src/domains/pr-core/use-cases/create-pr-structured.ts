import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type {
  AnchorEventId,
  PRJoinGateConfig,
} from "../../../entities";
import type {
  PartnerRequestFields,
} from "../../../entities/partner-request";
import { initializeSlotsForPR } from "../services/slot-management.service";
import { assertManualPartnerBoundsValid } from "../services/partner-bounds.service";
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

const prRepo = new PartnerRequestRepository();

export type StructuredCreateSource = "FORM" | "EVENT_ASSISTED";

export async function createPRFromStructured(
  fields: PartnerRequestFields,
  creatorIdentity: CreatorIdentityInput,
  options: {
    anchorEventId?: AnchorEventId;
    createSource?: StructuredCreateSource;
    joinGateConfig?: PRJoinGateConfig;
  } = {},
): Promise<CreatePRCommandResult> {
  const normalizedFields = normalizePartnerRequestFieldsForPersistence(fields);
  assertManualPartnerBoundsValid(
    normalizedFields.minPartners,
    normalizedFields.maxPartners,
    0,
  );
  await assertUserPRCreationAllowedForAnchorEvent({
    anchorEventId: options.anchorEventId,
    type: normalizedFields.type,
  });
  await assertPRTimeWindowAvailableAtLocation({
    location: normalizedFields.location,
    timeWindow: normalizedFields.time,
  });

  const creator = await resolveDraftCreator(creatorIdentity);
  const createdBy = creator?.id ?? null;
  const createSource = options.createSource ?? "FORM";

  const request = await prRepo.create({
    title: normalizedFields.title,
    type: normalizedFields.type,
    time: normalizedFields.time,
    location: normalizedFields.location,
    route: normalizedFields.route,
    minPartners: normalizedFields.minPartners,
    maxPartners: normalizedFields.maxPartners,
    budget: normalizedFields.budget,
    preferences: normalizedFields.preferences,
    notes: normalizedFields.notes,
    meetingPoint: normalizedFields.meetingPoint ?? null,
    joinGateConfig: options.joinGateConfig ?? [],
    status: "DRAFT",
    createdBy,
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
    action:
      createSource === "EVENT_ASSISTED"
        ? "pr.create_event_assisted"
        : "pr.create_structured",
    aggregateType: "partner_request",
    aggregateId: String(request.id),
    detail: {
      source: createSource,
      status: "DRAFT",
    },
  });

  return finalizeCreatedPR({
    id: request.id,
    createdBy,
    creatorIdentity,
  });
}
