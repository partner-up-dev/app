import type { TradeOrder } from "../../../entities/trade-order";

export type OrderPrepaidSettlementFulfillmentConsequence =
  | {
      kind: "CREATE_RENTAL_FULFILLMENT";
    }
  | {
      kind: "NONE";
      reason: string;
    };

export function resolveOrderPrepaidSettlementFulfillmentConsequence(
  family: TradeOrder["family"],
): OrderPrepaidSettlementFulfillmentConsequence {
  if (family === "RENTAL") {
    return {
      kind: "CREATE_RENTAL_FULFILLMENT",
    };
  }

  return {
    kind: "NONE",
    reason: "Order family has no prepaid settlement consequence",
  };
}
