/**
 * Cross-unit value and wire-contract types only.
 *
 * This module is published exclusively through the package's `contracts`
 * types subpath. Keep runtime schemas, entities, repositories, services and
 * inferred persistence rows out of this surface.
 */
export type {
  FeedbackQuestionnaireAnswers,
  FeedbackQuestionnaireDefinition,
} from "./domains/feedback-questionnaire/contracts";
export type {
  PRJoinGateConfig,
  PRJoinGateConfigItem,
  PRJoinGateSource,
  PRJoinNoticeGateConfig,
} from "./domains/pr/contracts/join-gate";
export type {
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
export type { ImageUploadPurpose } from "./infra/storage/contracts";
export type {
  ActiveUserTelemetryEvent,
  ActiveUserTelemetryEventName,
  ActiveUserTelemetryEventVersion,
} from "./infra/telemetry/contracts";
