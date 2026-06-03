import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import {
  buildNaturalLanguagePRTypeCandidates,
  type NaturalLanguagePRTypeCandidate,
} from "./pr-type-options";

const prRepo = new PartnerRequestRepository();
const anchorEventRepo = new AnchorEventRepository();

export const resolveNaturalLanguagePRTypeCandidates =
  async (): Promise<NaturalLanguagePRTypeCandidate[]> => {
    const [existingPRTypes, anchorEventTypes] = await Promise.all([
      prRepo.listDistinctTypes(),
      anchorEventRepo.listDistinctTypes(),
    ]);

    return buildNaturalLanguagePRTypeCandidates({
      existingPRTypes,
      anchorEventTypes,
    });
  };
