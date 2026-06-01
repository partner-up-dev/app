import { throwHttpProblem } from "../../../lib/problem-details";
import type { TradeOrderId } from "../../../entities/trade-order";
import { RentalOrderRepository } from "../../../repositories/RentalOrderRepository";

const rentalOrderRepo = new RentalOrderRepository();

export async function requestRentalCancellationHandling(input: {
  fulfillmentId: string;
  cancellationNote?: string | null;
}) {
  const rentalOrder = await rentalOrderRepo.findByOrderId(
    input.fulfillmentId as TradeOrderId,
  );
  if (!rentalOrder) {
    return throwHttpProblem({ status: 404, detail: "Rental order not found" });
  }
  if (rentalOrder.cancellationHandlingStatus === "HANDLED") {
    return throwHttpProblem({
      status: 409,
      detail: "Rental cancellation handling is already resolved",
    });
  }

  return rentalOrderRepo.updateByOrderId(rentalOrder.orderId, {
    cancellationHandlingStatus: "REQUESTED",
    cancellationNote: input.cancellationNote ?? null,
  });
}
