import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { initializeSlotsForPR } from "../../pr/services";
import { type TimeWindowEntry } from "../../../entities/anchor-event";
import {
  assertManualPartnerBoundsValid,
  materializeEventDefaultsForPR,
  assertPRTimeWindowAvailableAtLocation,
  validateAnchorParticipationPolicyOffsets,
} from "../../pr/services";
import type {
  PartnerRequest,
  PartnerRequestFields,
  PRJoinGateConfig,
  PRRoute,
} from "../../../entities";
import type { MeetingPointConfig } from "../../../entities";
import {
  normalizePartnerRequestFieldsForPersistence,
} from "../../pr-core/services/pr-place-mode.service";

const prRepo = new PartnerRequestRepository();

export interface CreateAdminPRInput {
  title: string | null;
  type: string;
  location: string | null;
  route: PRRoute | null;
  minPartners: number | null;
  maxPartners: number | null;
  preferences: string[];
  notes: string | null;
  meetingPoint?: MeetingPointConfig | null;
  joinGateConfig?: PRJoinGateConfig;
  confirmationEnabled: boolean;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
}

export interface CreateAdminPROutput {
  root: PartnerRequest;
}

const assertTimeWindowValid = (timeWindow: TimeWindowEntry) => {
  if (timeWindow[0] === null || timeWindow[1] === null) {
    return;
  }

  const startAt = new Date(timeWindow[0]);
  const endAt = new Date(timeWindow[1]);
  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime()) ||
    startAt.getTime() > endAt.getTime()
  ) {
    return throwHttpProblem({ status: 400, detail: "PR time window is invalid" });
  }
};

export async function createAdminPR(
  timeWindow: TimeWindowEntry,
  input: CreateAdminPRInput,
): Promise<CreateAdminPROutput> {
  assertTimeWindowValid(timeWindow);
  validateAnchorParticipationPolicyOffsets({
    confirmationEnabled: input.confirmationEnabled,
    confirmationStartOffsetMinutes: input.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: input.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: input.joinLockOffsetMinutes,
  });
  const normalizedFields = normalizePartnerRequestFieldsForPersistence({
    title: input.title ?? undefined,
    type: input.type.trim(),
    time: timeWindow,
    location: input.location,
    route: input.route,
    minPartners: input.minPartners,
    maxPartners: input.maxPartners,
    partners: [],
    budget: null,
    preferences: input.preferences,
    notes: input.notes,
    meetingPoint: input.meetingPoint ?? null,
  } satisfies PartnerRequestFields);

  assertManualPartnerBoundsValid(
    normalizedFields.minPartners,
    normalizedFields.maxPartners,
    0,
  );
  await assertPRTimeWindowAvailableAtLocation({
    location: normalizedFields.location,
    timeWindow,
  });

  const createdRoot = await prRepo.create({
    title: normalizedFields.title,
    type: normalizedFields.type,
    time: normalizedFields.time,
    location: normalizedFields.location,
    route: normalizedFields.route,
    status: "OPEN",
    visibilityStatus: "VISIBLE",
    minPartners: normalizedFields.minPartners,
    maxPartners: normalizedFields.maxPartners,
    preferences: normalizedFields.preferences,
    notes: normalizedFields.notes,
    meetingPoint: normalizedFields.meetingPoint ?? null,
    joinGateConfig: input.joinGateConfig ?? [],
    confirmationEnabled: input.confirmationEnabled,
    confirmationStartOffsetMinutes: input.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: input.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: input.joinLockOffsetMinutes,
  });

  await initializeSlotsForPR(createdRoot.id, null);

  await materializeEventDefaultsForPR({
    prId: createdRoot.id,
    type: createdRoot.type,
    location: createdRoot.location,
    timeWindow: createdRoot.time,
    prNotes: createdRoot.notes,
    prJoinGateConfig: input.joinGateConfig,
  });

  return {
    root: createdRoot,
  };
}
