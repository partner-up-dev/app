import type { PRId, UserId } from "../../../entities";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { reconcileCurrentCreator } from "./current-creator.service";

const prRepo = new PartnerRequestRepository();

export type AnchorParticipantReleaseEffects = {
  creatorTransferredToUserId: UserId | null;
  creatorTransferApplied: boolean;
};

export const applyAnchorParticipantReleaseEffects = async (input: {
  prId: PRId;
  releasedUserIds: UserId[];
}): Promise<AnchorParticipantReleaseEffects> => {
  const request = await prRepo.findById(input.prId);
  if (!request) {
    return {
      creatorTransferredToUserId: null,
      creatorTransferApplied: false,
    };
  }

  const releasedCurrentCreator =
    request.createdBy !== null && input.releasedUserIds.includes(request.createdBy);
  const reconciliation = await reconcileCurrentCreator(input.prId);

  return {
    creatorTransferredToUserId: reconciliation.nextCreatedBy,
    creatorTransferApplied: releasedCurrentCreator && reconciliation.changed,
  };
};
