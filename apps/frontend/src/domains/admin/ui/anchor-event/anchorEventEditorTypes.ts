import type {
  AnchorEventParticipationFrequencyLimit,
  AnchorEventRoutePool,
  PRJoinGateConfig,
} from "@partner-up-dev/backend";

export type EditableMeetingPointForm = {
  description: string;
  imageUrl: string;
};

export type AnchorEventEditorForm = {
  title: string;
  type: string;
  description: string;
  placePoolMode: "location" | "route";
  locationPoolText: string;
  routePool: AnchorEventRoutePool;
  meetingPointDescription: string;
  meetingPointImageUrl: string;
  locationMeetingPoints: Record<string, EditableMeetingPointForm>;
  joinGateConfig: PRJoinGateConfig;
  participationFrequencyLimit: AnchorEventParticipationFrequencyLimit;
  feedbackQuestionnaireTemplateId: number | null;
  defaultPrNotes: string;
  durationMinutes: number | null;
  earliestLeadMinutes: number | null;
  absoluteRulesText: string;
  recurringRulesText: string;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  defaultConfirmationEnabled: boolean;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
  coverImage: string;
  betaGroupQrCode: string;
  prCreationPolicy: "USER_AND_ADMIN" | "ADMIN_ONLY";
  fullPrExpansionPolicy: "ENABLED" | "DISABLED";
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
};

export type AnchorEventTimeWindowPreview = {
  key: string;
  timeWindow: [string | null, string | null];
  description?: string | null;
};

export type FeedbackQuestionnaireTemplateOption = {
  id: number;
  title: string;
};
