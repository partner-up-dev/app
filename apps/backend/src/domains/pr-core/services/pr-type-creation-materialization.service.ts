import type { PRId, PRJoinGateConfig } from "../../../entities";
import { materializePRTypeCompletionQuestionnaire } from "../../feedback-questionnaire/services/pr-type-completion-questionnaire";
import { materializePRTypeAuthoringDefaults } from "../../pr-authoring/services/pr-type-authoring-defaults";
import { getPRTypeConfigCreationDefaults } from "../../pr-type-config";
import { materializePRTypeParticipationSnapshot } from "./pr-type-participation-defaults.service";

/** Reads the current type config once and delegates each creation snapshot to its owner. */
export async function materializePRTypeConfigurationAtCreation(input: {
  prId: PRId;
  type: string;
  prNotes?: string | null;
  prJoinGateConfig?: PRJoinGateConfig;
}): Promise<void> {
  const config = await getPRTypeConfigCreationDefaults(input.type.trim());
  await materializePRTypeAuthoringDefaults({
    prId: input.prId,
    prNotes: input.prNotes,
    defaults: config,
  });
  await materializePRTypeParticipationSnapshot({
    prId: input.prId,
    defaults: config,
    prJoinGateConfig: input.prJoinGateConfig,
  });
  if (config) {
    await materializePRTypeCompletionQuestionnaire({
      prId: input.prId,
      feedbackQuestionnaireTemplateId: config.feedbackQuestionnaireTemplateId ?? null,
    });
  }
}
