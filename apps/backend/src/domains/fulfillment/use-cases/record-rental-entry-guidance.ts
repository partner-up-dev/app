import { throwHttpProblem } from "../../../lib/problem-details";
import type { RentalFulfillmentId } from "../../../entities/rental-fulfillment";
import { RentalFulfillmentRepository } from "../../../repositories/RentalFulfillmentRepository";

const rentalFulfillmentRepo = new RentalFulfillmentRepository();

export async function recordRentalEntryGuidance(input: {
  fulfillmentId: string;
  entryByPhone?: string | null;
  entryByRealName?: string | null;
  note?: string | null;
}) {
  const fulfillment = await rentalFulfillmentRepo.findById(
    input.fulfillmentId as RentalFulfillmentId,
  );
  if (!fulfillment) {
    return throwHttpProblem({ status: 404, detail: "Rental fulfillment not found" });
  }

  return rentalFulfillmentRepo.updateById(fulfillment.id, {
    entryGuidance: {
      entryByPhone: input.entryByPhone ?? null,
      entryByRealName: input.entryByRealName ?? null,
      note: input.note ?? null,
    },
  });
}
