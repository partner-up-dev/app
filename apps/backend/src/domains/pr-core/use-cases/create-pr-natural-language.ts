import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRequestAIService } from "../../../services/PartnerRequestAIService";
import type {
  WeekdayLabel,
} from "../../../entities/partner-request";
import {
  initializeSlotsForPR,
} from "../services/slot-management.service";
import { normalizeAutomaticPartnerBounds } from "../services/partner-bounds.service";
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
const aiService = new PartnerRequestAIService();

export async function createPRFromNaturalLanguage(
  rawText: string,
  nowIso: string,
  nowWeekday: WeekdayLabel | null,
  creatorIdentity: CreatorIdentityInput,
): Promise<CreatePRCommandResult> {
  const fields = await aiService.parseRequest(rawText, nowIso, nowWeekday);
  const normalizedFields = normalizePartnerRequestFieldsForPersistence(fields);
  await assertUserPRCreationAllowedForAnchorEvent({
    type: normalizedFields.type,
  });
  const partnerBounds = normalizeAutomaticPartnerBounds(
    normalizedFields.minPartners,
    normalizedFields.maxPartners,
    0,
  );
  await assertPRTimeWindowAvailableAtLocation({
    location: normalizedFields.location,
    timeWindow: normalizedFields.time,
  });

  const creator = await resolveDraftCreator(creatorIdentity);
  const createdBy = creator?.id ?? null;

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
    status: "DRAFT",
    createdBy,
  });

  await initializeSlotsForPR(
    request.id,
    null,
  );

  await materializeEventDefaultsForPR({
    prId: request.id,
    type: request.type,
    location: request.location,
    timeWindow: request.time,
    prNotes: request.notes,
  });

  operationLogService.log({
    actorId: createdBy,
    action: "pr.create_from_nl",
    aggregateType: "partner_request",
    aggregateId: String(request.id),
    detail: { rawText, status: "DRAFT" },
  });

  return finalizeCreatedPR({
    id: request.id,
    createdBy,
    creatorIdentity,
  });
}
