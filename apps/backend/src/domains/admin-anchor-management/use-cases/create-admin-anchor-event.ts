import { throwHttpProblem } from "../../../lib/problem-details";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";
import type {
  AnchorEvent,
  AnchorEventFullPrExpansionPolicy,
  AnchorEventParticipationFrequencyLimit,
  AnchorEventPrCreationPolicy,
  AnchorEventRoutePool,
  AnchorEventStatus,
  AnchorEventTimePoolConfig,
  LocationEntry,
  MeetingPointConfig,
  MeetingPointConfigMap,
  PRJoinGateConfig,
  FeedbackQuestionnaireTemplateId,
} from "../../../entities";
import {
  normalizeAnchorEventTimePoolConfig,
  normalizeMeetingPointConfig,
  normalizeMeetingPointConfigMap,
} from "../../../entities";
import {
  assertManualPartnerBoundsValid,
  validateAnchorParticipationPolicyOffsets,
} from "../../pr/services";
import { assertAnchorEventPlacePoolValid } from "../../anchor-event/services/place-pool";

const anchorEventRepo = new AnchorEventRepository();
const feedbackRepo = new FeedbackQuestionnaireRepository();

export interface CreateAdminAnchorEventInput {
  title: string;
  type: string;
  description: string | null;
  locationPool: LocationEntry[];
  routePool: AnchorEventRoutePool;
  timePoolConfig: AnchorEventTimePoolConfig;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  defaultPrNotes: string | null;
  defaultConfirmationEnabled: boolean;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
  meetingPoint?: MeetingPointConfig | null;
  joinGateConfig?: PRJoinGateConfig;
  participationFrequencyLimit?: AnchorEventParticipationFrequencyLimit;
  feedbackQuestionnaireTemplateId?: FeedbackQuestionnaireTemplateId | null;
  locationMeetingPoints?: MeetingPointConfigMap;
  coverImage: string | null;
  betaGroupQrCode: string | null;
  prCreationPolicy: AnchorEventPrCreationPolicy;
  fullPrExpansionPolicy: AnchorEventFullPrExpansionPolicy;
  status: AnchorEventStatus;
}

export async function createAdminAnchorEvent(
  input: CreateAdminAnchorEventInput,
): Promise<AnchorEvent> {
  assertManualPartnerBoundsValid(
    input.defaultMinPartners,
    input.defaultMaxPartners,
    0,
  );
  validateAnchorParticipationPolicyOffsets({
    confirmationEnabled: input.defaultConfirmationEnabled,
    confirmationStartOffsetMinutes:
      input.defaultConfirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: input.defaultConfirmationEndOffsetMinutes,
    joinLockOffsetMinutes: input.defaultJoinLockOffsetMinutes,
  });
  assertAnchorEventPlacePoolValid({
    locationPool: input.locationPool,
    routePool: input.routePool,
  });

  const existing = await anchorEventRepo.findOneByType(input.type);
  if (existing) {
    return throwHttpProblem({ status: 409, detail: `Anchor event type already exists: ${input.type}` });
  }
  if (input.feedbackQuestionnaireTemplateId !== null && input.feedbackQuestionnaireTemplateId !== undefined) {
    const template = await feedbackRepo.findTemplateById(
      input.feedbackQuestionnaireTemplateId,
    );
    if (!template) {
      return throwHttpProblem({ status: 404, detail: "Feedback questionnaire template not found" });
    }
  }

  return await anchorEventRepo.create({
    title: input.title,
    type: input.type,
    description: input.description,
    locationPool: input.locationPool,
    routePool: input.routePool,
    timePoolConfig: normalizeAnchorEventTimePoolConfig(input.timePoolConfig),
    defaultMinPartners: input.defaultMinPartners,
    defaultMaxPartners: input.defaultMaxPartners,
    defaultPrNotes: input.defaultPrNotes,
    defaultConfirmationEnabled: input.defaultConfirmationEnabled,
    defaultConfirmationStartOffsetMinutes:
      input.defaultConfirmationStartOffsetMinutes,
    defaultConfirmationEndOffsetMinutes:
      input.defaultConfirmationEndOffsetMinutes,
    defaultJoinLockOffsetMinutes: input.defaultJoinLockOffsetMinutes,
    meetingPoint: normalizeMeetingPointConfig(input.meetingPoint),
    joinGateConfig: input.joinGateConfig ?? [],
    participationFrequencyLimit: input.participationFrequencyLimit ?? null,
    feedbackQuestionnaireTemplateId: input.feedbackQuestionnaireTemplateId ?? null,
    locationMeetingPoints: normalizeMeetingPointConfigMap(
      input.locationMeetingPoints,
    ),
    coverImage: input.coverImage,
    betaGroupQrCode: input.betaGroupQrCode,
    prCreationPolicy: input.prCreationPolicy,
    fullPrExpansionPolicy: input.fullPrExpansionPolicy,
    status: input.status,
  });
}
