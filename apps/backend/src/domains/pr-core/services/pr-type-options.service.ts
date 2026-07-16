import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";
import {
  buildNaturalLanguagePRTypeCandidates,
  type NaturalLanguagePRTypeCandidate,
} from "./pr-type-options";

const prRepo = new PartnerRequestRepository();
const prTypeConfigRepo = new PRTypeConfigRepository();

export const resolveNaturalLanguagePRTypeCandidates = async (): Promise<
  NaturalLanguagePRTypeCandidate[]
> => {
  const [observedPRTypes, configs] = await Promise.all([
    prRepo.listDistinctTypes(),
    prTypeConfigRepo.listAll(),
  ]);

  return buildNaturalLanguagePRTypeCandidates({
    observedPRTypes,
    configuredPRTypes: configs.map((config) => config.type),
  });
};
