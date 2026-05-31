import { throwHttpProblem } from "../../../lib/problem-details";
import { db } from "../../../lib/db";
import type { TradeOrderId } from "../../../entities/trade-order";
import { RentalFulfillmentRepository } from "../../../repositories/RentalFulfillmentRepository";
import { RentalOrderRepository } from "../../../repositories/RentalOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { reconcileBillToTargetAmount } from "../../bill";
import { createRefundPaymentTxForRefundLine } from "../../payment";
import type { FulfillmentTerminationDecision, OrderTerminationAttempt } from "../model";
import {
  approveTerminationAttempt,
  buildRentalBillTargetAmountSeed,
  denyTerminationAttempt,
  toRentalOrderModel,
} from "../services";

function getTerminationAttempt(
  order: { terminationAttempts: OrderTerminationAttempt[] },
  attemptId: string,
): OrderTerminationAttempt {
  const attempt = order.terminationAttempts.find(
    (candidate) => candidate.attemptId === attemptId,
  );
  if (!attempt) {
    throw new Error("Termination attempt not found");
  }
  return attempt;
}

export async function finalizeRentalOrderTermination(input: {
  orderId: string;
  attemptId: string;
  decision: FulfillmentTerminationDecision;
  decidedAt?: string;
}) {
  const orderRecord = await new TradeOrderRepository().findById(
    input.orderId as TradeOrderId,
  );
  if (!orderRecord) {
    return throwHttpProblem({ status: 404, detail: "Order not found" });
  }

  if (orderRecord.family !== "RENTAL") {
    return throwHttpProblem({ status: 409, detail: "Only Rental orders use this termination flow" });
  }
  const rentalOrderRecord = await new RentalOrderRepository().findByOrderId(
    orderRecord.id,
  );
  if (!rentalOrderRecord) {
    return throwHttpProblem({
      status: 500,
      detail: "Rental order facts are missing",
    });
  }
  const order = toRentalOrderModel(orderRecord, rentalOrderRecord);

  const attempt = getTerminationAttempt(order, input.attemptId);
  const decidedAt = input.decidedAt ?? new Date().toISOString();

  const transactionResult = await db.transaction(async (tx) => {
    const tradeOrderRepo = new TradeOrderRepository(tx);
    const rentalFulfillmentRepo = new RentalFulfillmentRepository(tx);

    if (input.decision.outcome === "DENIED") {
      const denied = denyTerminationAttempt(order, {
        attemptId: input.attemptId,
        decidedAt,
        reason: input.decision.reason ?? "Termination denied",
      });
      const persisted = await tradeOrderRepo.applyTerminationState({
        id: order.id as TradeOrderId,
        status: denied.status,
        terminationAttempts: denied.terminationAttempts,
      });
      if (!persisted) {
        return throwHttpProblem({ status: 500, detail: "Failed to persist denied rental termination" });
      }

      return {
        orderId: persisted.id,
        status: persisted.status,
        effectKind: "NONE" as const,
        effectAmountFen: 0,
        refundLineIds: [] as string[],
      };
    }

    const targetAmountSeed = buildRentalBillTargetAmountSeed({
      order,
      attempt,
    });
    const reconciliation = await reconcileBillToTargetAmount(targetAmountSeed, tx);
    if (reconciliation.direction === "CHARGE") {
      return throwHttpProblem({
        status: 500,
        detail: "Rental termination should not increase the effective bill total",
      });
    }

    const approved = approveTerminationAttempt(order, {
      attemptId: input.attemptId,
      decidedAt,
      reason: input.decision.reason ?? "Rental termination approved",
      effectKind:
        reconciliation.deltaFen > 0 ? "POLICY_REFUND" : "NONE",
      effectAmountFen: reconciliation.deltaFen,
    });
    const persisted = await tradeOrderRepo.applyTerminationState({
      id: order.id as TradeOrderId,
      status: approved.status,
      terminationAttempts: approved.terminationAttempts,
    });
    if (!persisted) {
      return throwHttpProblem({ status: 500, detail: "Failed to persist approved rental termination" });
    }
    const fulfillment = await rentalFulfillmentRepo.findByOrderId(order.id as TradeOrderId);
    if (fulfillment) {
      await rentalFulfillmentRepo.updateById(fulfillment.id, {
        lifecycleStatus: "CANCELLED",
        cancellationHandlingStatus: "HANDLED",
        supplierCancellationOutcome: "BOOKING_CANCELLED",
        cancellationNote: input.decision.reason ?? "Rental termination approved",
      });
    }

    return {
      orderId: persisted.id,
      status: persisted.status,
      effectKind:
        reconciliation.deltaFen > 0 ? ("POLICY_REFUND" as const) : ("NONE" as const),
      effectAmountFen: reconciliation.deltaFen,
      targetChargeTotalFen: targetAmountSeed.targetChargeTotalFen,
      refundLineIds:
        reconciliation.direction === "REFUND" ? reconciliation.createdLineIds : [],
    };
  });

  const refunds = [];
  for (const refundBillLineId of transactionResult.refundLineIds) {
    refunds.push(await createRefundPaymentTxForRefundLine({ refundBillLineId }));
  }

  const { refundLineIds: _refundLineIds, ...result } = transactionResult;
  return {
    ...result,
    refunds,
  };
}
