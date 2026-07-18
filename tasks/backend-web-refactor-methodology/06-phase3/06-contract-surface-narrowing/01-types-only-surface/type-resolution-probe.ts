import type {
  FeedbackQuestionnaireAnswers,
  PRJoinGateConfig,
  PRRoute,
} from "@partner-up-dev/backend/contracts";

type ContractsResolutionProbe = {
  answers: FeedbackQuestionnaireAnswers;
  joinGates: PRJoinGateConfig;
  route: PRRoute;
};

export type { ContractsResolutionProbe };
