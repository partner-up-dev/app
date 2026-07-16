import type { NewPRTypeConfig } from "../../../entities/pr-type-config";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";
import type { AdminPRTypeConfigCreateInput, AdminPRTypeConfigDetail } from "../contracts";
import { toAdminPRTypeConfigDetail } from "../services/projection";
import {
  assertExistingFeedbackQuestionnaireTemplate,
  assertPublishedLocationPool,
  normalizeAdminPRTypeConfigInput,
} from "../services/validation";

const configRepository = new PRTypeConfigRepository();

export const createAdminPRTypeConfig = async (
  rawInput: AdminPRTypeConfigCreateInput,
): Promise<AdminPRTypeConfigDetail> => {
  const input = normalizeAdminPRTypeConfigInput(rawInput);
  const existing = await configRepository.findByType(input.type);
  if (existing) {
    return throwHttpProblem({
      status: 409,
      detail: "PR type configuration already exists; update an owner slice instead",
      code: "PR_TYPE_CONFIG_ALREADY_EXISTS",
    });
  }

  await assertPublishedLocationPool(input.authoring.locationPool);
  await assertExistingFeedbackQuestionnaireTemplate(
    input.completion.feedbackQuestionnaireTemplateId,
  );
  if (input.authoring.locationPool.length > 0 && input.authoring.routePool.length > 0) {
    return throwHttpProblem({
      status: 422,
      detail: "A PR type must choose either a location pool or a route pool",
      code: "PR_TYPE_PLACE_POOL_EXCLUSIVE",
    });
  }

  const persistence: NewPRTypeConfig = {
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
  };

  const saved = await configRepository.create(persistence);
  return toAdminPRTypeConfigDetail(saved);
};
