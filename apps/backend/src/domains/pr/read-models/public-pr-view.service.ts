import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type { PartnerRequest } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";

const partnerRepo = new PartnerRepository();

/** `readyCycleId` is a private causal fence, never a browser read-model fact. */
export type PublicPR = Omit<PartnerRequest, "title" | "readyCycleId"> & {
  title?: string;
  partners: number[];
  myPartnerId: number | null;
  myPendingPartnerId: number | null;
  isViewerWaitlisted: boolean;
  isViewerReleased: boolean;
};

export async function toPublicPR(
  request: PartnerRequest,
  viewerUserId: UserId | null,
): Promise<PublicPR> {
  const partners = await partnerRepo.listActiveIdsByPrId(request.id);
  let myPartnerId: number | null = null;
  let myPendingPartnerId: number | null = null;
  let isViewerWaitlisted = false;
  let isViewerReleased = false;
  if (viewerUserId) {
    const slot = await partnerRepo.findActiveByPrIdAndUserId(request.id, viewerUserId);
    myPartnerId = slot?.id ?? null;
    if (myPartnerId === null) {
      const pendingSlot = await partnerRepo.findPendingByPrIdAndUserId(request.id, viewerUserId);
      myPendingPartnerId = pendingSlot?.id ?? null;
      isViewerWaitlisted = myPendingPartnerId !== null;
    }
    if (myPartnerId === null && myPendingPartnerId === null) {
      const releasedSlot = await partnerRepo.findReleasedByPrIdAndUserId(request.id, viewerUserId);
      isViewerReleased = releasedSlot !== null;
    }
  }

  const { title, readyCycleId: _readyCycleId, ...rest } = request;

  return {
    ...rest,
    title: title ?? undefined,
    partners,
    myPartnerId,
    myPendingPartnerId,
    isViewerWaitlisted,
    isViewerReleased,
  };
}
