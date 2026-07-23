import type { PRRoute } from "../../entities/partner-request";
import { throwHttpProblem } from "../../lib/problem-details";
import type {
  PRTypeConfigAuthoring,
  PRTypeConfigCompletion,
  PRTypeConfigCreateInput,
  PRTypeConfigDiscovery,
  PRTypeConfigOperatorDetail,
  PRTypeConfigParticipation,
} from "./contracts";
import {
  createPRTypeConfigRecord,
  findPRTypeConfigRecord,
  findPRTypeConfigRecordByNormalizedType,
  updatePRTypeConfigRecord,
} from "./services/persistence";
import { toPRTypeConfigOperatorDetail } from "./services/projection";
import {
  assertExistingPRTypeConfigFeedbackQuestionnaireTemplate,
  assertPublishedPRTypeConfigLocationPool,
  normalizePRTypeConfigCreateInput,
} from "./services/validation";

const requireExistingPRTypeConfig = async (type: string) => {
  const normalizedType = type.trim();
  const existing = await findPRTypeConfigRecord(normalizedType);
  if (!existing) {
    return throwHttpProblem({
      status: 404,
      detail: "PR type configuration not found",
      code: "PR_TYPE_CONFIG_NOT_FOUND",
    });
  }
  return { normalizedType, existing };
};

const requireUpdatedPRTypeConfig = async (
  type: string,
  patch: Parameters<typeof updatePRTypeConfigRecord>[1],
): Promise<PRTypeConfigOperatorDetail> => {
  const saved = await updatePRTypeConfigRecord(type, patch);
  if (!saved) {
    return throwHttpProblem({
      status: 404,
      detail: "PR type configuration not found",
      code: "PR_TYPE_CONFIG_NOT_FOUND",
    });
  }
  return toPRTypeConfigOperatorDetail(saved);
};

export const createPRTypeConfig = async (
  rawInput: PRTypeConfigCreateInput,
): Promise<PRTypeConfigOperatorDetail> => {
  const input = normalizePRTypeConfigCreateInput(rawInput);
  const existing = await findPRTypeConfigRecordByNormalizedType(input.type);
  if (existing) {
    return throwHttpProblem({
      status: 409,
      detail: "PR type configuration already exists; update an owner slice instead",
      code: "PR_TYPE_CONFIG_ALREADY_EXISTS",
    });
  }

  await assertPublishedPRTypeConfigLocationPool(input.authoring.locationPool);
  await assertExistingPRTypeConfigFeedbackQuestionnaireTemplate(
    input.completion.feedbackQuestionnaireTemplateId,
  );
  if (input.authoring.locationPool.length > 0 && input.authoring.routePool.length > 0) {
    return throwHttpProblem({
      status: 422,
      detail: "A PR type must choose either a location pool or a route pool",
      code: "PR_TYPE_PLACE_POOL_EXCLUSIVE",
    });
  }

  const saved = await createPRTypeConfigRecord({
    type: input.type,
    title: input.discovery.title,
    description: input.discovery.description,
    locationPool: input.authoring.locationPool,
    routePool: input.authoring.routePool,
    timePoolConfig: input.authoring.timePoolConfig,
    authoringTimeWindowEditorDefaultMode: input.authoring.timeWindowEditorDefaultMode,
    defaultMinPartners: input.authoring.defaultMinPartners,
    defaultMaxPartners: input.authoring.defaultMaxPartners,
    defaultNotes: input.authoring.defaultNotes,
    defaultConfirmationEnabled: input.participation.defaultConfirmationEnabled,
    defaultConfirmationStartOffsetMinutes:
      input.participation.defaultConfirmationStartOffsetMinutes,
    defaultConfirmationEndOffsetMinutes: input.participation.defaultConfirmationEndOffsetMinutes,
    defaultJoinLockOffsetMinutes: input.participation.defaultJoinLockOffsetMinutes,
    meetingPoint: input.coordination.meetingPoint,
    joinGateConfig: input.participation.joinGateConfig,
    participationFrequencyLimit: input.participation.participationFrequencyLimit,
    feedbackQuestionnaireTemplateId: input.completion.feedbackQuestionnaireTemplateId,
    locationMeetingPoints: input.coordination.locationMeetingPoints,
    coverImage: input.discovery.coverImage,
    communityQrCode: input.discovery.communityQrCode,
    authoringCreationPolicy: input.authoring.authoringCreationPolicy,
    fullCapacityExpansionPolicy: input.participation.fullCapacityExpansionPolicy,
    discoveryFormRatio: input.discovery.viewRatios.FORM,
    discoveryCardRatio: input.discovery.viewRatios.CARD,
    discoveryListRatio: input.discovery.viewRatios.LIST,
  });
  return toPRTypeConfigOperatorDetail(saved);
};

