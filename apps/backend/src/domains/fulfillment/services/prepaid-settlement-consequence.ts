import type { TradeOrder } from "../../../entities/trade-order";

export type OrderPrepaidSettlementFulfillmentConsequence =
  | {
      kind: "ACTIVATE_RENTAL_BOOKING";
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
      kind: "ACTIVATE_RENTAL_BOOKING",
    };
  }

  return {
    kind: "NONE",
    reason: "Order family has no prepaid settlement consequence",
  };
}
