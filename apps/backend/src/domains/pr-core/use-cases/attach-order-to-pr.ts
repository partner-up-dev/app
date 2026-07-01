import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import type { OfferId } from "../../../entities/offer";
import type { PRId } from "../../../entities/partner-request";
import { partnerRequests } from "../../../entities/partner-request";
import { partners } from "../../../entities/partner";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type { RepositoryExecutor } from "../../../repositories/_executor";
import { isOrderAttachableStatus } from "../services/status-rules";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export async function attachOrderToPr(
  input: {
    prId: PRId;
    offerId: OfferId;
    orderId: TradeOrderId;
    orderCreatedBy: UserId;
  },
  executor: RepositoryExecutor = db,
) {
  const tradeOrderRepo = new TradeOrderRepository(executor);

  const [request] = await executor
    .select()
    .from(partnerRequests)
    .where(eq(partnerRequests.id, input.prId));
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  if (!isOrderAttachableStatus(request.status)) {
    return throwHttpProblem({
      status: 409,
      detail: "Order attachment requires PR READY or ACTIVE status",
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

  const existingOrders = await tradeOrderRepo.listByIdsOfferAndStatuses({
    ids: request.orders,
    offerId: input.offerId,
    statuses: ["INITIATING", "OPEN"],
  });
  if (existingOrders.length > 0) {
    return throwHttpProblem({
      status: 409,
      detail: "An active order already exists for this PR and offer",
    });
  }

  const [updated] = await executor
    .update(partnerRequests)
    .set({
      orders: sql`${partnerRequests.orders} || ARRAY[${input.orderId}::uuid]`,
    })
    .where(eq(partnerRequests.id, request.id))
    .returning();

  return updated;
}
