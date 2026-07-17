import { throwHttpProblem } from "../../../lib/problem-details";
import {
  getPRTypeConfigOperatorDetail,
  updatePRTypeConfigAuthoring as updateAuthoring,
  updatePRTypeConfigCompletion as updateCompletion,
  updatePRTypeConfigCoordination as updateCoordination,
  updatePRTypeConfigDiscovery as updateDiscovery,
  updatePRTypeConfigParticipation as updateParticipation,
} from "../../pr-type-config";
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
const requireExistingType = async (type: string): Promise<string> => {
  const normalizedType = type.trim();
  const existing = await getPRTypeConfigOperatorDetail(normalizedType);
  if (!existing) {
    return throwHttpProblem({
      status: 404,
      detail: "PR type configuration not found",
      code: "PR_TYPE_CONFIG_NOT_FOUND",
    });
  }
  return normalizedType;
};

export const updateAdminPRTypeConfigAuthoring = async (
  type: string,
  input: AdminPRTypeConfigAuthoring,
): Promise<AdminPRTypeConfigDetail> => {
  return await updateAuthoring(type, input);
};

export const updateAdminPRTypeConfigDiscovery = async (
  type: string,
  input: AdminPRTypeConfigDiscovery,
): Promise<AdminPRTypeConfigDetail> => {
  return await updateDiscovery(type, input);
};

export const updateAdminPRTypeConfigParticipation = async (
  type: string,
  input: AdminPRTypeConfigParticipation,
): Promise<AdminPRTypeConfigDetail> => {
  return await updateParticipation(type, input);
};

export const updateAdminPRTypeConfigCoordination = async (
  type: string,
  input: AdminPRTypeConfigCoordination,
): Promise<AdminPRTypeConfigDetail> => {
  const normalizedType = await requireExistingType(type);
  const affectedRequests = await listRequestsAffectedByPRTypeMeetingPoint(
    normalizedType,
    normalizedType,
  );
  const previousMeetingPoints = await captureEffectiveMeetingPointsForRequests(affectedRequests);
  const updatedAt = new Date();
  const saved = await updateCoordination(normalizedType, input);
  await scheduleMeetingPointNotificationsForChangedRequests({
    previous: previousMeetingPoints,
    requests: await listRequestsAffectedByPRTypeMeetingPoint(normalizedType, normalizedType),
    updatedAt,
  });
  return saved;
};

export const updateAdminPRTypeConfigCompletion = async (
  type: string,
  input: AdminPRTypeConfigCompletion,
): Promise<AdminPRTypeConfigDetail> => {
  return await updateCompletion(type, input);
};
