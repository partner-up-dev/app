import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export type WaitlistPromotedNotificationContextInput = {
  prId: number;
  partnerId: number;
  recipientUserId: string;
  waitlistCycleId: string;
};

export type WaitlistPromotedNotificationContext =
  | {
      state: "READY";
      title: string;
    }
  | {
      state: "SKIPPED";
      reason: "PR_MISSING" | "RECIPIENT_NOT_PROMOTED_PARTICIPANT" | "WAITLIST_CYCLE_SUPERSEDED";
    };

const resolveTitle = (input: { title: string | null; type: string; id: number }): string => {
  const title = input.title?.trim();
  if (title) {
    return title;
  }
  const type = input.type.trim();
  if (type) {
    return `${type}搭子`;
  }
  return `PR#${input.id}`;
};

export const getWaitlistPromotedNotificationContext = async (
  input: WaitlistPromotedNotificationContextInput,
): Promise<WaitlistPromotedNotificationContext> => {
  const request = await prRepo.findById(input.prId);
  if (!request) {
    return { state: "SKIPPED", reason: "PR_MISSING" };
  }

  const promotedSlot = await partnerRepo.findById(input.partnerId);
  if (
    !promotedSlot ||
    promotedSlot.prId !== request.id ||
    promotedSlot.userId !== input.recipientUserId ||
    !["JOINED", "CONFIRMED", "ATTENDED"].includes(promotedSlot.status)
  ) {
    return { state: "SKIPPED", reason: "RECIPIENT_NOT_PROMOTED_PARTICIPANT" };
  }
  if (promotedSlot.waitlistCycleId !== input.waitlistCycleId) {
    return { state: "SKIPPED", reason: "WAITLIST_CYCLE_SUPERSEDED" };
  }

  return {
    state: "READY",
    title: resolveTitle(request),
  };
};
