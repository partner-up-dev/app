# 06D Export-only restoration guidance

If a post-edit type/build or root-owned System/architecture-fitness gate shows
that a removed declaration is still required, restore only the declarations in
`apps/backend/src/index.ts`. The source restoration is intentionally limited to
the following block (the exact pre-edit lines):

```ts
export type {
  FeedbackQuestionnaireAnswers,
  FeedbackQuestionnaireDefinition,
} from "./entities/feedback-questionnaire";
export type {
  PRJoinGateConfig,
  PRJoinGateConfigItem,
  PRJoinGateSource,
  PRJoinNoticeGateConfig,
} from "./entities/join-gate";
// Export types for frontend use
export type {
  CoordinatePair,
  CreatePRStructuredStatus,
  PartnerRequestFields,
  PRAllowEditAfterReady,
  PRId,
  PRRoute,
  PRRoutePoint,
  PRStatus,
  PRStatusManual,
  PRTimeWindow,
  VisibilityStatus,
  WeekdayLabel,
} from "./entities/partner-request";
export type { ImageUploadPurpose } from "./infra/storage/image-storage.service";
```

Apply the block as an export-only patch, then rerun the Backend/Web type and
build checks and record the first failing proof. Do not restore schemas,
controllers, routes, migrations, data, Web runtime code, or generated output;
those concerns require a separately authorized owner packet.
