import { throwHttpProblem } from "../../../lib/problem-details";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type { OrderTerminationResolutionPath } from "../model";
import {
  appendTerminationAttempt,
  markTerminationAttemptResolving,
  toTradeOrderModel,
} from "../services";

const tradeOrderRepo = new TradeOrderRepository();

function createAttemptId(): string {
  return `term_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function requestOrderTermination(input: {
  orderId: string;
  requestedBy: string;
  requestedAt?: string;
  resolutionPath?: OrderTerminationResolutionPath;
}) {
  const orderRecord = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  if (!orderRecord) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }
  const order = toTradeOrderModel(orderRecord);

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
    input.resolutionPath ?? "TRADE_LOCAL",
  );

  const persisted = await tradeOrderRepo.applyTerminationState({
    id: order.id as TradeOrderId,
    status: resolving.status,
    terminationAttempts: resolving.terminationAttempts,
  });

  if (!persisted) {
    return throwHttpProblem({ status: 500, detail: "Failed to persist order termination request" });
  }

  return {
    orderId: persisted.id,
    attemptId,
  };
}
