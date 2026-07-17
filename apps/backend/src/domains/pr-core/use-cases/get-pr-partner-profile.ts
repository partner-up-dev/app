import { throwHttpProblem } from "../../../lib/problem-details";
import type { PartnerId } from "../../../entities/partner";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { readPartnerRequestById } from "../services/pr-read.service";

const partnerRepo = new PartnerRepository();

export type PRPartnerProfile = {
  partnerId: PartnerId;
  nickname: string | null;
  displayName: string;
  avatarUrl: string | null;
  isCurrentLocalUser: boolean;
};

const resolveDisplayName = (
  partnerId: PartnerId,
  nickname: string | null,
  isCreator: boolean,
): string => {
  const normalizedNickname = nickname?.trim() ?? "";
  if (normalizedNickname.length > 0) {
    return normalizedNickname;
  }

  if (isCreator) {
    return "发起者";
  }

  return `搭子 #${partnerId}`;
};

export async function getPRPartnerProfile(params: {
  prId: PRId;
  partnerId: PartnerId;
  viewerUserId?: UserId | null;
}): Promise<PRPartnerProfile> {
  const { prId, partnerId, viewerUserId = null } = params;
  const request = await readPartnerRequestById(prId, {
    consistency: "eventual",
  });
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  const participant = await partnerRepo.findActiveParticipantSummaryByPrIdAndPartnerId(
    prId,
    partnerId,
  );
  if (!participant) {
    return throwHttpProblem({ status: 404, detail: "Partner profile not found" });
  }

  const isCreator = Boolean(request.createdBy) && request.createdBy === participant.userId;
  const isCurrentLocalUser = Boolean(viewerUserId) && viewerUserId === participant.userId;

  return {
    partnerId: participant.partnerId,
    nickname: participant.nickname,
    displayName: resolveDisplayName(participant.partnerId, participant.nickname, isCreator),
    avatarUrl: participant.avatar,
    isCurrentLocalUser,
  };
}
