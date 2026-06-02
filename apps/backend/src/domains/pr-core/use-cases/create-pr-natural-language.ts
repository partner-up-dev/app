import { PartnerRequestAIService } from "../../../services/PartnerRequestAIService";
import type {
  WeekdayLabel,
} from "../../../entities/partner-request";
import {
  type CreatorIdentityInput,
} from "../services/creator-identity.service";
import {
  type CreatePRCommandResult,
} from "./create-pr.shared";
import { resolveNaturalLanguagePRTypeCandidates } from "../services/pr-type-options.service";
import {
  canonicalizeNaturalLanguagePRType,
  toNaturalLanguagePRTypePromptHints,
} from "../services/pr-type-options";
import { createPRFromStructured } from "./create-pr-structured";

const aiService = new PartnerRequestAIService();

export async function createPRFromNaturalLanguage(
  rawText: string,
  nowIso: string,
  nowWeekday: WeekdayLabel | null,
  creatorIdentity: CreatorIdentityInput,
): Promise<CreatePRCommandResult> {
  const typeCandidates = await resolveNaturalLanguagePRTypeCandidates();
  const fields = await aiService.parseRequest(
    rawText,
    nowIso,
    nowWeekday,
    toNaturalLanguagePRTypePromptHints(typeCandidates),
  );
  const canonicalizedFields = {
    ...fields,
    type: canonicalizeNaturalLanguagePRType(fields.type, typeCandidates),
  };

  return createPRFromStructured(
    canonicalizedFields,
    creatorIdentity,
    {
      createSource: "NATURAL_LANGUAGE",
      partnerBoundsMode: "automatic",
      operationLog: {
        detail: { rawText },
      },
    },
  );
}
