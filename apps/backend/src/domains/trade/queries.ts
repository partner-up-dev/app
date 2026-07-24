import type { TradeOrderId } from "../../entities/trade-order";
import type { OfferId } from "../../entities/offer";
import { throwHttpProblem } from "../../lib/problem-details";
import { TradeOrderRepository } from "../../repositories/TradeOrderRepository";
import type {
  AttachedTradeOrderSummary,
  AttachedTradeOrderSummaryQuery,
  TradeOrderBillingContext,
} from "./contracts";

export { getCommerceOrderDetail } from "./use-cases/rental-ordering-flow";
export { listOfferListing } from "./use-cases/offer-listing";
export { queryRideHailingCancellationFeeFromOrderDetail } from "./use-cases/cancel-ride-hailing-order-from-order-detail";

const tradeOrderRepo = new TradeOrderRepository();

const canViewOrder = (input: {
  createdBy: string;
  participants: Array<{ userId: string }>;
  viewerUserId: string;
}): boolean =>
  input.createdBy === input.viewerUserId ||
  input.participants.some((participant) => participant.userId === input.viewerUserId);

/**
 * Canonical Trade access boundary for a command that operates on an existing
 * Order but is owned by another domain. It deliberately proves only viewer
 * access; the consuming owner still decides its own family-specific action.
 */
export async function assertTradeOrderViewerAccess(input: {
  orderId: string;
  viewerUserId: string;
}): Promise<void> {
  const order = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }

  if (!canViewOrder({ ...order, viewerUserId: input.viewerUserId })) {
    return throwHttpProblem({ status: 403, detail: "Order is not accessible" });
  }
}

/**
 * Canonical Trade projection used by Bill when it evaluates checkout access
 * and the order-owned payment window. Callers receive no Trade persistence
 * row and cannot reproduce Trade visibility policy locally.
 */
export async function getTradeOrderBillingContext(input: {
  orderId: string;
  viewerUserId: string;
}): Promise<TradeOrderBillingContext> {
  const order = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found for BillLine" });
  }

  if (!canViewOrder({ ...order, viewerUserId: input.viewerUserId })) {
    return throwHttpProblem({ status: 403, detail: "Payment checkout is not accessible" });
  }

  return {
    id: order.id,
    family: order.family,
    status: order.status,
    unpaidExpiresAt: order.timeout.unpaidExpiresAt,
  };
}

/**
 * Trade owns filtering and ordering for the legacy PR attachment listing.
 * Callers receive only the three stable fields exposed by that route.
 */
export const listAttachedTradeOrderSummaries = async (
  input: AttachedTradeOrderSummaryQuery,
): Promise<AttachedTradeOrderSummary[]> => {
  const orders = await tradeOrderRepo.listByIdsOfferAndStatuses({
    ids: input.orderIds.map((id) => id as TradeOrderId),
    offerId: input.offerId as OfferId,
    statuses: input.statuses,
  });

  return orders.map((order) => ({
    id: order.id,
    status: order.status,
    offerId: order.offerId,
  }));
};
