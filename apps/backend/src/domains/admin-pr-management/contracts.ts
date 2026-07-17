import type {
  FeedbackQuestionnaireInstance,
  FeedbackQuestionnaireInstanceId,
  FeedbackQuestionnaireTemplate,
  FeedbackQuestionnaireTemplateId,
} from "../../entities/feedback-questionnaire";
import type { PRJoinGateConfig } from "../../entities/join-gate";
import type { MeetingPointConfig } from "../../entities/meeting-point";
import type { PRRoute, PRStatus, VisibilityStatus } from "../../entities/partner-request";
import type { PRTypeConfigAuthoringPolicy } from "../pr-type-config";

export type AdminPRSummary = {
  prId: number;
  title: string | null;
  type: string;
  location: string | null;
  route: PRRoute | null;
  placeDisplayName: string | null;
  time: [string | null, string | null];
  status: PRStatus;
  visibilityStatus: VisibilityStatus;
  minPartners: number | null;
  maxPartners: number | null;
  preferences: string[];
  notes: string | null;
  meetingPoint: MeetingPointConfig | null;
  joinGateConfig: PRJoinGateConfig;
  feedbackQuestionnaireInstanceId: FeedbackQuestionnaireInstanceId | null;
  partnerCount: number;
  confirmationEnabled: boolean;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
  createdAt: string;
};

export type AdminPRTypeOption = {
  type: string;
  title: string;
  description: string | null;
  locationOptions: string[];
  routeOptions: PRTypeConfigAuthoringPolicy["routePool"];
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  defaultNotes: string | null;
  defaultConfirmationEnabled: boolean;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
  joinGateConfig: PRJoinGateConfig;
  feedbackQuestionnaireTemplateId: FeedbackQuestionnaireTemplateId | null;
  authoringCreationPolicy: PRTypeConfigAuthoringPolicy["authoringCreationPolicy"];
};

export type AdminPRWorkspace = {
  prs: AdminPRSummary[];
  typeOptions: AdminPRTypeOption[];
  feedbackQuestionnaireTemplates: Array<
    Pick<FeedbackQuestionnaireTemplate, "id" | "key" | "version" | "title">
  >;
  feedbackQuestionnaireInstances: Array<
    Pick<FeedbackQuestionnaireInstance, "id" | "templateId" | "title">
  >;
};

export type AdminPRCreateInput = {
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
};

export type AdminPRContentInput = AdminPRCreateInput & {
  timeWindow: [string | null, string | null];
};
