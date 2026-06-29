import type { BillId } from "../../../entities/bill";
import type { TradeOrderId } from "../../../entities/trade-order";
import { db } from "../../../lib/db";
import { throwHttpProblem } from "../../../lib/problem-details";
import { BillRepository } from "../../../repositories/BillRepository";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type { RepositoryExecutor } from "../../../repositories/_executor";
import { createBillFromSeed } from "../../bill";
import { materializeChargeLinesFromSplitRule } from "../../bill/services";
import { resolvePricingFromExecutionSnapshot } from "../../trade/services";

export async function applyRideHailingFinalSettlementConsequence(
  input: {
    orderId: TradeOrderId;
  },
  executor: RepositoryExecutor = db,
): Promise<{
  applied: boolean;
  reason: string;
  billId?: BillId | string;
  targetChargeTotalFen?: number;
}> {
  if (executor === db) {
    return db.transaction((tx) => applyRideHailingFinalSettlementConsequence(input, tx));
  }

  const tradeOrderRepo = new TradeOrderRepository(executor);
  const rideOrderRepo = new RideHailingOrderRepository(executor);
  const billRepo = new BillRepository(executor);

  const existingBill = await billRepo.findBySourceOrderId(input.orderId);
  if (existingBill) {
    return {
      applied: false,
      reason: "RideHailing final bill already exists",
      billId: existingBill.id,
    };
  }

  const order = await tradeOrderRepo.findById(input.orderId);
  if (!order || order.family !== "RIDE_HAILING") {
    return throwHttpProblem({
      status: 404,
      detail: "RideHailing order not found for final settlement",
    });
  }

  const rideOrder = await rideOrderRepo.findByOrderId(input.orderId);
  if (!rideOrder) {
    return throwHttpProblem({
      status: 500,
      detail: "RideHailing order facts are missing for final settlement",
    });
  }

  if (!rideOrder.finalSettlementInput) {
    return {
      applied: false,
      reason: "RideHailing final settlement input is missing",
    };
  }

  if (!order.pricingExecutionSnapshot) {
    return throwHttpProblem({
      status: 500,
      detail: "Order pricing execution snapshot is missing for RideHailing final bill",
    });
  }

  const pricingSnapshot = resolvePricingFromExecutionSnapshot({
    snapshot: order.pricingExecutionSnapshot,
    orderContext: {
      serviceTime: rideOrder.departureAt?.toISOString() ?? null,
      quoteTotalFen: rideOrder.finalSettlementInput.amountFen,
    },
  });
  const chargeLines = materializeChargeLinesFromSplitRule({
    totalFen: pricingSnapshot.totalFen,
    splitRule: order.splitRuleSnapshot,
  });
  const created = await createBillFromSeed(
    {
      sourceOrderId: order.id,
      currency: pricingSnapshot.currency,
      chargeLines: chargeLines.map((line) => ({
        userId: line.userId,
        amountFen: line.amountFen,
        label: "曹操出行费用",
        description: "行程结束后按实际费用结算",
      })),
    },
    executor,
  );

  return {
    applied: true,
    reason: "RideHailing final bill created",
    billId: created.billId,
    targetChargeTotalFen: pricingSnapshot.totalFen,
  };
}
