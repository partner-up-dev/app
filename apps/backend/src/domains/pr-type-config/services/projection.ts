import type { PRTypeConfig } from "../../../entities/pr-type-config";
import type {
  PRTypeConfigAuthoringPolicy,
  PRTypeConfigCreationDefaults,
  PRTypeConfigCreationPolicy,
  PRTypeConfigDiscoveryCatalogPolicy,
  PRTypeConfigDiscoveryPolicy,
  PRTypeConfigExpansionPolicy,
  PRTypeConfigMeetingPointPolicy,
  PRTypeConfigOperatorCatalogItem,
  PRTypeConfigOperatorDetail,
  PRTypeConfigParticipationFrequencyPolicy,
} from "../contracts";

export const toPRTypeConfigDiscoveryCatalogPolicy = (
  config: PRTypeConfig,
): PRTypeConfigDiscoveryCatalogPolicy => ({
  type: config.type,
  title: config.title,
  description: config.description,
  coverImage: config.coverImage,
  locationPool: [...config.locationPool],
  routePool: [...config.routePool],
});

export const toPRTypeConfigDiscoveryPolicy = (
  config: PRTypeConfig,
): PRTypeConfigDiscoveryPolicy => ({
  ...toPRTypeConfigDiscoveryCatalogPolicy(config),
  communityQrCode: config.communityQrCode,
  viewRatios: {
    FORM: config.discoveryFormRatio,
    CARD: config.discoveryCardRatio,
    LIST: config.discoveryListRatio,
  },
});

export const toPRTypeConfigAuthoringPolicy = (
  config: PRTypeConfig,
): PRTypeConfigAuthoringPolicy => ({
  type: config.type,
  locationPool: [...config.locationPool],
  routePool: [...config.routePool],
  timePoolConfig: config.timePoolConfig,
  timeWindowEditorDefaultMode: config.authoringTimeWindowEditorDefaultMode,
  defaultMinPartners: config.defaultMinPartners,
  defaultMaxPartners: config.defaultMaxPartners,
  defaultNotes: config.defaultNotes,
  authoringCreationPolicy: config.authoringCreationPolicy,
});

export const toPRTypeConfigCreationPolicy = (
  config: PRTypeConfig,
): PRTypeConfigCreationPolicy => ({
  authoringCreationPolicy: config.authoringCreationPolicy,
});

export const toPRTypeConfigCreationDefaults = (
  config: PRTypeConfig,
): PRTypeConfigCreationDefaults => ({
  defaultNotes: config.defaultNotes,
  defaultConfirmationEnabled: config.defaultConfirmationEnabled,
  defaultConfirmationStartOffsetMinutes: config.defaultConfirmationStartOffsetMinutes,
  defaultConfirmationEndOffsetMinutes: config.defaultConfirmationEndOffsetMinutes,
  defaultJoinLockOffsetMinutes: config.defaultJoinLockOffsetMinutes,
  joinGateConfig: config.joinGateConfig,
  feedbackQuestionnaireTemplateId: config.feedbackQuestionnaireTemplateId,
});

export const toPRTypeConfigParticipationFrequencyPolicy = (
  config: PRTypeConfig,
): PRTypeConfigParticipationFrequencyPolicy => ({
  participationFrequencyLimit: config.participationFrequencyLimit,
});

export const toPRTypeConfigExpansionPolicy = (
  config: PRTypeConfig,
): PRTypeConfigExpansionPolicy => ({
  fullCapacityExpansionPolicy: config.fullCapacityExpansionPolicy,
  locationPool: [...config.locationPool],
});

export const toPRTypeConfigMeetingPointPolicy = (
  config: PRTypeConfig,
): PRTypeConfigMeetingPointPolicy => ({
  meetingPoint: config.meetingPoint,
  locationMeetingPoints: config.locationMeetingPoints,
});

export const toPRTypeConfigOperatorCatalogItem = (
  config: PRTypeConfig,
): PRTypeConfigOperatorCatalogItem => ({
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

export const toPRTypeConfigOperatorDetail = (
  config: PRTypeConfig,
): PRTypeConfigOperatorDetail => ({
  type: config.type,
  authoring: {
    locationPool: [...config.locationPool],
    routePool: [...config.routePool],
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
