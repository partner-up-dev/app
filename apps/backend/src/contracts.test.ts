import { expect, test } from "vitest";
import type {
  ActiveUserTelemetryEvent as FacadeActiveUserTelemetryEvent,
  ActiveUserTelemetryEventName as FacadeActiveUserTelemetryEventName,
  ActiveUserTelemetryEventVersion as FacadeActiveUserTelemetryEventVersion,
  CoordinatePair as FacadeCoordinatePair,
  CreatePRStructuredStatus as FacadeCreatePRStructuredStatus,
  FeedbackQuestionnaireAnswers as FacadeFeedbackQuestionnaireAnswers,
  FeedbackQuestionnaireDefinition as FacadeFeedbackQuestionnaireDefinition,
  ImageUploadPurpose as FacadeImageUploadPurpose,
  PartnerRequestFields as FacadePartnerRequestFields,
  PRAllowEditAfterReady as FacadePRAllowEditAfterReady,
  PRJoinGateConfig as FacadePRJoinGateConfig,
  PRJoinGateConfigItem as FacadePRJoinGateConfigItem,
  PRJoinGateSource as FacadePRJoinGateSource,
  PRJoinNoticeGateConfig as FacadePRJoinNoticeGateConfig,
  PRRoute as FacadePRRoute,
  PRRoutePoint as FacadePRRoutePoint,
  PRStatus as FacadePRStatus,
  PRStatusManual as FacadePRStatusManual,
  PRTimeWindow as FacadePRTimeWindow,
  VisibilityStatus as FacadeVisibilityStatus,
  WeekdayLabel as FacadeWeekdayLabel,
} from "./contracts";
import type {
  FeedbackQuestionnaireAnswers,
  FeedbackQuestionnaireDefinition,
} from "./domains/feedback-questionnaire/contracts";
import type {
  PRJoinGateConfig,
  PRJoinGateConfigItem,
  PRJoinGateSource,
  PRJoinNoticeGateConfig,
} from "./domains/pr/contracts/join-gate";
import type {
  CoordinatePair,
  CreatePRStructuredStatus,
  PartnerRequestFields,
  PRAllowEditAfterReady,
  PRRoute,
  PRRoutePoint,
  PRStatus,
  PRStatusManual,
  PRTimeWindow,
  VisibilityStatus,
  WeekdayLabel,
} from "./domains/pr/contracts/partner-request";
import type { ImageUploadPurpose } from "./infra/storage/contracts";
import type {
  ActiveUserTelemetryEvent,
  ActiveUserTelemetryEventName,
  ActiveUserTelemetryEventVersion,
} from "./infra/telemetry/contracts";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <Value>() => Value extends Left ? 1 : 2
      ? true
      : false
    : false;

type Assert<Condition extends true> = Condition;

type FacadeTypeEquality = readonly [
  Assert<Equal<FacadeFeedbackQuestionnaireAnswers, FeedbackQuestionnaireAnswers>>,
  Assert<Equal<FacadeFeedbackQuestionnaireDefinition, FeedbackQuestionnaireDefinition>>,
  Assert<Equal<FacadePRJoinGateConfig, PRJoinGateConfig>>,
  Assert<Equal<FacadePRJoinGateConfigItem, PRJoinGateConfigItem>>,
  Assert<Equal<FacadePRJoinGateSource, PRJoinGateSource>>,
  Assert<Equal<FacadePRJoinNoticeGateConfig, PRJoinNoticeGateConfig>>,
  Assert<Equal<FacadeCoordinatePair, CoordinatePair>>,
  Assert<Equal<FacadeCreatePRStructuredStatus, CreatePRStructuredStatus>>,
  Assert<Equal<FacadePartnerRequestFields, PartnerRequestFields>>,
  Assert<Equal<FacadePRAllowEditAfterReady, PRAllowEditAfterReady>>,
  Assert<Equal<FacadePRRoute, PRRoute>>,
  Assert<Equal<FacadePRRoutePoint, PRRoutePoint>>,
  Assert<Equal<FacadePRStatus, PRStatus>>,
  Assert<Equal<FacadePRStatusManual, PRStatusManual>>,
  Assert<Equal<FacadePRTimeWindow, PRTimeWindow>>,
  Assert<Equal<FacadeVisibilityStatus, VisibilityStatus>>,
  Assert<Equal<FacadeWeekdayLabel, WeekdayLabel>>,
  Assert<Equal<FacadeImageUploadPurpose, ImageUploadPurpose>>,
  Assert<Equal<FacadeActiveUserTelemetryEvent, ActiveUserTelemetryEvent>>,
  Assert<Equal<FacadeActiveUserTelemetryEventName, ActiveUserTelemetryEventName>>,
  Assert<Equal<FacadeActiveUserTelemetryEventVersion, ActiveUserTelemetryEventVersion>>,
];

test("package contract symbols are exact aliases of owner contract types", () => {
  const equalityProof: FacadeTypeEquality = [
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
  ];

  expect(equalityProof.every(Boolean)).toBe(true);
});
