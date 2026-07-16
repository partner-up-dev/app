import { throwHttpProblem } from "../../../lib/problem-details";
import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";
import {
  captureEffectiveMeetingPointsForRequests,
  listRequestsAffectedByPRTypeMeetingPoint,
  scheduleMeetingPointNotificationsForChangedRequests,
} from "../../pr-core/services/meeting-point-change-notifier.service";
import type {
  AdminPRTypeConfigAuthoring,
  AdminPRTypeConfigCompletion,
  AdminPRTypeConfigCoordination,
  AdminPRTypeConfigDetail,
  AdminPRTypeConfigDiscovery,
  AdminPRTypeConfigParticipation,
} from "../contracts";
import { toAdminPRTypeConfigDetail } from "../services/projection";
import {
  assertExistingFeedbackQuestionnaireTemplate,
  assertPublishedLocationPool,
} from "../services/validation";

const configRepository = new PRTypeConfigRepository();

const requireExisting = async (type: string) => {
  const normalizedType = type.trim();
  const existing = await configRepository.findByType(normalizedType);
  if (!existing) {
    return throwHttpProblem({
      status: 404,
      detail: "PR type configuration not found",
      code: "PR_TYPE_CONFIG_NOT_FOUND",
    });
  }
  return { normalizedType, existing };
};

export const updateAdminPRTypeConfigAuthoring = async (
  type: string,
  input: AdminPRTypeConfigAuthoring,
): Promise<AdminPRTypeConfigDetail> => {
  const { normalizedType } = await requireExisting(type);
  const locationPool = Array.from(new Set(input.locationPool.map((location) => location.trim())));
  await assertPublishedLocationPool(locationPool);
  if (locationPool.length > 0 && input.routePool.length > 0) {
    return throwHttpProblem({
      status: 422,
      detail: "A PR type must choose either a location pool or a route pool",
      code: "PR_TYPE_PLACE_POOL_EXCLUSIVE",
    });
  }
  const saved = await configRepository.updateByType(normalizedType, {
    locationPool,
    routePool: input.routePool,
    timePoolConfig: input.timePoolConfig,
    authoringTimeWindowEditorDefaultMode: input.timeWindowEditorDefaultMode,
    defaultMinPartners: input.defaultMinPartners,
    defaultMaxPartners: input.defaultMaxPartners,
    defaultNotes: input.defaultNotes?.trim() || null,
    authoringCreationPolicy: input.authoringCreationPolicy,
  });
  if (!saved)
    return throwHttpProblem({
      status: 404,
      detail: "PR type configuration not found",
      code: "PR_TYPE_CONFIG_NOT_FOUND",
    });
  return toAdminPRTypeConfigDetail(saved);
};

export const updateAdminPRTypeConfigDiscovery = async (
  type: string,
  input: AdminPRTypeConfigDiscovery,
): Promise<AdminPRTypeConfigDetail> => {
  const { normalizedType } = await requireExisting(type);
  const saved = await configRepository.updateByType(normalizedType, {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    coverImage: input.coverImage?.trim() || null,
    communityQrCode: input.communityQrCode?.trim() || null,
    discoveryFormRatio: input.viewRatios.FORM,
    discoveryCardRatio: input.viewRatios.CARD,
    discoveryListRatio: input.viewRatios.LIST,
  });
  if (!saved)
    return throwHttpProblem({
      status: 404,
      detail: "PR type configuration not found",
      code: "PR_TYPE_CONFIG_NOT_FOUND",
    });
  return toAdminPRTypeConfigDetail(saved);
};

export const updateAdminPRTypeConfigParticipation = async (
  type: string,
  input: AdminPRTypeConfigParticipation,
): Promise<AdminPRTypeConfigDetail> => {
  const { normalizedType } = await requireExisting(type);
  const saved = await configRepository.updateByType(normalizedType, {
    defaultConfirmationEnabled: input.defaultConfirmationEnabled,
    defaultConfirmationStartOffsetMinutes: input.defaultConfirmationStartOffsetMinutes,
    defaultConfirmationEndOffsetMinutes: input.defaultConfirmationEndOffsetMinutes,
    defaultJoinLockOffsetMinutes: input.defaultJoinLockOffsetMinutes,
    joinGateConfig: input.joinGateConfig,
    participationFrequencyLimit: input.participationFrequencyLimit,
    fullCapacityExpansionPolicy: input.fullCapacityExpansionPolicy,
  });
  if (!saved)
    return throwHttpProblem({
      status: 404,
      detail: "PR type configuration not found",
      code: "PR_TYPE_CONFIG_NOT_FOUND",
    });
  return toAdminPRTypeConfigDetail(saved);
};

export const updateAdminPRTypeConfigCoordination = async (
  type: string,
  input: AdminPRTypeConfigCoordination,
): Promise<AdminPRTypeConfigDetail> => {
  const { normalizedType } = await requireExisting(type);
  const affectedRequests = await listRequestsAffectedByPRTypeMeetingPoint(
    normalizedType,
    normalizedType,
  );
  const previousMeetingPoints = await captureEffectiveMeetingPointsForRequests(affectedRequests);
  const updatedAt = new Date();
  const saved = await configRepository.updateByType(normalizedType, {
    meetingPoint: input.meetingPoint,
    locationMeetingPoints: input.locationMeetingPoints,
  });
  if (!saved)
    return throwHttpProblem({
      status: 404,
      detail: "PR type configuration not found",
      code: "PR_TYPE_CONFIG_NOT_FOUND",
    });
  await scheduleMeetingPointNotificationsForChangedRequests({
    previous: previousMeetingPoints,
    requests: await listRequestsAffectedByPRTypeMeetingPoint(normalizedType, normalizedType),
    updatedAt,
  });
  return toAdminPRTypeConfigDetail(saved);
};

export const updateAdminPRTypeConfigCompletion = async (
  type: string,
  input: AdminPRTypeConfigCompletion,
): Promise<AdminPRTypeConfigDetail> => {
  const { normalizedType } = await requireExisting(type);
  await assertExistingFeedbackQuestionnaireTemplate(input.feedbackQuestionnaireTemplateId);
  const saved = await configRepository.updateByType(normalizedType, {
    feedbackQuestionnaireTemplateId: input.feedbackQuestionnaireTemplateId,
  });
  if (!saved)
    return throwHttpProblem({
      status: 404,
      detail: "PR type configuration not found",
      code: "PR_TYPE_CONFIG_NOT_FOUND",
    });
  return toAdminPRTypeConfigDetail(saved);
};
