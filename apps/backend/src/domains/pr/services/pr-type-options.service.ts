import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { listPRTypeConfigTypeNames } from "../../pr-type-config";
import {
  buildNaturalLanguagePRTypeCandidates,
  type NaturalLanguagePRTypeCandidate,
} from "./pr-type-options";

const prRepo = new PartnerRequestRepository();

export const resolveNaturalLanguagePRTypeCandidates = async (): Promise<
  NaturalLanguagePRTypeCandidate[]
> => {
  const [observedPRTypes, configs] = await Promise.all([
    prRepo.listDistinctTypes(),
    listPRTypeConfigTypeNames(),
  ]);

  return buildNaturalLanguagePRTypeCandidates({
    observedPRTypes,
    configuredPRTypes: configs,
  });
};
