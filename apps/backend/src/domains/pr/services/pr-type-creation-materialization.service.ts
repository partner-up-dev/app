import type { PRId, PRJoinGateConfig } from "../../../entities";
import { materializeFeedbackQuestionnaireInstance } from "../../feedback-questionnaire";
import { getPRTypeConfigCreationDefaults } from "../../pr-type-config";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { materializePRTypeParticipationSnapshot } from "./pr-type-participation-defaults.service";

const requestRepository = new PartnerRequestRepository();

/** Reads the current type config once and delegates each creation snapshot to its owner. */
export async function materializePRTypeConfigurationAtCreation(input: {
  prId: PRId;
  type: string;
  prNotes?: string | null;
  prJoinGateConfig?: PRJoinGateConfig;
}): Promise<void> {
  const config = await getPRTypeConfigCreationDefaults(input.type.trim());
  const currentNotes = input.prNotes?.trim() ?? "";
  const defaultNotes = config?.defaultNotes?.trim() ?? "";
  if (currentNotes.length === 0 && defaultNotes.length > 0) {
    await requestRepository.updateNotes(input.prId, defaultNotes);
  }
  await materializePRTypeParticipationSnapshot({
    prId: input.prId,
    defaults: config,
    prJoinGateConfig: input.prJoinGateConfig,
  });
  if (config) {
    const feedbackQuestionnaireInstanceId = await materializeFeedbackQuestionnaireInstance(
      config.feedbackQuestionnaireTemplateId ?? null,
    );
    await requestRepository.updateFeedbackQuestionnaireInstanceId(
      input.prId,
      feedbackQuestionnaireInstanceId,
    );
  }
}
