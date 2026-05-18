import type { PRId, UserId } from "../../../entities";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

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

  let creatorTransferredToUserId = request.createdBy ?? null;
  let creatorTransferApplied = false;
  if (request.createdBy && input.releasedUserIds.includes(request.createdBy)) {
    const activeParticipants =
      await partnerRepo.listActiveParticipantSummariesByPrId(input.prId);
    const successor = activeParticipants[0] ?? null;
    creatorTransferredToUserId = successor?.userId ?? null;
    await prRepo.setCreatedBy(input.prId, creatorTransferredToUserId);
    creatorTransferApplied = true;
  }

  return {
    creatorTransferredToUserId,
    creatorTransferApplied,
  };
};
