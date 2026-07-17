import { throwHttpProblem } from "../../../lib/problem-details";
import type { TradeOrderId } from "../../../entities/trade-order";
import { RentalOrderRepository } from "../../../repositories/RentalOrderRepository";

const rentalOrderRepo = new RentalOrderRepository();

export async function recordRentalEntryGuidance(input: {
  fulfillmentId: string;
  entryByPhone?: string | null;
  entryByRealName?: string | null;
  note?: string | null;
}) {
  const rentalOrder = await rentalOrderRepo.findByOrderId(input.fulfillmentId as TradeOrderId);
  if (!rentalOrder) {
    return throwHttpProblem({ status: 404, detail: "Rental order not found" });
  }

  return rentalOrderRepo.updateByOrderId(rentalOrder.orderId, {
    entryGuidance: {
      entryByPhone: input.entryByPhone ?? null,
      entryByRealName: input.entryByRealName ?? null,
      note: input.note ?? null,
    },
  });
}
