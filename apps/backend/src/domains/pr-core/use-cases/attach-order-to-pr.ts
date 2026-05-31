import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import type { OfferId } from "../../../entities/offer";
import type { PRId } from "../../../entities/partner-request";
import { partnerRequests } from "../../../entities/partner-request";
import { partners } from "../../../entities/partner";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { PRAttachedOrderRepository } from "../../../repositories/PRAttachedOrderRepository";
import type { RepositoryExecutor } from "../../../repositories/_executor";
import { and, desc, eq, inArray } from "drizzle-orm";

export async function attachOrderToPr(
  input: {
    prId: PRId;
    offerId: OfferId;
    orderId: TradeOrderId;
    orderCreatedBy: UserId;
  },
  executor: RepositoryExecutor = db,
) {
  const attachedOrderRepo = new PRAttachedOrderRepository(executor);

  const [request] = await executor
    .select()
    .from(partnerRequests)
    .where(eq(partnerRequests.id, input.prId));
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  if (request.status !== "READY") {
    return throwHttpProblem({
      status: 409,
      detail: "Order attachment requires PR READY status",
    });
  }

  if (!request.createdBy || request.createdBy !== input.orderCreatedBy) {
    return throwHttpProblem({
      status: 403,
      detail: "Only the PR creator can attach an order to this PR",
    });
  }

  const [creatorParticipant] = await executor
    .select()
    .from(partners)
    .where(
      and(
        eq(partners.prId, request.id),
        eq(partners.userId, input.orderCreatedBy),
        inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"]),
      ),
    )
    .orderBy(desc(partners.id));
  if (!creatorParticipant) {
    return throwHttpProblem({
      status: 409,
      detail: "PR creator must still be an active participant before ordering",
    });
  }

  const existingAttachment = await attachedOrderRepo.findCurrentNonTerminalByPrAndOffer(
    request.id,
    input.offerId,
  );
  if (existingAttachment) {
    return throwHttpProblem({
      status: 409,
      detail: "An active order already exists for this PR and offer",
    });
  }

  return attachedOrderRepo.create({
    orderId: input.orderId,
    prId: request.id,
    offerId: input.offerId,
  });
}
