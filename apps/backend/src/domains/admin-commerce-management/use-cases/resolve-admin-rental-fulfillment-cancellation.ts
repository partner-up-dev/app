import { throwHttpProblem } from "../../../lib/problem-details";
import type { RentalFulfillmentId } from "../../../entities/rental-fulfillment";
import { RentalFulfillmentRepository } from "../../../repositories/RentalFulfillmentRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { finalizeRentalOrderTermination } from "../../trade";

const rentalFulfillmentRepo = new RentalFulfillmentRepository();
const tradeOrderRepo = new TradeOrderRepository();

export async function resolveAdminRentalFulfillmentCancellation(input: {
  fulfillmentId: string;
  outcome: "APPROVED" | "DENIED";
  reason?: string | null;
}) {
  const fulfillment = await rentalFulfillmentRepo.findById(
    input.fulfillmentId as RentalFulfillmentId,
  );
  if (!fulfillment) {
    return throwHttpProblem({ status: 404, detail: "Rental fulfillment not found" });
  }
  if (fulfillment.cancellationHandlingStatus !== "REQUESTED") {
    return throwHttpProblem({
      status: 409,
      detail: "Rental fulfillment has no pending cancellation request",
    });
  }

  const order = await tradeOrderRepo.findById(fulfillment.orderId);
  if (!order) {
    return throwHttpProblem({ status: 404, detail: "Order not found for fulfillment" });
  }
  const attempt = [...order.terminationAttempts]
    .reverse()
    .find(
      (candidate) =>
        candidate.status === "PENDING" &&
        candidate.resolutionPath === "RENTAL_FULFILLMENT",
    );
  if (!attempt) {
    return throwHttpProblem({
      status: 409,
      detail: "Order has no pending Rental fulfillment termination attempt",
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
