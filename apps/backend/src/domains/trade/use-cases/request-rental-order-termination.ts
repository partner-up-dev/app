import { throwHttpProblem } from "../../../lib/problem-details";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import {
  appendTerminationAttempt,
  markTerminationAttemptResolving,
  toTradeOrderModel,
} from "../services";

const tradeOrderRepo = new TradeOrderRepository();

function createAttemptId(): string {
  return `term_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function requestRentalOrderTermination(input: {
  orderId: string;
  requestedBy: string;
  requestedAt?: string;
}) {
  const orderRecord = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!orderRecord) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  const order = toTradeOrderModel(orderRecord);

  if (order.family !== "RENTAL") {
    return throwHttpProblem({ status: 409, detail: "Only Rental orders use this termination flow" });
  }

  const requestedAt = input.requestedAt ?? new Date().toISOString();
  const attemptId = createAttemptId();
  const appended = appendTerminationAttempt(order, {
    attemptId,
    requestedAt,
    requestedBy: input.requestedBy as UserId,
  });
  const resolving = markTerminationAttemptResolving(
    appended,
    attemptId,
    "RENTAL_FULFILLMENT",
  );

  const persisted = await tradeOrderRepo.applyTerminationState({
    id: order.id as TradeOrderId,
    status: resolving.status,
    terminationAttempts: resolving.terminationAttempts,
  });

  if (!persisted) {
    return throwHttpProblem({ status: 500, detail: "Failed to persist rental termination request" });
  }

  return {
    orderId: persisted.id,
    attemptId,
  };
}
