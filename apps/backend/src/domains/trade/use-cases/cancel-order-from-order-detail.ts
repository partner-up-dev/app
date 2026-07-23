import type { TradeOrderId } from "../../../entities/trade-order";
import { throwHttpProblem } from "../../../lib/problem-details";
import { throwRentalRuntimeRetired } from "../../../lib/rental-runtime-retirement";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { cancelRideHailingOrderFromOrderDetail } from "./cancel-ride-hailing-order-from-order-detail";

const tradeOrderRepo = new TradeOrderRepository();

export async function cancelOrderFromOrderDetail(input: { orderId: string; actorUserId: string }) {
  const order = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }

  if (order.family === "RENTAL") {
    return throwRentalRuntimeRetired();
  }

  if (order.family === "RIDE_HAILING") {
    return cancelRideHailingOrderFromOrderDetail(input);
  }

  return throwHttpProblem({
    status: 409,
    detail: "Order does not support cancellation from Order Detail",
  });
}
