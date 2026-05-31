import type { OfferId } from "../../../entities/offer";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PlacementRepository } from "../../../repositories/PlacementRepository";
import { PRAttachedOrderRepository } from "../../../repositories/PRAttachedOrderRepository";
import {
  buildPrPlacementRuleContextData,
  listMatchingPlacementCandidates,
} from "../services";
import type { PlacementType } from "../model";

const offerRepo = new OfferRepository();
const placementRepo = new PlacementRepository();
const partnerRepo = new PartnerRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const attachedOrderRepo = new PRAttachedOrderRepository();

export type CommercePlacementProjection =
  | {
      placement: {
        id: number;
        slotKey: "PR_UTILITY_ACTIONS_BUTTON";
        type: "BUTTON";
        creative: {
          title: string;
          subtitle?: string | null;
          ctaLabel: string;
        };
        target:
          | {
              kind: "ORDER";
              orderId: string;
              href: string;
            }
          | {
              kind: "ORDERING";
              placementInstanceId: number;
              context: {
                kind: "PR";
                prId: number;
              };
              href: string;
            };
      };
    }
  | {
      placement: null;
    };

const isActiveNow = (
  offer: { status: string; startsAt: Date | null; endsAt: Date | null },
  now = new Date(),
): boolean => {
  if (offer.status !== "ACTIVE") return false;
  if (offer.startsAt && offer.startsAt > now) return false;
  if (offer.endsAt && offer.endsAt < now) return false;
  return true;
};

export async function resolveCommercePlacementForPr(input: {
  prId: number;
  placementType: PlacementType;
  viewerUserId: string | null;
}): Promise<CommercePlacementProjection> {
  if (!input.viewerUserId) return { placement: null };

  const pr = await partnerRequestRepo.findById(input.prId as PRId);
  if (!pr) return { placement: null };

  const activeParticipants =
    await partnerRepo.listActiveParticipantSummariesByPrId(pr.id);
  if (
    !activeParticipants.some(
      (participant) => participant.userId === input.viewerUserId,
    )
  ) {
    return { placement: null };
  }

  const prContext = buildPrPlacementRuleContextData({
    activeParticipantCount: activeParticipants.length,
    pr,
  });
  const placementCandidates = await placementRepo.listActiveBySlotKeyAndType({
    placementType: input.placementType,
    slotKey: "PR_UTILITY_ACTIONS_BUTTON",
  });
  const matchingPlacements = listMatchingPlacementCandidates({
    candidates: placementCandidates,
    context: prContext,
  });

  for (const placement of matchingPlacements) {
    if (placement.target.kind !== "OFFER") {
      continue;
    }

    const offer = await offerRepo.findById(placement.target.offerId as OfferId);
    if (!offer || offer.productType !== "RENTAL" || !isActiveNow(offer)) {
      continue;
    }

    const existing = await attachedOrderRepo.findActiveByPrAndOffer(
      pr.id,
      offer.id,
    );
    if (existing) {
      return {
        placement: {
          id: placement.id,
          slotKey: placement.slotKey,
          type: placement.placementType,
          creative: placement.creative,
          target: {
            kind: "ORDER",
            orderId: existing.orderId,
            href: `/orders/${existing.orderId}`,
          },
        },
      };
    }

    return {
      placement: {
        id: placement.id,
        slotKey: placement.slotKey,
        type: placement.placementType,
        creative: placement.creative,
        target: {
          kind: "ORDERING",
          placementInstanceId: placement.id,
          context: {
            kind: "PR",
            prId: pr.id,
          },
          href: `/ordering/from-placement?placementInstanceId=${placement.id}&context=pr&contextId=${pr.id}`,
        },
      },
    };
  }

  return { placement: null };
}
