import { throwHttpProblem } from "../../../lib/problem-details";
import type { RentalFulfillmentId } from "../../../entities/rental-fulfillment";
import { RentalFulfillmentRepository } from "../../../repositories/RentalFulfillmentRepository";

const rentalFulfillmentRepo = new RentalFulfillmentRepository();

export async function requestRentalCancellationHandling(input: {
  fulfillmentId: string;
  cancellationNote?: string | null;
}) {
  const fulfillment = await rentalFulfillmentRepo.findById(
    input.fulfillmentId as RentalFulfillmentId,
  );
  if (!fulfillment) {
    return throwHttpProblem({ status: 404, detail: "Rental fulfillment not found" });
  }
  if (fulfillment.cancellationHandlingStatus === "HANDLED") {
    return throwHttpProblem({
      status: 409,
      detail: "Rental cancellation handling is already resolved",
    });
  }

  return rentalFulfillmentRepo.updateById(fulfillment.id, {
    cancellationHandlingStatus: "REQUESTED",
    cancellationNote: input.cancellationNote ?? null,
  });
}