export const updatePRTypeConfigAuthoring = async (
  type: string,
  input: PRTypeConfigAuthoring,
): Promise<PRTypeConfigOperatorDetail> => {
  const { normalizedType } = await requireExistingPRTypeConfig(type);
  const locationPool = Array.from(new Set(input.locationPool.map((location) => location.trim())));
  await assertPublishedPRTypeConfigLocationPool(locationPool);
  if (locationPool.length > 0 && input.routePool.length > 0) {
    return throwHttpProblem({
      status: 422,
      detail: "A PR type must choose either a location pool or a route pool",
      code: "PR_TYPE_PLACE_POOL_EXCLUSIVE",
    });
  }
  return await requireUpdatedPRTypeConfig(normalizedType, {
    locationPool,
    routePool: input.routePool,
    timePoolConfig: input.timePoolConfig,
    authoringTimeWindowEditorDefaultMode: input.timeWindowEditorDefaultMode,
    defaultMinPartners: input.defaultMinPartners,
    defaultMaxPartners: input.defaultMaxPartners,
    defaultNotes: input.defaultNotes?.trim() || null,
    authoringCreationPolicy: input.authoringCreationPolicy,
  });
};

export const updatePRTypeConfigDiscovery = async (
  type: string,
  input: PRTypeConfigDiscovery,
): Promise<PRTypeConfigOperatorDetail> => {
  const { normalizedType } = await requireExistingPRTypeConfig(type);
  return await requireUpdatedPRTypeConfig(normalizedType, {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    coverImage: input.coverImage?.trim() || null,
    communityQrCode: input.communityQrCode?.trim() || null,
    discoveryFormRatio: input.viewRatios.FORM,
    discoveryCardRatio: input.viewRatios.CARD,
    discoveryListRatio: input.viewRatios.LIST,
  });
};

export const updatePRTypeConfigParticipation = async (
  type: string,
  input: PRTypeConfigParticipation,
): Promise<PRTypeConfigOperatorDetail> => {
  const { normalizedType } = await requireExistingPRTypeConfig(type);
  return await requireUpdatedPRTypeConfig(normalizedType, {
    defaultConfirmationEnabled: input.defaultConfirmationEnabled,
    defaultConfirmationStartOffsetMinutes: input.defaultConfirmationStartOffsetMinutes,
    defaultConfirmationEndOffsetMinutes: input.defaultConfirmationEndOffsetMinutes,
    defaultJoinLockOffsetMinutes: input.defaultJoinLockOffsetMinutes,
    joinGateConfig: input.joinGateConfig,
    participationFrequencyLimit: input.participationFrequencyLimit,
    fullCapacityExpansionPolicy: input.fullCapacityExpansionPolicy,
  });
};

export const updatePRTypeConfigCompletion = async (
  type: string,
  input: PRTypeConfigCompletion,
): Promise<PRTypeConfigOperatorDetail> => {
  const { normalizedType } = await requireExistingPRTypeConfig(type);
  await assertExistingPRTypeConfigFeedbackQuestionnaireTemplate(
    input.feedbackQuestionnaireTemplateId,
  );
  return await requireUpdatedPRTypeConfig(normalizedType, {
    feedbackQuestionnaireTemplateId: input.feedbackQuestionnaireTemplateId,
  });
};

const buildRoutePoolEntryId = (
  applicationId: number,
  routePool: readonly { id: string }[],
): string => {
  const baseId = `application-${applicationId}`;
  const existingIds = new Set(routePool.map((entry) => entry.id));
  if (!existingIds.has(baseId)) return baseId;
  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) suffix += 1;
  return `${baseId}-${suffix}`;
};

const areRoutesEqual = (left: PRRoute, right: PRRoute): boolean =>
  left.length === right.length &&
  left.every((point, index) => {
    const other = right[index];
    return Boolean(
      other &&
      point.name === other.name &&
      point.full_address === other.full_address &&
      JSON.stringify(point.wgs84) === JSON.stringify(other.wgs84) &&
      JSON.stringify(point.bd09) === JSON.stringify(other.bd09) &&
      JSON.stringify(point.gcj02) === JSON.stringify(other.gcj02),
    );
  });

export type AppendPRTypeConfigRouteResult =
  | { kind: "TYPE_NOT_FOUND" }
  | { kind: "LOCATION_POOL" }
  | { kind: "ALREADY_PRESENT" }
  | { kind: "APPENDED" };

/**
 * Operator-only command used by route-application review. It performs one current-config read and owns the
 * route-pool append so Authoring cannot write configuration persistence directly.
 */
export const appendPRTypeConfigRoute = async (input: {
  type: string;
  applicationId: number;
  route: PRRoute;
}): Promise<AppendPRTypeConfigRouteResult> => {
  const config = await findPRTypeConfigRecord(input.type);
  if (!config) return { kind: "TYPE_NOT_FOUND" };
  if (config.locationPool.length > 0) return { kind: "LOCATION_POOL" };
  if (config.routePool.some((entry) => areRoutesEqual(entry.route, input.route))) {
    return { kind: "ALREADY_PRESENT" };
  }
  const updated = await updatePRTypeConfigRecord(input.type, {
    routePool: [
      ...config.routePool,
      { id: buildRoutePoolEntryId(input.applicationId, config.routePool), route: input.route },
    ],
  });
  if (!updated) return { kind: "TYPE_NOT_FOUND" };
  return { kind: "APPENDED" };
};
