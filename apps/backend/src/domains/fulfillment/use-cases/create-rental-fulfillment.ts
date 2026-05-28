import { throwHttpProblem } from "../../../lib/problem-details";
import type { TradeOrderId } from "../../../entities/trade-order";
import { RentalFulfillmentRepository } from "../../../repositories/RentalFulfillmentRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";

const tradeOrderRepo = new TradeOrderRepository();
const rentalFulfillmentRepo = new RentalFulfillmentRepository();

export async function createRentalFulfillment(orderId: string) {
  const order = await tradeOrderRepo.findById(orderId as TradeOrderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }

  if (order.family !== "RENTAL") {
    return throwHttpProblem({ status: 409, detail: "Only Rental orders create Rental fulfillment" });
  }

  const existing = await rentalFulfillmentRepo.findByOrderId(order.id);
  if (existing) {
    return existing;
  }

  return rentalFulfillmentRepo.create({
    orderId: order.id,
  });
}
