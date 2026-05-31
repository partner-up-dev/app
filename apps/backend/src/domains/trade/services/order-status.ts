import type { TradeOrder } from "../model";

function assertInitiatingOrder(order: Pick<TradeOrder, "status">): void {
  if (order.status !== "INITIATING") {
    throw new Error("Order is not initiating");
  }
}

export function markInitiatingOrderOpen(order: TradeOrder): TradeOrder {
  assertInitiatingOrder(order);
  return {
    ...order,
    status: "OPEN",
  };
}

export function markInitiatingOrderFailed(order: TradeOrder): TradeOrder {
  assertInitiatingOrder(order);
  return {
    ...order,
    status: "FAILED",
  };
}
