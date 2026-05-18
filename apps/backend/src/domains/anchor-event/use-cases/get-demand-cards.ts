import { throwHttpProblem } from "../../../lib/problem-details";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type { AnchorEventId } from "../../../entities/anchor-event";
import type { UserId } from "../../../entities/user";
import {
  listDemandCards as listDemandCardSummaries,
  type DemandCardSummary,
} from "../services/demand-card-projection.service";

const anchorEventRepo = new AnchorEventRepository();

export type AnchorEventDemandCard = DemandCardSummary;

export const getAnchorEventDemandCards = async (
  eventId: AnchorEventId,
  viewerUserId?: UserId | null,
): Promise<AnchorEventDemandCard[]> => {
  const event = await anchorEventRepo.findById(eventId);
  if (!event) {
    return throwHttpProblem({ status: 404, detail: "Anchor event not found" });
  }

  return listDemandCardSummaries({
    eventId,
    viewerUserId,
  });
};
