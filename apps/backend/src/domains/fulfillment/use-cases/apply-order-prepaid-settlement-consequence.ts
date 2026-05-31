import type { TradeOrder } from "../../../entities/trade-order";
import { resolveOrderPrepaidSettlementFulfillmentConsequence } from "../services/prepaid-settlement-consequence";
import { createRentalFulfillment } from "./create-rental-fulfillment";

export type OrderPrepaidSettlementFulfillmentResult = {
  applied: boolean;
  reason: string;
  fulfillmentId?: string;
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

  const fulfillment = await createRentalFulfillment(input.orderId);
  return {
    applied: true,
    reason: "Order started Rental fulfillment after prepaid bill settlement",
    fulfillmentId: fulfillment.id,
  };
}
