import type { TradeOrderId } from "../../../entities/trade-order";
import {
  type CommerceOrderDetailDebugContext,
  logCommerceOrderDetailDebug,
} from "../../../lib/commerce-order-detail-debug";
import { throwHttpProblem } from "../../../lib/problem-details";
import { throwRentalRuntimeRetired } from "../../../lib/rental-runtime-retirement";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { cancelRideHailingOrderFromOrderDetail } from "./cancel-ride-hailing-order-from-order-detail";

const tradeOrderRepo = new TradeOrderRepository();

export async function cancelOrderFromOrderDetail(input: {
  orderId: string;
  actorUserId: string;
  debug?: CommerceOrderDetailDebugContext;
}) {
  logCommerceOrderDetailDebug(input.debug, "cancel.dispatch.start", {
    inputOrderId: input.orderId,
    actorUserId: input.actorUserId,
  });

  const order = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!order) {
    logCommerceOrderDetailDebug(input.debug, "cancel.dispatch.order-not-found", {
      inputOrderId: input.orderId,
      actorUserId: input.actorUserId,
    });
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }

  logCommerceOrderDetailDebug(input.debug, "cancel.dispatch.order-loaded", {
    localOrderId: order.id,
    localOrderFamily: order.family,
    localOrderStatus: order.status,
    actorUserId: input.actorUserId,
  });

  if (order.family === "RENTAL") {
    logCommerceOrderDetailDebug(input.debug, "cancel.dispatch.family-rental", {
      localOrderId: order.id,
      localOrderStatus: order.status,
    });
    return throwRentalRuntimeRetired();
  }

  if (order.family === "RIDE_HAILING") {
    logCommerceOrderDetailDebug(input.debug, "cancel.dispatch.family-ride-hailing", {
      localOrderId: order.id,
      localOrderStatus: order.status,
    });
    return cancelRideHailingOrderFromOrderDetail(input);
  }

  logCommerceOrderDetailDebug(input.debug, "cancel.dispatch.unsupported-family", {
    localOrderId: order.id,
    localOrderFamily: order.family,
    localOrderStatus: order.status,
  });
  return throwHttpProblem({
    status: 409,
    detail: "Order does not support cancellation from Order Detail",
  });
}
