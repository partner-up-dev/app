import { throwHttpProblem } from "../../../lib/problem-details";
import type { TradeOrderId } from "../../../entities/trade-order";
import { RentalOrderRepository } from "../../../repositories/RentalOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { finalizeRentalOrderTermination } from "../../trade";

const rentalOrderRepo = new RentalOrderRepository();
const tradeOrderRepo = new TradeOrderRepository();

export async function resolveAdminRentalFulfillmentCancellation(input: {
  fulfillmentId: string;
  outcome: "APPROVED" | "DENIED";
  reason?: string | null;
}) {
  const rentalOrder = await rentalOrderRepo.findByOrderId(input.fulfillmentId as TradeOrderId);
  if (!rentalOrder) {
    return throwHttpProblem({ status: 404, detail: "Rental order not found" });
  }
  if (rentalOrder.cancellationHandlingStatus !== "REQUESTED") {
    return throwHttpProblem({
      status: 409,
      detail: "Rental order has no pending cancellation request",
    });
  }

  const order = await tradeOrderRepo.findById(rentalOrder.orderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found for Rental order" });
  }
  const attempt = [...order.terminationAttempts]
    .reverse()
    .find(
      (candidate) =>
        candidate.status === "PENDING" && candidate.resolutionPath === "RENTAL_FULFILLMENT",
    );
  if (!attempt) {
    return throwHttpProblem({
      status: 409,
      detail: "Order has no pending Rental operator termination attempt",
    });
  }

  return finalizeRentalOrderTermination({
    orderId: order.id,
    attemptId: attempt.attemptId,
    decision: {
      outcome: input.outcome,
      reason: input.reason ?? null,
    },
  });
}
