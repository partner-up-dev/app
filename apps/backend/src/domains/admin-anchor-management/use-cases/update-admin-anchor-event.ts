import { throwHttpProblem } from "../../../lib/problem-details";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";
import type {
  AnchorEvent,
  AnchorEventId,
  AnchorEventFullPrExpansionPolicy,
  AnchorEventParticipationFrequencyLimit,
  AnchorEventPrCreationPolicy,
  AnchorEventPrTimeWindowEditorDefaultMode,
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
  captureEffectiveMeetingPointsForRequests,
  listRequestsAffectedByAnchorEventMeetingPoint,
  scheduleMeetingPointNotificationsForChangedRequests,
  validateAnchorParticipationPolicyOffsets,
} from "../../pr/services";
import { assertAnchorEventPlacePoolValid } from "../../anchor-event/services/place-pool";

const anchorEventRepo = new AnchorEventRepository();
const feedbackRepo = new FeedbackQuestionnaireRepository();

export interface UpdateAdminAnchorEventInput {
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
  locationMeetingPoints?: MeetingPointConfigMap;
  joinGateConfig?: PRJoinGateConfig;
  participationFrequencyLimit?: AnchorEventParticipationFrequencyLimit;
  feedbackQuestionnaireTemplateId?: FeedbackQuestionnaireTemplateId | null;
  coverImage: string | null;
  betaGroupQrCode: string | null;
  prCreationPolicy: AnchorEventPrCreationPolicy;
  fullPrExpansionPolicy: AnchorEventFullPrExpansionPolicy;
  prTimeWindowEditorDefaultMode: AnchorEventPrTimeWindowEditorDefaultMode;
  status: AnchorEventStatus;
}

export async function updateAdminAnchorEvent(
  eventId: AnchorEventId,
  input: UpdateAdminAnchorEventInput,
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

  const current = await anchorEventRepo.findById(eventId);
  if (!current) {
    return throwHttpProblem({ status: 404, detail: "Anchor event not found" });
  }

  const existingByType = await anchorEventRepo.findOneByType(input.type);
  if (existingByType && existingByType.id !== eventId) {
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

  const affectedRequests =
    await listRequestsAffectedByAnchorEventMeetingPoint(
      current.type,
      input.type,
    );
  const previousMeetingPoints =
    await captureEffectiveMeetingPointsForRequests(affectedRequests);
  const updatedAt = new Date();

  const updated = await anchorEventRepo.update(eventId, {
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
    locationMeetingPoints: normalizeMeetingPointConfigMap(
      input.locationMeetingPoints,
    ),
    joinGateConfig: input.joinGateConfig ?? [],
    participationFrequencyLimit: input.participationFrequencyLimit ?? null,
    feedbackQuestionnaireTemplateId: input.feedbackQuestionnaireTemplateId ?? null,
    coverImage: input.coverImage,
    betaGroupQrCode: input.betaGroupQrCode,
    prCreationPolicy: input.prCreationPolicy,
    fullPrExpansionPolicy: input.fullPrExpansionPolicy,
    prTimeWindowEditorDefaultMode: input.prTimeWindowEditorDefaultMode,
    status: input.status,
  });

  if (!updated) {
    return throwHttpProblem({ status: 404, detail: "Anchor event not found" });
  }

  const latestAffectedRequests = await listRequestsAffectedByAnchorEventMeetingPoint(
    current.type,
    input.type,
  );
  await scheduleMeetingPointNotificationsForChangedRequests({
    previous: previousMeetingPoints,
    requests: latestAffectedRequests,
    updatedAt,
  });

  return updated;
}
