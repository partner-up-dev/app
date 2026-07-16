import type { PRTypeConfig } from "../../../entities/pr-type-config";
import type { AdminPRTypeConfigCatalogItem, AdminPRTypeConfigDetail } from "../contracts";

export const toAdminPRTypeConfigCatalogItem = (
  config: PRTypeConfig,
): AdminPRTypeConfigCatalogItem => ({
  type: config.type,
  title: config.title,
  description: config.description,
  coverImage: config.coverImage,
  viewRatios: {
    FORM: config.discoveryFormRatio,
    CARD: config.discoveryCardRatio,
    LIST: config.discoveryListRatio,
  },
});

export const toAdminPRTypeConfigDetail = (config: PRTypeConfig): AdminPRTypeConfigDetail => ({
  type: config.type,
  authoring: {
    locationPool: config.locationPool,
    routePool: config.routePool,
    timePoolConfig: config.timePoolConfig,
    timeWindowEditorDefaultMode: config.authoringTimeWindowEditorDefaultMode,
    defaultMinPartners: config.defaultMinPartners,
    defaultMaxPartners: config.defaultMaxPartners,
    defaultNotes: config.defaultNotes,
    authoringCreationPolicy: config.authoringCreationPolicy,
  },
  discovery: {
    title: config.title,
    description: config.description,
    coverImage: config.coverImage,
    communityQrCode: config.communityQrCode,
    viewRatios: {
      FORM: config.discoveryFormRatio,
      CARD: config.discoveryCardRatio,
      LIST: config.discoveryListRatio,
    },
  },
  participation: {
    defaultConfirmationEnabled: config.defaultConfirmationEnabled,
    defaultConfirmationStartOffsetMinutes: config.defaultConfirmationStartOffsetMinutes,
    defaultConfirmationEndOffsetMinutes: config.defaultConfirmationEndOffsetMinutes,
    defaultJoinLockOffsetMinutes: config.defaultJoinLockOffsetMinutes,
    joinGateConfig: config.joinGateConfig,
    participationFrequencyLimit: config.participationFrequencyLimit,
    fullCapacityExpansionPolicy: config.fullCapacityExpansionPolicy,
  },
  coordination: {
    meetingPoint: config.meetingPoint,
    locationMeetingPoints: config.locationMeetingPoints,
  },
  completion: {
    feedbackQuestionnaireTemplateId: config.feedbackQuestionnaireTemplateId,
  },
});
