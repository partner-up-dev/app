import { throwHttpProblem } from "../../../lib/problem-details";
import type { RentalFulfillmentId } from "../../../entities/rental-fulfillment";
import { RentalFulfillmentRepository } from "../../../repositories/RentalFulfillmentRepository";
import { deriveRentalLifecycleStatus } from "../model";

const rentalFulfillmentRepo = new RentalFulfillmentRepository();

export async function rejectRentalBooking(input: {
  fulfillmentId: string;
  bookingNote?: string | null;
}) {
  const fulfillment = await rentalFulfillmentRepo.findById(
    input.fulfillmentId as RentalFulfillmentId,
  );
  if (!fulfillment) {
    return throwHttpProblem({ status: 404, detail: "Rental fulfillment not found" });
  }

  return rentalFulfillmentRepo.updateById(fulfillment.id, {
    bookingStatus: "BOOKING_REJECTED",
    lifecycleStatus: deriveRentalLifecycleStatus({
      bookingStatus: "BOOKING_REJECTED",
      cancellationHandling: {
        status: fulfillment.cancellationHandlingStatus,
        supplierOutcome: fulfillment.supplierCancellationOutcome,
      },
      serviceEndedAt: fulfillment.serviceEndedAt?.toISOString() ?? null,
    }),
    bookingNote: input.bookingNote ?? null,
  });
}
