import type { TradeOrder } from "../../../entities/trade-order";
import type { TradeOrderId } from "../../../entities/trade-order";
import { throwHttpProblem } from "../../../lib/problem-details";
import { RentalOrderRepository } from "../../../repositories/RentalOrderRepository";
import { resolveOrderPrepaidSettlementFulfillmentConsequence } from "../services/prepaid-settlement-consequence";

export type OrderPrepaidSettlementFulfillmentResult = {
  applied: boolean;
  reason: string;
  rentalOrderId?: string;
};

export async function applyOrderPrepaidSettlementFulfillmentConsequence(input: {
  orderId: string;
  family: TradeOrder["family"];
}): Promise<OrderPrepaidSettlementFulfillmentResult> {
  const consequence = resolveOrderPrepaidSettlementFulfillmentConsequence(
    input.family,
  );

  if (consequence.kind === "NONE") {
    return {
      applied: false,
      reason: consequence.reason,
    };
  }

  const rentalOrder = await new RentalOrderRepository().findByOrderId(
    input.orderId as TradeOrderId,
  );
  if (!rentalOrder) {
    return throwHttpProblem({ status: 404, detail: "Rental order not found" });
  }

  return {
    applied: true,
    reason: "Order activated Rental booking state after prepaid bill settlement",
    rentalOrderId: rentalOrder.orderId,
  };
}
