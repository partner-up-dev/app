import type { PartnerId } from "../../../entities/partner";
import type { PartnerRequest } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { resetPRJoinGateResolutionsForUser } from "./join-gates.service";

const partnerRepo = new PartnerRepository();

const normalizeText = (value: string | null): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

export async function closeAlternativeWaitlistSourcesAfterJoin(input: {
  alternativeRequest: PartnerRequest;
  userId: UserId;
  alternativePartnerId: PartnerId;
}): Promise<void> {
  const type = normalizeText(input.alternativeRequest.type);
  const location = normalizeText(input.alternativeRequest.location);
  if (!type || !location) {
    return;
  }

  const sourceSlots = await partnerRepo.listPendingAlternativeReminderSlotsByUserForAlternative({
    userId: input.userId,
    type,
    location,
    excludePrId: input.alternativeRequest.id,
  });

  for (const sourceSlot of sourceSlots) {
    const cancelled = await partnerRepo.cancelPendingSlot(sourceSlot.partnerId);
    if (!cancelled) {
      continue;
    }
    await resetPRJoinGateResolutionsForUser({
      prId: sourceSlot.prId,
      userId: input.userId,
      partnerId: sourceSlot.partnerId,
    });
  }
}
